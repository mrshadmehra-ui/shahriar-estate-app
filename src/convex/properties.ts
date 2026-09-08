import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { DEFAULT_PROPERTIES } from "./seedData";

export const propertyFields = {
  title: v.string(),
  location: v.string(),
  area: v.string(),
  category: v.union(
    v.literal("مسکونی"),
    v.literal("اداری"),
    v.literal("تجاری"),
    v.literal("صنعتی"),
  ),
  transaction: v.union(v.literal("فروش"), v.literal("اجاره")),
  image: v.string(),
  gallery: v.array(v.string()),
  specs: v.array(v.object({ icon: v.string(), label: v.string() })),
  amenities: v.array(v.string()),
  description: v.string(),
  price: v.optional(v.string()),
  pricePerMeter: v.optional(v.string()),
  priceValue: v.number(),
};

async function requireAuth(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("برای مدیریت فایل‌ها باید وارد حساب خود شوید.");
  }
  return userId;
}

/** Public: all listings for the landing page (newest first). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("properties").order("desc").collect();
  },
});

/** Auth required: add a new listing. */
export const create = mutation({
  args: propertyFields,
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.insert("properties", args);
  },
});

/** Auth required: update an existing listing. */
export const update = mutation({
  args: {
    id: v.id("properties"),
    ...propertyFields,
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

/** Auth required: remove a listing. */
export const remove = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
  },
});

/** Populates the table with the default listings if it is still empty. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("properties").collect();
    if (existing.length > 0) {
      return { seeded: false, count: existing.length };
    }
    for (const property of DEFAULT_PROPERTIES) {
      await ctx.db.insert("properties", property);
    }
    return { seeded: true, count: DEFAULT_PROPERTIES.length };
  },
});