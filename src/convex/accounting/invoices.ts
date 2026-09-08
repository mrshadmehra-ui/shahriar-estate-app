/**
 * Accounting — invoices.
 *
 * An invoice groups charges (or manual line items) into one billable document.
 * Issuing from already-journaled charges does NOT post a new journal (revenue
 * was recognized at charge time). Manual items ARE journaled at creation.
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { normalizeRialAmount } from "../../lib/money";
import { recordAudit, ACTIONS } from "../audit";
import { postJournal, COA } from "../lib/ledger";
import { nextFinancialNumber } from "../lib/seq";
import {
  financialError,
  requireAccounting,
  requireFinanceViewer,
  requireUser,
} from "../lib/security";

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  ISSUED: "صادرشده",
  PARTIALLY_PAID: "پرداخت جزئی",
  PAID: "پرداخت‌شده",
  OVERDUE: "معوق",
  CANCELLED: "لغوشده",
  VOID: "باطل‌شده",
};

export const INVOICE_STATUS_TONES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ISSUED: "bg-sky-100 text-sky-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  VOID: "bg-slate-100 text-slate-500 line-through",
};

/** Pending charges available for a unit (not yet invoiced). */
export const listPendingCharges = query({
  args: { unitId: v.id("units") },
  handler: async (ctx, args) => {
    const authed = await requireFinanceViewer(ctx);
    void authed;
    return await ctx.db
      .query("charges")
      .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();
  },
});

export const listInvoices = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("DRAFT"),
        v.literal("ISSUED"),
        v.literal("PARTIALLY_PAID"),
        v.literal("PAID"),
        v.literal("OVERDUE"),
        v.literal("CANCELLED"),
        v.literal("VOID"),
      ),
    ),
    unitId: v.optional(v.id("units")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authed = await requireUser(ctx);

    let invoices: Doc<"invoices">[];
    if (args.unitId) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_unit", (q) => q.eq("unitId", args.unitId!))
        .order("desc")
        .take(args.limit ?? 100);
    } else {
      invoices = await ctx.db.query("invoices").order("desc").take(args.limit ?? 200);
    }

    const allowed = await filterInvoicesByAccess(ctx, authed.user, invoices);
    const filtered = allowed.filter((inv) => {
      if (args.status !== undefined) return inv.status === args.status;
      return true;
    });

    const out: Array<Doc<"invoices"> & { unit?: Doc<"units">; account?: Doc<"financialAccounts">; items?: Doc<"invoiceItems">[] }> = [];
    for (const inv of filtered) {
      const unit = await ctx.db.get(inv.unitId);
      const account = await ctx.db.get(inv.financialAccountId);
      const items = await ctx.db
        .query("invoiceItems")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
        .collect();
      out.push({ ...inv, unit: unit ?? undefined, account: account ?? undefined, items });
    }
    return out;
  },
});

/** Object-level security: staff see all, owners/tenants only their units. */
export async function filterInvoicesByAccess(
  ctx: QueryCtx,
  user: Doc<"users">,
  invoices: Doc<"invoices">[],
): Promise<Doc<"invoices">[]> {
  const role = (user.role ?? "owner") as string;
  const staff = role === "super_admin" || role === "accountant" || role === "board_member";
  if (staff) return invoices;
  const ownedUnitIds = new Set<string>();
  const units = await ctx.db.query("units").collect();
  for (const u of units) {
    if (u.ownerUserId === user._id || u.tenantUserId === user._id) ownedUnitIds.add(u._id);
  }
  return invoices.filter((inv) => ownedUnitIds.has(inv.unitId));
}

