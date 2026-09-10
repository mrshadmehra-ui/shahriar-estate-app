/**
 * Backup & Restore — full JSON snapshot (super_admin only).
 *
 * Export (`exportBackup`): complete snapshot of the complex: buildings, units,
 * all accounting tables, journal, audit log, counters and sanitized users.
 *
 * Restore: the client uploads the backup file to Convex storage, then the
 * `restoreBackup` action reads it, wipes the current complex/accounting data
 * (users & auth stay untouched) and re-inserts everything with fresh IDs while
 * remapping every reference. The id-map is staged in `settings` between the
 * per-table internal mutations (actions cannot write the db directly).
 */
import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ROLES } from "../lib/roles";
import { financialError, requireRole } from "./lib/security";

/** Tables managed by the backup (users/auth/properties are never touched). */
const BACKUP_TABLES = [
  "buildings",
  "units",
  "financialAccounts",
  "chartOfAccounts",
  "fiscalPeriods",
  "chargeRules",
  "charges",
  "invoices",
  "invoiceItems",
  "payments",
  "paymentAllocations",
  "expenses",
  "cashAccounts",
  "bankAccounts",
  "funds",
  "transfers",
  "refunds",
  "journal",
  "journalEntries",
  "auditLog",
  "notifications",
  "counters",
  "settings",
] as const;

const RESTORE_MAP_KEY = "restore_map_v1";
const DEMO_FLAG_KEY = "demoDataEnabled";

/**
 * Tables removed by the wipe — everything except users/auth (so everyone can
 * still log in afterwards) and the settings table (holds the demo flag).
 * Consultations/properties are the legacy test data of the previous template.
 */
const WIPE_TABLES = [
  "journalEntries",
  "journal",
  "paymentAllocations",
  "invoiceItems",
  "payments",
  "invoices",
  "charges",
  "chargeRules",
  "expenses",
  "transfers",
  "refunds",
  "cashAccounts",
  "bankAccounts",
  "funds",
  "financialAccounts",
  "units",
  "buildings",
  "fiscalPeriods",
  "chartOfAccounts",
  "counters",
  "notifications",
  "auditLog",
  "consultations",
  "properties",
] as const;

/** Auth check usable from actions (actions have no direct db access). */
export const requireSuperAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    return true;
  },
});

/* ------------------------------ Export ------------------------------ */

export const exportBackup = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);

    const data: Record<string, unknown> = {};
    for (const table of BACKUP_TABLES) {
      data[table] = await ctx.db.query(table).collect();
    }

    // Users: sanitized profile only — never auth secrets.
    const users = await ctx.db.query("users").collect();
    data.users = users
      .filter((u) => !u.isAnonymous)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        emailVerificationTime: u.emailVerificationTime,
      }));

    return {
      app: "مجتمع تجاری اداری شهریار",
      version: 1,
      exportedAt: Date.now(),
      data,
    };
  },
});

/* ------------------------------ Wipe all data ------------------------------ */

/**
 * Delete ALL data (accounting + complex + legacy test data) so the program can
 * start clean for real use. Only super_admin and owner roles. Users/auth stay
 * untouched; base config (COA, fiscal period, treasury, charge rules) re-seeds
 * automatically on the next dashboard visit, but demo units never come back
 * (demoDataEnabled flag). The wipe itself is recorded in the audit log.
 */
export const wipeAllData = mutation({
  args: { reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.OWNER]);
    const reason = args.reason.trim();
    if (!reason || reason.length < 3) {
      throw financialError("INVALID_REASON", "علت پاک‌کردن داده‌ها را وارد کنید (حداقل ۳ کاراکتر).");
    }

    const deleted: Record<string, number> = {};
    for (const table of WIPE_TABLES) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) await ctx.db.delete(doc._id);
      deleted[table] = docs.length;
    }

    // remove any staged restore map and disable future demo seeding
    const restoreMap = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", RESTORE_MAP_KEY))
      .first();
    if (restoreMap) await ctx.db.delete(restoreMap._id);
    const demoSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", DEMO_FLAG_KEY))
      .first();
    if (demoSetting) {
      await ctx.db.patch(demoSetting._id, { value: false });
    } else {
      await ctx.db.insert("settings", { key: DEMO_FLAG_KEY, value: false });
    }

    // audit AFTER wiping so the entry survives
    await ctx.db.insert("auditLog", {
      userId,
      action: "WIPE_ALL_DATA",
      entity: "system",
      entityId: "all",
      after: { deleted, at: Date.now() },
      reason,
    });

    return {
      deleted,
      total: Object.values(deleted).reduce((s, n) => s + n, 0),
    };
  },
});

