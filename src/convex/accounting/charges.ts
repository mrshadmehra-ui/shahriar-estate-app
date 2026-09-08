/**
 * Accounting — charges.
 *
 * A charge is the atomic unit of billing (monthly, area-based, parking,
 * special, penalty, discount). Creating a charge posts a double-entry journal:
 *   normal:   DR حسابهای دریافتنی واحد   /   CR دسته درآمد
 *   discount: DR دسته درآمد               /   CR حسابهای دریافتنی واحد
 *
 * Monthly generation is IDEMPOTENT: re-running for the same (unit, period,
 * chargeType, rule) never creates duplicates (dedupeKey check).
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { normalizeRialAmount } from "../../lib/money";
import { recordAudit, ACTIONS } from "../audit";
import { postJournal, COA } from "../lib/ledger";
import { financialError, requireAccounting, requireFinanceViewer } from "../lib/security";

export const CHARGE_TYPE_LABELS: Record<string, string> = {
  monthly: "شارژ ماهانه",
  fixed: "شارژ ثابت",
  area: "شارژ متراژی",
  parking: "شارژ پارکینگ",
  special: "شارژ اختصاصی",
  general: "شارژ عمومی",
  penalty: "جریمه",
  discount: "تخفیف",
};

/* ---------- charge rules ---------- */

export const listChargeRules = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceViewer(ctx);
    return await ctx.db.query("chargeRules").collect();
  },
});

export const createChargeRule = mutation({
  args: {
    name: v.string(),
    chargeType: v.union(
      v.literal("monthly"),
      v.literal("fixed"),
      v.literal("area"),
      v.literal("parking"),
      v.literal("special"),
      v.literal("general"),
      v.literal("penalty"),
      v.literal("discount"),
    ),
    categoryCode: v.string(),
    baseRial: v.optional(v.number()),
    ratePerM2Rial: v.optional(v.number()),
    parkingRateRial: v.optional(v.number()),
    appliesToUsage: v.optional(v.union(v.literal("تجاری"), v.literal("اداری"), v.literal("مسکونی"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const id = await ctx.db.insert("chargeRules", {
      name: args.name.trim(),
      chargeType: args.chargeType,
      categoryCode: args.categoryCode,
      baseRial: args.baseRial ? normalizeRialAmount(args.baseRial) : 0,
      ratePerM2Rial: args.ratePerM2Rial ? normalizeRialAmount(args.ratePerM2Rial) : 0,
      parkingRateRial: args.parkingRateRial ? normalizeRialAmount(args.parkingRateRial) : 0,
      appliesToUsage: args.appliesToUsage,
      isActive: true,
      description: args.description,
    });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "chargeRules",
      entityId: id,
      after: { name: args.name.trim(), chargeType: args.chargeType },
    });
    return id;
  },
});

export const updateChargeRule = mutation({
  args: {
    ruleId: v.id("chargeRules"),
    name: v.optional(v.string()),
    categoryCode: v.optional(v.string()),
    baseRial: v.optional(v.number()),
    ratePerM2Rial: v.optional(v.number()),
    parkingRateRial: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) throw financialError("NOT_FOUND", "قانون شارژ یافت نشد.");
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.categoryCode !== undefined) patch.categoryCode = args.categoryCode;
    if (args.baseRial !== undefined) patch.baseRial = normalizeRialAmount(args.baseRial);
    if (args.ratePerM2Rial !== undefined) patch.ratePerM2Rial = normalizeRialAmount(args.ratePerM2Rial);
    if (args.parkingRateRial !== undefined) patch.parkingRateRial = normalizeRialAmount(args.parkingRateRial);
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.description !== undefined) patch.description = args.description;
    await ctx.db.patch(rule._id, patch);
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.UPDATE,
      entity: "chargeRules",
      entityId: rule._id,
      before: { name: rule.name, isActive: rule.isActive },
      after: patch,
    });
  },
});

/* ---------- charges ---------- */

export const listCharges = query({
  args: {
    periodYear: v.optional(v.number()),
    periodMonth: v.optional(v.number()),
    unitId: v.optional(v.id("units")),
    status: v.optional(v.union(v.literal("PENDING"), v.literal("INVOICED"), v.literal("PAID"), v.literal("VOID"))),
  },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    let charges: Doc<"charges">[];
    if (args.unitId) {
      charges = await ctx.db
        .query("charges")
        .withIndex("by_unit", (q) => q.eq("unitId", args.unitId!))
        .collect();
    } else {
      charges = await ctx.db.query("charges").order("desc").take(500);
    }
    const filtered = charges.filter((c) => {
      if (args.periodYear !== undefined && c.periodYear !== args.periodYear) return false;
      if (args.periodMonth !== undefined && c.periodMonth !== args.periodMonth) return false;
      if (args.status !== undefined && c.status !== args.status) return false;
      return true;
    });
    // enrich with unit + fa
    const out: Array<Doc<"charges"> & { unit?: Doc<"units">; account?: Doc<"financialAccounts"> }> = [];
    for (const c of filtered) {
      const unit = await ctx.db.get(c.unitId);
      const account = await ctx.db.get(c.financialAccountId);
      out.push({ ...c, unit: unit ?? undefined, account: account ?? undefined });
    }
    return out;
  },
});

