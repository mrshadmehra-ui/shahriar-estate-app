import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import {
  canManageAccounting,
  canManageUsers,
  canViewAllFinancial,
  normalizeRole,
  type Role,
} from "../../lib/roles";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type AuthedUser = {
  userId: Id<"users">;
  user: Doc<"users">;
  role: Role;
};

/** Throw a Persian ConvexError with an error code for the frontend. */
export function financialError(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

/** Get the current user or throw. */
export async function requireUser(ctx: MutationCtx | QueryCtx): Promise<AuthedUser> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "برای این عملیات باید وارد حساب خود شوید.",
    });
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "کاربر یافت نشد." });
  }
  return { userId, user, role: normalizeRole(user.role ?? undefined) };
}

/** Require one of the given roles. */
export async function requireRole(
  ctx: MutationCtx | QueryCtx,
  roles: Role[],
): Promise<AuthedUser> {
  const authed = await requireUser(ctx);
  if (!roles.includes(authed.role)) {
    throw new ConvexError({
      code: "UNAUTHORIZED_ACCOUNTING_ACTION",
      message: "شما مجوز انجام این عملیات را ندارید.",
    });
  }
  return authed;
}

/** Any financial write (super_admin / accountant). */
export async function requireAccounting(ctx: MutationCtx): Promise<AuthedUser> {
  const authed = await requireUser(ctx);
  if (!canManageAccounting(authed.role)) {
    throw new ConvexError({
      code: "UNAUTHORIZED_ACCOUNTING_ACTION",
      message: "فقط حسابدار یا مدیر ارشد مجاز به انجام عملیات مالی است.",
    });
  }
  return authed;
}

/** User management (super_admin only). */
export async function requireUserAdmin(ctx: MutationCtx): Promise<AuthedUser> {
  const authed = await requireUser(ctx);
  if (!canManageUsers(authed.role)) {
    throw new ConvexError({
      code: "UNAUTHORIZED_ACCOUNTING_ACTION",
      message: "فقط مدیر ارشد مجاز به مدیریت کاربران است.",
    });
  }
  return authed;
}

/** Anyone who can view all financial data (super_admin / accountant / board_member). */
export async function requireFinanceViewer(ctx: QueryCtx | MutationCtx): Promise<AuthedUser> {
  const authed = await requireUser(ctx);
  if (!canViewAllFinancial(authed.role)) {
    throw new ConvexError({
      code: "UNAUTHORIZED_ACCOUNTING_ACTION",
      message: "شما مجوز مشاهده اطلاعات مالی را ندارید.",
    });
  }
  return authed;
}

/** Is this unit owned by / rented by the given user? (object-level security) */
export function userOwnsUnit(user: Doc<"users">, unit: Doc<"units">): boolean {
  return (
    (unit.ownerUserId !== undefined && unit.ownerUserId === user._id) ||
    (unit.tenantUserId !== undefined && unit.tenantUserId === user._id)
  );
}

export const methodValidator = v.union(
  v.literal("CASH"),
  v.literal("BANK_TRANSFER"),
  v.literal("CARD"),
  v.literal("POS"),
  v.literal("ONLINE"),
  v.literal("CHEQUE"),
  v.literal("OTHER"),
);