/* ------------------------------ Restore ------------------------------ */

/** Step 1: get an upload URL for the backup file (client PUTs it). */
export const generateRestoreUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runQuery(internal.backup.requireSuperAdmin, {});
    return await ctx.storage.generateUploadUrl();
  },
});

/** Wipe all backup-managed tables (called first by the restore action). */
export const wipeForRestore = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of BACKUP_TABLES) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) await ctx.db.delete(doc._id);
    }
  },
});

/** Insert one table's rows, remapping every id through the staged restore map. */
export const restoreTable = internalMutation({
  args: {
    table: v.union(
      ...BACKUP_TABLES.map((t) => v.literal(t)),
    ),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", RESTORE_MAP_KEY))
      .first();
    const stored = (setting?.value as Record<string, string> | undefined) ?? {};
    const idMap = new Map<string, string>(Object.entries(stored));

    /** Convex ids embed their table name as prefix — remap any id-like value. */
    const remapId = (value: unknown): unknown => {
      if (typeof value !== "string") return value;
      const idx = value.indexOf("_");
      if (idx <= 0) return value;
      const table = value.slice(0, idx);
      return idMap.get(`${table}:${value}`) ?? value;
    };

    let count = 0;
    for (const row of args.rows as Array<Record<string, unknown>>) {
      const clean: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        if (key === "_id" || key === "_creationTime") continue;
        clean[key] = remapId(val);
      }
      const newId = await ctx.db.insert(args.table, clean as never);
      idMap.set(`${args.table}:${row._id}`, newId);
      count += 1;
    }

    const next = Object.fromEntries(idMap);
    if (setting) {
      await ctx.db.patch(setting._id, { value: next });
    } else {
      await ctx.db.insert("settings", { key: RESTORE_MAP_KEY, value: next });
    }
    return count;
  },
});

/** units <-> financialAccounts are mutually referential: fix FA.unitId now. */
export const patchUnitRefs = internalMutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", RESTORE_MAP_KEY))
      .first();
    const idMap = new Map<string, string>(
      Object.entries((setting?.value as Record<string, string> | undefined) ?? {}),
    );
    for (const fa of args.rows as Array<Record<string, unknown>>) {
      const newFaId = idMap.get(`financialAccounts:${fa._id}`);
      if (newFaId && typeof fa.unitId === "string") {
        const unitId = idMap.get(`units:${fa.unitId}`);
        if (unitId) {
          await ctx.db.patch(newFaId as Id<"financialAccounts">, {
            unitId: unitId as Id<"units">,
          });
        }
      }
    }
  },
});

/** Finalize: audit marker + remove the staged restore map. */
export const finalizeRestore = internalMutation({
  args: {
    storageId: v.id("_storage"),
    exportedAt: v.optional(v.number()),
    counts: v.any(),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", RESTORE_MAP_KEY))
      .first();
    if (setting) await ctx.db.delete(setting._id);
    await ctx.db.insert("auditLog", {
      userId,
      action: "RESTORE",
      entity: "backup",
      entityId: args.storageId,
      after: { exportedAt: args.exportedAt, total: args.total, counts: args.counts },
      reason: "بازیابی کامل از فایل پشتیبان",
    });
  },
});

