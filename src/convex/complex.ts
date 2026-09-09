/**
 * Complex — buildings, units, owners/tenants, and user role management.
 * Creating a unit automatically creates its main FinancialAccount (FA-xxxxxx).
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { normalizeRole, ROLES } from "../lib/roles";
import { recordAudit, ACTIONS } from "./audit";
import { createUnitFinancialAccount } from "./accounting/accounts";
import {
  financialError,
  requireRole,
  requireUser,
  requireUserAdmin,
  userOwnsUnit,
} from "./lib/security";

/* ---------- onboarding: assign a role on first login ---------- */

export const ensureRole = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { role: null };
    const user = await ctx.db.get(userId);
    if (!user) return { role: null };
    const current = normalizeRole(user.role ?? undefined);
    // Normalize legacy roles immediately.
    if (user.role !== undefined && normalizeRole(user.role) !== user.role) {
      await ctx.db.patch(user._id, { role: current });
      return { role: current };
    }
    if (user.role === undefined || user.role === null) {
      const admins = await ctx.db.query("users").collect();
      const hasAdmin = admins.some(
        (u) => normalizeRole(u.role ?? undefined) === ROLES.SUPER_ADMIN,
      );
      const role = hasAdmin ? ROLES.OWNER : ROLES.SUPER_ADMIN;
      await ctx.db.patch(user._id, { role });
      return { role };
    }
    return { role: current };
  },
});

/* ---------- user & role management ---------- */

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const authed = await requireUser(ctx);
    if (authed.role !== ROLES.SUPER_ADMIN) {
      throw financialError("UNAUTHORIZED_ACCOUNTING_ACTION", "فقط مدیر ارشد می‌تواند کاربران را مدیریت کند.");
    }
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => !u.isAnonymous)
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "—",
        email: u.email ?? "—",
        phone: u.phone,
        role: normalizeRole(u.role ?? undefined),
        emailVerificationTime: u.emailVerificationTime,
      }));
  },
});

export const setUserRole = mutation({
  args: { userId: v.id("users"), role: v.union(v.literal("super_admin"), v.literal("board_member"), v.literal("accountant"), v.literal("owner"), v.literal("tenant"), v.literal("guard")) },
  handler: async (ctx, args) => {
    const { userId } = await requireUserAdmin(ctx);
    if (userId === args.userId) {
      throw financialError("INVALID_ROLE_CHANGE", "نمی‌توانید نقش خودتان را تغییر دهید.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw financialError("NOT_FOUND", "کاربر یافت نشد.");
    await ctx.db.patch(target._id, { role: args.role });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.ROLE_CHANGE,
      entity: "users",
      entityId: target._id,
      before: { role: target.role },
      after: { role: args.role },
    });
  },
});

/* ---------- buildings ---------- */

export const listBuildings = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db.query("buildings").collect();
  },
});

export const createBuilding = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    floors: v.number(),
    phone: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT]);
    const id = await ctx.db.insert("buildings", {
      name: args.name.trim(),
      address: args.address,
      floors: args.floors,
      phone: args.phone,
      description: args.description,
      isActive: true,
    });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "buildings",
      entityId: id,
      after: { name: args.name.trim() },
    });
    return id;
  },
});

/* ---------- units ---------- */

export const listUnits = query({
  args: {},
  handler: async (ctx) => {
    const authed = await requireUser(ctx);
    let units = await ctx.db.query("units").collect();
    const staff =
      authed.role === ROLES.SUPER_ADMIN || authed.role === ROLES.ACCOUNTANT || authed.role === ROLES.BOARD_MEMBER;
    if (!staff) {
      units = units.filter((u) => userOwnsUnit(authed.user, u));
    }
    const out: Array<Doc<"units"> & { account?: Doc<"financialAccounts">; building?: Doc<"buildings"> }> = [];
    for (const u of units) {
      const account = await ctx.db.get(u.financialAccountId);
      const building = await ctx.db.get(u.buildingId);
      out.push({ ...u, account: account ?? undefined, building: building ?? undefined });
    }
    return out.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
  },
});

export const getUnit = query({
  args: { unitId: v.id("units") },
  handler: async (ctx, args) => {
    const authed = await requireUser(ctx);
    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw financialError("NOT_FOUND", "واحد یافت نشد.");
    const staff =
      authed.role === ROLES.SUPER_ADMIN || authed.role === ROLES.ACCOUNTANT || authed.role === ROLES.BOARD_MEMBER;
    if (!staff && !userOwnsUnit(authed.user, unit)) {
      throw financialError("UNAUTHORIZED_ACCOUNTING_ACTION", "شما به این واحد دسترسی ندارید.");
    }
    const account = await ctx.db.get(unit.financialAccountId);
    const building = await ctx.db.get(unit.buildingId);
    const owner = unit.ownerUserId ? await ctx.db.get(unit.ownerUserId) : undefined;
    const tenant = unit.tenantUserId ? await ctx.db.get(unit.tenantUserId) : undefined;
    return {
      unit,
      account: account ?? undefined,
      building: building ?? undefined,
      ownerUser: owner ? { _id: owner._id, name: owner.name, email: owner.email } : undefined,
      tenantUser: tenant ? { _id: tenant._id, name: tenant.name, email: tenant.email } : undefined,
    };
  },
});

