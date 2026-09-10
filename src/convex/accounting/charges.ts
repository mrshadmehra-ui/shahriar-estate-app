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
import type { MutationCtx, QueryCtx } from "../_generated/server";
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

/* ---------- late-payment penalty ---------- */

/**
 * Compute each unit's UNPAID amount for a period (gross charges minus the
 * paid share prorated from their invoices). Discounts and penalties are
 * excluded from the base so penalties never compound on themselves.
 */
async function computePeriodUnpaid(
  ctx: QueryCtx | MutationCtx,
  args: { periodYear: number; periodMonth: number; unitId?: Id<"units"> },
): Promise<Array<{ unit: Doc<"units">; grossRial: number; paidRial: number; unpaidRial: number }>> {
  let units: Doc<"units">[];
  if (args.unitId) {
    const single = await ctx.db.get(args.unitId);
    units = single && single.isActive ? [single] : [];
  } else {
    units = (await ctx.db.query("units").collect()).filter((u) => u.isActive);
  }

  const periodCharges = (await ctx.db.query("charges").collect()).filter(
    (c) =>
      c.periodYear === args.periodYear &&
      c.periodMonth === args.periodMonth &&
      c.status !== "VOID" &&
      c.status !== "PAID" &&
      c.chargeType !== "discount" &&
      c.chargeType !== "penalty",
  );

  const rows: Array<{ unit: Doc<"units">; grossRial: number; paidRial: number; unpaidRial: number }> = [];
  for (const unit of units) {
    const own = periodCharges.filter((c) => c.unitId === unit._id);
    if (own.length === 0) continue;
    const gross = own.reduce((s, c) => s + c.amountRial, 0);
    let paid = 0;
    for (const c of own) {
      if (!c.invoiceId) continue;
      const invoice = await ctx.db.get(c.invoiceId);
      if (!invoice || invoice.status === "VOID" || invoice.status === "CANCELLED") continue;
      if (invoice.totalRial <= 0) continue;
      paid += Math.round((invoice.paidRial * c.amountRial) / invoice.totalRial);
    }
    const unpaid = gross - paid;
    if (unpaid <= 0) continue;
    rows.push({ unit, grossRial: gross, paidRial: paid, unpaidRial: unpaid });
  }
  return rows;
}

/** Preview penalty amounts without creating anything (staff). */
export const previewPenalties = query({
  args: {
    periodYear: v.number(),
    periodMonth: v.number(),
    percent: v.number(),
    unitId: v.optional(v.id("units")),
  },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const rows = await computePeriodUnpaid(ctx, args);
    const withPenalty = rows.map((r) => ({
      unit: r.unit,
      unpaidRial: r.unpaidRial,
      penaltyRial: Math.round((r.unpaidRial * args.percent) / 100),
    }));
    return {
      rows: withPenalty,
      totalUnpaidRial: rows.reduce((s, r) => s + r.unpaidRial, 0),
      totalPenaltyRial: withPenalty.reduce((s, r) => s + r.penaltyRial, 0),
    };
  },
});

/**
 * Apply a late-payment penalty (percentage of the unpaid balance of a period)
 * to every unit that has not paid. Creates penalty charges + journals.
 * Idempotent per (unit, period, percent).
 */