/** Step 2: read the uploaded file, wipe current data, re-insert everything. */
export const restoreBackup = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.backup.requireSuperAdmin, {});

    const file = await ctx.storage.get(args.storageId);
    if (!file) throw financialError("NOT_FOUND", "فایل پشتیبان در حافظه یافت نشد.");
    const raw = await file.text();

    let backup: Record<string, unknown>;
    try {
      backup = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw financialError("INVALID_BACKUP", "فایل پشتیبان معتبر نیست (JSON خراب است).");
    }
    if (!backup || typeof backup !== "object" || !backup.data || typeof backup.data !== "object") {
      throw financialError("INVALID_BACKUP", "ساختار فایل پشتیبان معتبر نیست.");
    }
    const data = backup.data as Record<string, unknown>;
    for (const table of BACKUP_TABLES) {
      if (!Array.isArray(data[table])) {
        throw financialError("INVALID_BACKUP", `بخش «${table}» در فایل پشتیبان ناقص است.`);
      }
    }
    const exportedAt = typeof backup.exportedAt === "number" ? backup.exportedAt : undefined;

    // 1) wipe
    await ctx.runMutation(internal.backup.wipeForRestore, {});

    type TableBatch = { table: (typeof BACKUP_TABLES)[number]; rows: Array<Record<string, unknown>> };

    // 2) insert in dependency order (id map staged in settings between calls)
    const order: Array<TableBatch> = [
      { table: "buildings", rows: data.buildings as Array<Record<string, unknown>> },
      { table: "funds", rows: data.funds as Array<Record<string, unknown>> },
      { table: "cashAccounts", rows: data.cashAccounts as Array<Record<string, unknown>> },
      { table: "bankAccounts", rows: data.bankAccounts as Array<Record<string, unknown>> },
      { table: "chartOfAccounts", rows: data.chartOfAccounts as Array<Record<string, unknown>> },
      { table: "fiscalPeriods", rows: data.fiscalPeriods as Array<Record<string, unknown>> },
      { table: "chargeRules", rows: data.chargeRules as Array<Record<string, unknown>> },
      { table: "financialAccounts", rows: data.financialAccounts as Array<Record<string, unknown>> },
      { table: "units", rows: data.units as Array<Record<string, unknown>> },
    ];
    const counts: Record<string, number> = {};
    for (const { table, rows } of order) {
      counts[table] = await ctx.runMutation(internal.backup.restoreTable, { table, rows });
    }
    // fix the circular unit <-> financialAccount reference
    await ctx.runMutation(internal.backup.patchUnitRefs, {
      rows: data.financialAccounts as Array<Record<string, unknown>>,
    });
    const tail: Array<TableBatch> = [
      { table: "charges", rows: data.charges as Array<Record<string, unknown>> },
      { table: "invoices", rows: data.invoices as Array<Record<string, unknown>> },
      { table: "invoiceItems", rows: data.invoiceItems as Array<Record<string, unknown>> },
      { table: "payments", rows: data.payments as Array<Record<string, unknown>> },
      { table: "paymentAllocations", rows: data.paymentAllocations as Array<Record<string, unknown>> },
      { table: "expenses", rows: data.expenses as Array<Record<string, unknown>> },
      { table: "transfers", rows: data.transfers as Array<Record<string, unknown>> },
      { table: "refunds", rows: data.refunds as Array<Record<string, unknown>> },
      { table: "journal", rows: data.journal as Array<Record<string, unknown>> },
      { table: "journalEntries", rows: data.journalEntries as Array<Record<string, unknown>> },
      { table: "auditLog", rows: data.auditLog as Array<Record<string, unknown>> },
      { table: "notifications", rows: data.notifications as Array<Record<string, unknown>> },
      { table: "counters", rows: data.counters as Array<Record<string, unknown>> },
      { table: "settings", rows: data.settings as Array<Record<string, unknown>> },
    ];
    for (const { table, rows } of tail) {
      counts[table] = await ctx.runMutation(internal.backup.restoreTable, { table, rows });
    }

    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    await ctx.runMutation(internal.backup.finalizeRestore, {
      storageId: args.storageId,
      exportedAt,
      counts,
      total,
    });
    await ctx.storage.delete(args.storageId);

    return { restored: counts, total, exportedAt };
  },
});