export const listUnitsForCharges = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceViewer(ctx);
    const units = await ctx.db.query("units").collect();
    const out: Array<Doc<"units"> & { account?: Doc<"financialAccounts">; building?: Doc<"buildings"> }> = [];
    for (const u of units) {
      const account = await ctx.db.get(u.financialAccountId);
      const building = await ctx.db.get(u.buildingId);
      out.push({ ...u, account: account ?? undefined, building: building ?? undefined });
    }
    return out.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
  },
});

/** Compute a rule's amount for a unit. */
function computeRuleAmount(
  rule: Doc<"chargeRules">,
  unit: Doc<"units">,
): number {
  let total = rule.baseRial;
  if (rule.ratePerM2Rial > 0 && unit.areaM2 > 0) {
    total += Math.round(rule.ratePerM2Rial * unit.areaM2);
  }
  if (rule.parkingRateRial > 0 && unit.parkingSlots > 0) {
    total += rule.parkingRateRial * unit.parkingSlots;
  }
  return total;
}

/** Create a single charge (manual). Idempotent on dedupeKey. */
export const createCharge = mutation({
  args: {
    unitId: v.id("units"),
    title: v.string(),
    chargeType: v.union(
      v.literal("monthly"),
      v.literal("fixed"),
      v.literal("area"),
      v.literal("parking"),
      v.literal("special"),
      v.literal("general"),
      v.literal("penalty"),
      v.literal("discount"),
    ),
    periodYear: v.number(),
    periodMonth: v.optional(v.number()),
    amountRial: v.number(),
    categoryCode: v.string(),
    description: v.optional(v.string()),
    sourceRuleId: v.optional(v.id("chargeRules")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const amount = normalizeRialAmount(args.amountRial, "مبلغ شارژ");
    if (amount === 0) throw financialError("INVALID_AMOUNT", "مبلغ شارژ نمی‌تواند صفر باشد.");
    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw financialError("NOT_FOUND", "واحد یافت نشد.");
    const account = await ctx.db.get(unit.financialAccountId);
    if (!account) throw financialError("NOT_FOUND", "حساب مالی واحد یافت نشد.");

    const dedupeKey = `${args.unitId}|${args.periodYear}|${args.periodMonth ?? ""}|${args.chargeType}|${args.sourceRuleId ?? ""}`;
    const existing = await ctx.db
      .query("charges")
      .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
      .first();
    if (existing) {
      throw financialError("DUPLICATE_CHARGE", "شارژ مشابه برای این واحد و دوره قبلاً ثبت شده است.");
    }

    const chargeId = await ctx.db.insert("charges", {
      unitId: unit._id,
      financialAccountId: account._id,
      title: args.title.trim(),
      chargeType: args.chargeType,
      periodYear: args.periodYear,
      periodMonth: args.periodMonth,
      amountRial: amount,
      categoryCode: args.categoryCode,
      description: args.description,
      sourceRuleId: args.sourceRuleId,
      dedupeKey,
      status: "PENDING",
      createdBy: userId,
    });

    // Journal: normal = DR AR / CR income ; discount = DR income / CR AR
    const isDiscount = args.chargeType === "discount";
    await postJournal(ctx, {
      date: Date.now(),
      description: args.title.trim(),
      sourceType: "CHARGE",
      sourceId: chargeId,
      createdBy: userId,
      entries: isDiscount
        ? [
            { accountCode: args.categoryCode, debitRial: amount, unitId: unit._id, financialAccountId: account._id },
            { accountCode: COA.AR, creditRial: amount, unitId: unit._id, financialAccountId: account._id },
          ]
        : [
            { accountCode: COA.AR, debitRial: amount, unitId: unit._id, financialAccountId: account._id },
            { accountCode: args.categoryCode, creditRial: amount, unitId: unit._id, financialAccountId: account._id },
          ],
    });

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "charges",
      entityId: chargeId,
      after: { title: args.title.trim(), amountRial: amount, periodYear: args.periodYear, periodMonth: args.periodMonth },
    });
    return chargeId;
  },
});

/**
 * Generate monthly charges from active rules for all active units.
 * Idempotent: skips (unit, period, chargeType, rule) pairs that already exist.
 */