export const applyPenalties = mutation({
  args: {
    periodYear: v.number(),
    periodMonth: v.number(),
    percent: v.number(),
    maxPenaltyRial: v.optional(v.number()),
    unitId: v.optional(v.id("units")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    if (args.periodMonth < 1 || args.periodMonth > 12) {
      throw financialError("INVALID_PERIOD", "ماه باید بین ۱ تا ۱۲ باشد.");
    }
    if (!Number.isInteger(args.percent) || args.percent <= 0 || args.percent > 1000) {
      throw financialError("INVALID_PERCENT", "درصد جریمه باید عدد صحیح بین ۱ تا ۱۰۰۰ باشد.");
    }
    const percent = args.percent;

    // Penalty revenue is booked under 3-05 (درآمد جریمه دیرکرد) if it exists,
    // otherwise under regular charge income (3-01).
    const penaltyIncome = await ctx.db
      .query("chartOfAccounts")
      .withIndex("by_code", (q) => q.eq("code", "3-05"))
      .first();
    const categoryCode = penaltyIncome && penaltyIncome.isActive ? "3-05" : "3-01";

    const rows = await computePeriodUnpaid(ctx, args);
    let applied = 0;
    let skipped = 0;
    let totalPenalty = 0;

    for (const r of rows) {
      let penalty = Math.round((r.unpaidRial * percent) / 100);
      if (penalty <= 0) {
        skipped += 1;
        continue;
      }
      if (args.maxPenaltyRial !== undefined && args.maxPenaltyRial > 0) {
        penalty = Math.min(penalty, normalizeRialAmount(args.maxPenaltyRial));
      }
      const dedupeKey = `${r.unit._id}|${args.periodYear}|${args.periodMonth}|penalty|${percent}`;
      const existing = await ctx.db
        .query("charges")
        .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
        .first();
      if (existing) {
        skipped += 1;
        continue;
      }
      const account = await ctx.db.get(r.unit.financialAccountId);
      if (!account) {
        skipped += 1;
        continue;
      }

      const periodKey = `${args.periodYear}/${String(args.periodMonth).padStart(2, "0")}`;
      const title = `جریمه دیرکرد ${periodKey} (${percent}٪)`;
      const chargeId = await ctx.db.insert("charges", {
        unitId: r.unit._id,
        financialAccountId: account._id,
        title,
        chargeType: "penalty",
        periodYear: args.periodYear,
        periodMonth: args.periodMonth,
        amountRial: penalty,
        categoryCode,
        description: `جریمه ${percent}٪ مانده پرداختنشده دوره ${periodKey} — مبنای جریمه: ${r.unpaidRial} ریال`,
        dedupeKey,
        status: "PENDING",
        createdBy: userId,
      });
      await postJournal(ctx, {
        date: Date.now(),
        description: title,
        sourceType: "CHARGE",
        sourceId: chargeId,
        createdBy: userId,
        entries: [
          { accountCode: COA.AR, debitRial: penalty, unitId: r.unit._id, financialAccountId: account._id },
          { accountCode: categoryCode, creditRial: penalty, unitId: r.unit._id, financialAccountId: account._id },
        ],
      });
      totalPenalty += penalty;
      applied += 1;
    }

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "charges",
      entityId: `${args.periodYear}-${args.periodMonth}`,
      after: { kind: "penalty", percent, applied, skipped, totalPenaltyRial: totalPenalty },
    });
    return { applied, skipped, totalPenaltyRial: totalPenalty };
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

    // Idempotency: the same unit+period+type+rule+amount+title is a duplicate;
    // distinct manual charges (e.g. two special charges) stay allowed.
    const dedupeKey = `${args.unitId}|${args.periodYear}|${args.periodMonth ?? ""}|${args.chargeType}|${args.sourceRuleId ?? ""}|${amount}|${args.title.trim()}`;
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

/**
 * Recompute an invoice's totals from its remaining items (used when a charge
 * is removed/voided). Only safe when the invoice has no payments.
 */
async function recomputeInvoiceFromItems(ctx: MutationCtx, invoiceId: Id<"invoices">): Promise<void> {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) return;
  if (invoice.status === "VOID" || invoice.status === "CANCELLED") return;
  if (invoice.paidRial > 0) return;
  const items = await ctx.db
    .query("invoiceItems")
    .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
    .collect();
  let subtotal = 0;
  let penalty = 0;
  let discount = 0;
  for (const item of items) {
    if (item.chargeId) {
      const charge = await ctx.db.get(item.chargeId);
      if (!charge || charge.status === "VOID") continue;
      if (charge.chargeType === "discount") discount += item.amountRial;
      else if (charge.chargeType === "penalty") penalty += item.amountRial;
      else subtotal += item.amountRial;
    } else {
      subtotal += item.amountRial;
    }
  }
  const total = subtotal - discount + penalty;
  if (total <= 0) {
    await ctx.db.patch(invoiceId, {
      subtotalRial: 0,
      discountRial: 0,
      penaltyRial: 0,
      totalRial: 0,
      remainingRial: 0,
      status: "CANCELLED",
    });
    return;
  }
  await ctx.db.patch(invoiceId, {
    subtotalRial: subtotal,
    discountRial: discount,
    penaltyRial: penalty,
    totalRial: total,
    remainingRial: total,
    status: "ISSUED",
  });
}

/**
 * Void (delete) a charge — the accounting-safe equivalent of deletion.
 * Works for PENDING charges and for charges already attached to an unpaid
 * invoice (the invoice is recomputed); paid charges are locked.
 */
export const voidCharge = mutation({
  args: { chargeId: v.id("charges"), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const charge = await ctx.db.get(args.chargeId);
    if (!charge) throw financialError("NOT_FOUND", "شارژ یافت نشد.");
    if (charge.status === "PAID") {
      throw financialError("CHARGE_PAID", "شارژ پرداخت‌شده قابل حذف نیست؛ از سند معکوس استفاده کنید.");
    }
    if (charge.status === "VOID") {
      throw financialError("ALREADY_VOID", "شارژ قبلاً حذف/باطل شده است.");
    }
    const invoice = charge.invoiceId ? await ctx.db.get(charge.invoiceId) : undefined;
    if (invoice && invoice.paidRial > 0) {
      throw financialError(
        "INVOICE_PARTIALLY_PAID",
        "این شارژ در فاکتوری با پرداخت قرار دارد؛ ابتدا پرداخت را برگشت بزنید.",
      );
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
    // If the charge sat on an invoice, recompute the invoice totals.
    if (invoice && invoice.status !== "VOID" && invoice.status !== "CANCELLED") {
      await recomputeInvoiceFromItems(ctx, invoice._id);
    }
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.VOID,
      entity: "charges",
      entityId: charge._id,
      before: { status: charge.status, invoiceId: charge.invoiceId },
      after: { status: "VOID" },
      reason: args.reason,
    });
  },
});

export { CHARGE_TYPE_LABELS as chargeTypeLabels };