export const createUnit = mutation({
  args: {
    buildingId: v.id("buildings"),
    unitNumber: v.string(),
    floor: v.number(),
    areaM2: v.number(),
    usage: v.union(v.literal("تجاری"), v.literal("اداری"), v.literal("مسکونی"), v.literal("پارکینگ"), v.literal("انباری")),
    ownerName: v.optional(v.string()),
    ownerPhone: v.optional(v.string()),
    tenantName: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    ownerUserId: v.optional(v.id("users")),
    tenantUserId: v.optional(v.id("users")),
    parkingSlots: v.optional(v.number()),
    storageSlots: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT]);
    const building = await ctx.db.get(args.buildingId);
    if (!building) throw financialError("NOT_FOUND", "ساختمان یافت نشد.");
    const number = args.unitNumber.trim();
    const existing = (await ctx.db.query("units").collect()).find(
      (u) => u.buildingId === building._id && u.unitNumber === number,
    );
    if (existing) {
      throw financialError("DUPLICATE", `واحد ${number} در این ساختمان قبلاً ثبت شده است.`);
    }
    const financialAccountId = await createUnitFinancialAccount(ctx, {
      unitNumber: number,
      ownerUserId: args.ownerUserId,
    });
    const unitId = await ctx.db.insert("units", {
      buildingId: building._id,
      unitNumber: number,
      floor: args.floor,
      areaM2: args.areaM2,
      usage: args.usage,
      ownerUserId: args.ownerUserId,
      ownerName: args.ownerName,
      ownerPhone: args.ownerPhone,
      tenantUserId: args.tenantUserId,
      tenantName: args.tenantName,
      tenantPhone: args.tenantPhone,
      parkingSlots: args.parkingSlots ?? 0,
      storageSlots: args.storageSlots ?? 0,
      isActive: true,
      notes: args.notes,
      financialAccountId,
    });
    await ctx.db.patch(financialAccountId, { unitId });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "units",
      entityId: unitId,
      after: { unitNumber: number, buildingId: building._id, financialAccountId },
    });
    return unitId;
  },
});

export const updateUnit = mutation({
  args: {
    unitId: v.id("units"),
    unitNumber: v.optional(v.string()),
    floor: v.optional(v.number()),
    areaM2: v.optional(v.number()),
    usage: v.optional(
      v.union(v.literal("تجاری"), v.literal("اداری"), v.literal("مسکونی"), v.literal("پارکینگ"), v.literal("انباری")),
    ),
    ownerName: v.optional(v.string()),
    ownerPhone: v.optional(v.string()),
    tenantName: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    ownerUserId: v.optional(v.id("users")),
    tenantUserId: v.optional(v.id("users")),
    parkingSlots: v.optional(v.number()),
    storageSlots: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT]);
    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw financialError("NOT_FOUND", "واحد یافت نشد.");
    const patch: Record<string, unknown> = {};
    if (args.unitNumber !== undefined) {
      const number = args.unitNumber.trim();
      const dup = (await ctx.db.query("units").collect()).find(
        (u) => u._id !== unit._id && u.buildingId === unit.buildingId && u.unitNumber === number,
      );
      if (dup) throw financialError("DUPLICATE", `واحد ${number} در این ساختمان قبلاً ثبت شده است.`);
      patch.unitNumber = number;
    }
    if (args.floor !== undefined) patch.floor = args.floor;
    if (args.areaM2 !== undefined) patch.areaM2 = args.areaM2;
    if (args.usage !== undefined) patch.usage = args.usage;
    if (args.ownerName !== undefined) patch.ownerName = args.ownerName || undefined;
    if (args.ownerPhone !== undefined) patch.ownerPhone = args.ownerPhone || undefined;
    if (args.tenantName !== undefined) patch.tenantName = args.tenantName || undefined;
    if (args.tenantPhone !== undefined) patch.tenantPhone = args.tenantPhone || undefined;
    if (args.ownerUserId !== undefined) patch.ownerUserId = args.ownerUserId;
    if (args.tenantUserId !== undefined) patch.tenantUserId = args.tenantUserId;
    if (args.parkingSlots !== undefined) patch.parkingSlots = args.parkingSlots;
    if (args.storageSlots !== undefined) patch.storageSlots = args.storageSlots;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.notes !== undefined) patch.notes = args.notes || undefined;
    await ctx.db.patch(unit._id, patch);
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.UPDATE,
      entity: "units",
      entityId: unit._id,
      before: {
        unitNumber: unit.unitNumber,
        floor: unit.floor,
        areaM2: unit.areaM2,
        usage: unit.usage,
        ownerName: unit.ownerName,
        ownerPhone: unit.ownerPhone,
        tenantName: unit.tenantName,
        tenantPhone: unit.tenantPhone,
      },
      after: patch,
    });
  },
});

export const updateBuilding = mutation({
  args: {
    buildingId: v.id("buildings"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    floors: v.optional(v.number()),
    phone: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT]);
    const building = await ctx.db.get(args.buildingId);
    if (!building) throw financialError("NOT_FOUND", "ساختمان یافت نشد.");
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.address !== undefined) patch.address = args.address || undefined;
    if (args.floors !== undefined) patch.floors = args.floors;
    if (args.phone !== undefined) patch.phone = args.phone || undefined;
    if (args.description !== undefined) patch.description = args.description || undefined;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(building._id, patch);
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.UPDATE,
      entity: "buildings",
      entityId: building._id,
      before: { name: building.name },
      after: patch,
    });
  },
});