/**
 * Document numbering. Numbers are unique and traceable:
 *   INV-1405-000001  PAY-1405-000001  EXP-1405-000001
 *   TRX-1405-000001  TRF-1405-000001  RFS-1405-000001
 *
 * The counter lives in the `counters` table; get+patch inside one mutation is
 * atomic in Convex (serializable transactions), so numbers never repeat.
 */
import { currentJalaliYear } from "../../lib/jalali";
import type { MutationCtx } from "../_generated/server";

export async function nextSeq(ctx: MutationCtx, name: string): Promise<number> {
  const existing = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();
  if (!existing) {
    await ctx.db.insert("counters", { name, value: 1 });
    return 1;
  }
  const value = existing.value + 1;
  await ctx.db.patch(existing._id, { value });
  return value;
}

/** Build a numbered document id like "INV-1405-000001". */
export async function nextFinancialNumber(
  ctx: MutationCtx,
  prefix: string,
  year?: number,
): Promise<string> {
  const y = year ?? currentJalaliYear();
  const seq = await nextSeq(ctx, `${prefix}-${y}`);
  return `${prefix}-${y}-${String(seq).padStart(6, "0")}`;
}