/** Issue an invoice from selected pending charges of one unit. */
export const issueFromCharges = mutation({
  args: {
    unitId: v.id("units"),
    chargeIds: v.array(v.id("charges")),
    dueDate: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    if (args.chargeIds.length === 0) {
      throw financialError("INVALID_CHARGE", "حداقل یک شارژ انتخاب کنید.");
    }
    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw financialError("NOT_FOUND", "واحد یافت نشد.");
    const account = await ctx.db.get(unit.financialAccountId);
    if (!account) throw financialError("NOT_FOUND", "حساب مالی واحد یافت نشد.");

    const charges: Doc<"charges">[] = [];
    let subtotal = 0;
    let penalty = 0;
    let discount = 0;
    for (const chargeId of args.chargeIds) {
      const charge = await ctx.db.get(chargeId);
      if (!charge || charge.unitId !== unit._id) {
        throw financialError("INVALID_CHARGE", "یکی از شارژها برای این واحد نیست.");
      }
      if (charge.status !== "PENDING") {
        throw financialError("CHARGE_ALREADY_INVOICED", `شارژ «${charge.title}» قبلاً فاکتور شده است.`);
      }
      charges.push(charge);
      if (charge.chargeType === "discount") discount += charge.amountRial;
      else if (charge.chargeType === "penalty") penalty += charge.amountRial;
      else subtotal += charge.amountRial;
    }

    const invoiceNumber = await nextFinancialNumber(ctx, "INV");
    const total = subtotal - discount + penalty;
    if (total <= 0) throw financialError("INVALID_AMOUNT", "جمع فاکتور باید بزرگ‌تر از صفر باشد.");

    const invoiceId = await ctx.db.insert("invoices", {
      invoiceNumber,
      unitId: unit._id,
      financialAccountId: account._id,
      issueDate: Date.now(),
      dueDate: args.dueDate,
      status: "ISSUED",
      subtotalRial: subtotal,
      discountRial: discount,
      penaltyRial: penalty,
      totalRial: total,
      paidRial: 0,
      remainingRial: total,
      description: args.description,
      createdBy: userId,
    });

    for (const charge of charges) {
      await ctx.db.insert("invoiceItems", {
        invoiceId,
        chargeId: charge._id,
        description: charge.title,
        quantity: 1,
        unitPriceRial: charge.amountRial,
        amountRial: charge.amountRial,
        categoryCode: charge.categoryCode,
      });
      await ctx.db.patch(charge._id, { invoiceId, status: "INVOICED" });
    }

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "invoices",
      entityId: invoiceId,
      after: { invoiceNumber, unitId: unit._id, totalRial: total },
    });
    return invoiceId;
  },
});

/** Manual invoice with custom line items (e.g. share of a repair). Journals the items. */
export const createManualInvoice = mutation({
  args: {
    unitId: v.id("units"),
    items: v.array(
      v.object({
        description: v.string(),
        amountRial: v.number(),
        categoryCode: v.string(),
      }),
    ),
    dueDate: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    if (args.items.length === 0) throw financialError("INVALID_ITEM", "حداقل یک ردیف وارد کنید.");
    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw financialError("NOT_FOUND", "واحد یافت نشد.");
    const account = await ctx.db.get(unit.financialAccountId);
    if (!account) throw financialError("NOT_FOUND", "حساب مالی واحد یافت نشد.");

    const items = args.items.map((it) => ({
      description: it.description.trim(),
      amountRial: normalizeRialAmount(it.amountRial, "مبلغ ردیف"),
      categoryCode: it.categoryCode,
    }));
    const subtotal = items.reduce((sum, it) => sum + it.amountRial, 0);
    if (subtotal <= 0) throw financialError("INVALID_AMOUNT", "جمع فاکتور باید بزرگ‌تر از صفر باشد.");

    const invoiceNumber = await nextFinancialNumber(ctx, "INV");
    const invoiceId = await ctx.db.insert("invoices", {
      invoiceNumber,
      unitId: unit._id,
      financialAccountId: account._id,
      issueDate: Date.now(),
      dueDate: args.dueDate,
      status: "ISSUED",
      subtotalRial: subtotal,
      discountRial: 0,
      penaltyRial: 0,
      totalRial: subtotal,
      paidRial: 0,
      remainingRial: subtotal,
      description: args.description,
      createdBy: userId,
    });

    for (const it of items) {
      await ctx.db.insert("invoiceItems", {
        invoiceId,
        description: it.description,
        quantity: 1,
        unitPriceRial: it.amountRial,
        amountRial: it.amountRial,
        categoryCode: it.categoryCode,
      });
      // journal each item: DR AR / CR income category
      await postJournal(ctx, {
        date: Date.now(),
        description: it.description,
        sourceType: "INVOICE",
        sourceId: invoiceId,
        createdBy: userId,
        entries: [
          { accountCode: COA.AR, debitRial: it.amountRial, unitId: unit._id, financialAccountId: account._id },
          { accountCode: it.categoryCode, creditRial: it.amountRial, unitId: unit._id, financialAccountId: account._id },
        ],
      });
    }

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "invoices",
      entityId: invoiceId,
      after: { invoiceNumber, unitId: unit._id, totalRial: subtotal },
    });
    return invoiceId;
  },
});

