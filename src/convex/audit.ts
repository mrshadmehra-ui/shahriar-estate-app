import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireFinanceViewer, requireUser } from "./lib/security";

export const ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE_ATTEMPT: "DELETE_ATTEMPT",
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  VOID: "VOID",
  REVERSAL: "REVERSAL",
  ROLE_CHANGE: "ROLE_CHANGE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  ACCOUNTING_ADJUSTMENT: "ACCOUNTING_ADJUSTMENT",
  CLOSE_FISCAL_PERIOD: "CLOSE_FISCAL_PERIOD",
  GENERATE_CHARGES: "GENERATE_CHARGES",
} as const;

export interface AuditInput {
  userId: Id<"users">;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

/** Shared audit writer — call from within any mutation (same ctx). */
export async function recordAudit(ctx: MutationCtx, input: AuditInput): Promise<void> {
  await ctx.db.insert("auditLog", {
    userId: input.userId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
    reason: input.reason,
  });
}

/** Staff-only: recent audit entries. */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const items = await ctx.db.query("auditLog").order("desc").take(args.limit ?? 200);
    const users = new Map<string, string>();
    for (const item of items) {
      if (!users.has(item.userId)) {
        const u = await ctx.db.get(item.userId);
        users.set(item.userId, u?.name ?? u?.email ?? "کاربر");
      }
    }
    return items.map((item) => ({
      ...item,
      userName: users.get(item.userId) ?? "کاربر",
    }));
  },
});

/** Login/logout audit events (fire-and-forget from the frontend). */
export const recordUserEvent = mutation({
  args: {
    action: v.union(v.literal("LOGIN"), v.literal("LOGOUT")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    await recordAudit(ctx, {
      userId,
      action: args.action,
      entity: "auth",
      entityId: userId,
    });
  },
});