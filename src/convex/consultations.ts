import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const VALID_TRANSACTIONS = ["فروش", "اجاره"] as const;
const VALID_CATEGORIES = ["مسکونی", "اداری", "تجاری", "صنعتی"] as const;

export const submit = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    requestType: v.optional(v.string()),
    description: v.optional(v.string()),
    transaction: v.optional(v.string()),
    category: v.optional(v.string()),
    area: v.optional(v.string()),
    budgetValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("consultations", {
      name: args.name.trim(),
      phone: args.phone.trim(),
      requestType: args.requestType?.trim() || undefined,
      description: args.description?.trim() || undefined,
      transaction: VALID_TRANSACTIONS.includes(args.transaction as never)
        ? (args.transaction as (typeof VALID_TRANSACTIONS)[number])
        : undefined,
      category: VALID_CATEGORIES.includes(args.category as never)
        ? (args.category as (typeof VALID_CATEGORIES)[number])
        : undefined,
      area: args.area?.trim() || undefined,
      budgetValue: args.budgetValue,
    });
  },
});

/** Office-only: consultation requests (newest first). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("برای مشاهده درخواست‌ها باید وارد حساب خود شوید.");
    }
    return await ctx.db.query("consultations").order("desc").collect();
  },
});