export const generateMonthlyCharges = mutation({
  args: {
    periodYear: v.number(),
    periodMonth: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    if (args.periodMonth < 1 || args.periodMonth > 12) {
      throw financialError("INVALID_PERIOD", "ماه باید بین ۱ تا ۱۲ باشد.");
    }
    const rules = await ctx.db.query("chargeRules").collect();
    const activeRules = rules.filter((r) => r.isActive);
    const units = await ctx.db.query("units").collect();
    const activeUnits = units.filter((u) => u.isActive);

    let created = 0;
    let skipped = 0;

    for (const rule of activeRules) {
      for (const unit of activeUnits) {
        if (rule.appliesToUsage && rule.appliesToUsage !== unit.usage) continue;
        const amount = computeRuleAmount(rule, unit);
        if (amount <= 0) continue;

        const dedupeKey = `${unit._id}|${args.periodYear}|${args.periodMonth}|${rule.chargeType}|${rule._id}`;
        const existing = await ctx.db
          .query("charges")
          .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
          .first();
        if (existing) {
          skipped += 1;
          continue;
        }

        const title = `${rule.name} ${args.periodYear}/${String(args.periodMonth).padStart(2, "0")}`;
        const account = await ctx.db.get(unit.financialAccountId);
        if (!account) continue;

        const chargeId = await ctx.db.insert("charges", {
          unitId: unit._id,
          financialAccountId: account._id,
          title,
          chargeType: rule.chargeType,
          periodYear: args.periodYear,
          periodMonth: args.periodMonth,
          amountRial: amount,
          categoryCode: rule.categoryCode,
          description: rule.description,
          sourceRuleId: rule._id,
          dedupeKey,
          status: "PENDING",
          createdBy: userId,
        });

        const isDiscount = rule.chargeType === "discount";
        await postJournal(ctx, {
          date: Date.now(),
          description: title,
          sourceType: "CHARGE",
          sourceId: chargeId,
          createdBy: userId,
          entries: isDiscount
            ? [
                { accountCode: rule.categoryCode, debitRial: amount, unitId: unit._id, financialAccountId: account._id },
                { accountCode: COA.AR, creditRial: amount, unitId: unit._id, financialAccountId: account._id },
              ]
            : [
                { accountCode: COA.AR, debitRial: amount, unitId: unit._id, financialAccountId: account._id },
                { accountCode: rule.categoryCode, creditRial: amount, unitId: unit._id, financialAccountId: account._id },
              ],
        });
        created += 1;
      }
    }

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.GENERATE_CHARGES,
      entity: "charges",
      entityId: `${args.periodYear}-${args.periodMonth}`,
      after: { periodYear: args.periodYear, periodMonth: args.periodMonth, created, skipped },
    });
    return { created, skipped };
  },
});

/** Void a PENDING charge (reverses its journal). */
export const voidCharge = mutation({
  args: { chargeId: v.id("charges"), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const charge = await ctx.db.get(args.chargeId);
    if (!charge) throw financialError("NOT_FOUND", "شارژ یافت نشد.");
    if (charge.status === "PAID") {
      throw financialError("CHARGE_PAID", "شارژ پرداخت‌شده قابل باطل کردن نیست.");
    }
    if (charge.status === "INVOICED") {
      throw financialError("INVOICE_ISSUED", "ابتدا باید شارژ از فاکتور جدا شود (فاکتور را باطل کنید).");
    }
    if (charge.status === "VOID") {
      throw financialError("ALREADY_VOID", "شارژ قبلاً باطل شده است.");
    }
    await ctx.db.patch(charge._id, { status: "VOID" });
    // reverse journal
    const journal = await ctx.db
      .query("journal")
      .withIndex("by_source", (q) => q.eq("sourceType", "CHARGE").eq("sourceId", args.chargeId))
      .first();
    if (journal && journal.status === "POSTED") {
      const isDiscount = charge.chargeType === "discount";
      await postJournal(ctx, {
        date: Date.now(),
        description: `باطل‌کردن: ${charge.title} — ${args.reason}`,
        sourceType: "REVERSAL",
        sourceId: charge._id,
        createdBy: userId,
        isReversal: true,
        reversedJournalId: journal._id,
        entries: isDiscount
          ? [
              { accountCode: COA.AR, debitRial: charge.amountRial, unitId: charge.unitId, financialAccountId: charge.financialAccountId },
              { accountCode: charge.categoryCode, creditRial: charge.amountRial, unitId: charge.unitId, financialAccountId: charge.financialAccountId },
            ]
          : [
              { accountCode: charge.categoryCode, debitRial: charge.amountRial, unitId: charge.unitId, financialAccountId: charge.financialAccountId },
              { accountCode: COA.AR, creditRial: charge.amountRial, unitId: charge.unitId, financialAccountId: charge.financialAccountId },
            ],
      });
    }
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.VOID,
      entity: "charges",
      entityId: charge._id,
      before: { status: charge.status },
      after: { status: "VOID" },
      reason: args.reason,
    });
  },
});

export { CHARGE_TYPE_LABELS as chargeTypeLabels };