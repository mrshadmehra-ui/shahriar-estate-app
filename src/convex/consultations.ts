import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const submit = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    requestType: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("consultations", {
      name: args.name.trim(),
      phone: args.phone.trim(),
      requestType: args.requestType?.trim() || undefined,
      description: args.description?.trim() || undefined,
    });
  },
});