/** Void an unpaid invoice: releases its charges back to PENDING. */
export const voidInvoice = mutation({
  args: { invoiceId: v.id("invoices"), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw financialError("NOT_FOUND", "فاکتور یافت نشد.");
    if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
      throw financialError("ALREADY_VOID", "فاکتور قبلاً باطل شده است.");
    }
    if (invoice.status === "PAID") {
      throw financialError("INVOICE_ALREADY_PAID", "فاکتور پرداخت‌شده قابل باطل‌کردن نیست؛ از برگشت پرداخت استفاده کنید.");
    }
    if (invoice.paidRial > 0) {
      throw financialError("INVOICE_PARTIALLY_PAID", "فاکتور دارای پرداخت است؛ ابتدا پرداخت را برگشت بزنید.");
    }

    // release charges
    const items = await ctx.db
      .query("invoiceItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
      .collect();
    for (const item of items) {
      if (item.chargeId) {
        const charge = await ctx.db.get(item.chargeId);
        if (charge && charge.status === "INVOICED") {
          await ctx.db.patch(charge._id, { invoiceId: undefined, status: "PENDING" });
        }
      }
    }
    // reverse journals created by manual items (sourceType INVOICE)
    const journals = await ctx.db
      .query("journal")
      .withIndex("by_source", (q) => q.eq("sourceType", "INVOICE").eq("sourceId", invoice._id))
      .collect();
    for (const j of journals) {
      if (j.status !== "POSTED") continue;
      const entries = await ctx.db
        .query("journalEntries")
        .withIndex("by_journal", (q) => q.eq("journalId", j._id))
        .collect();
      const reversal = entries.map((e) => ({
        accountCode: e.accountCode,
        debitRial: e.creditRial > 0 ? e.creditRial : undefined,
        creditRial: e.debitRial > 0 ? e.debitRial : undefined,
        unitId: e.unitId,
        financialAccountId: e.financialAccountId,
      }));
      await postJournal(ctx, {
        date: Date.now(),
        description: `باطل‌کردن فاکتور ${invoice.invoiceNumber} — ${args.reason}`,
        sourceType: "REVERSAL",
        sourceId: invoice._id,
        createdBy: userId,
        isReversal: true,
        reversedJournalId: j._id,
        entries: reversal,
      });
    }

    await ctx.db.patch(invoice._id, { status: "VOID", remainingRial: 0 });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.VOID,
      entity: "invoices",
      entityId: invoice._id,
      before: { status: invoice.status },
      after: { status: "VOID" },
      reason: args.reason,
    });
  },
});

/** Recompute an invoice's paid/remaining/status from allocations (internal). */
export async function refreshInvoiceStatus(
  ctx: MutationCtx,
  invoiceId: Id<"invoices">,
): Promise<void> {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) return;
  const allocations = await ctx.db
    .query("paymentAllocations")
    .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
    .collect();
  let paid = 0;
  for (const a of allocations) {
    const payment = await ctx.db.get(a.paymentId);
    if (payment && payment.status === "COMPLETED") paid += a.amountRial;
  }
  const remaining = invoice.totalRial - paid;
  let status: Doc<"invoices">["status"] = invoice.status;
  if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
    status = invoice.status;
  } else if (remaining <= 0) {
    status = "PAID";
  } else if (paid > 0) {
    status = "PARTIALLY_PAID";
  } else {
    status = "ISSUED";
  }
  await ctx.db.patch(invoiceId, { paidRial: paid, remainingRial: Math.max(remaining, 0), status });
  // sync linked charges
  const items = await ctx.db
    .query("invoiceItems")
    .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
    .collect();
  for (const item of items) {
    if (item.chargeId) {
      const charge = await ctx.db.get(item.chargeId);
      if (charge && charge.status !== "VOID") {
        await ctx.db.patch(charge._id, { status: remaining <= 0 ? "PAID" : "INVOICED" });
      }
    }
  }
}