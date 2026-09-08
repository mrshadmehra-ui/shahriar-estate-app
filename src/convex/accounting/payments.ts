/**
 * Accounting — payments, allocations, refunds.
 *
 * Rules:
 *   - A unit payment settles one or more invoices (allocations). Any excess
 *     becomes credit (بستانکاری/پیشپرداخت) on the unit's financial account —
 *     never lost, never silently applied.
 *   - Partial payment leaves the invoice PARTIALLY_PAID.
 *   - Idempotency: duplicate idempotencyKey / trackingCode / referenceNumber
 *     is rejected (DUPLICATE_PAYMENT).
 *   - Payments are never deleted; they are VOIDED (journal reversed).
 *   - All of this happens inside ONE mutation (atomic unit of work).
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { normalizeRialAmount } from "../../lib/money";
import { recordAudit, ACTIONS } from "../audit";
import { postJournal, voidJournal, COA } from "../lib/ledger";
import { nextFinancialNumber } from "../lib/seq";
import {
  financialError,
  methodValidator,
  requireAccounting,
  requireRole,
  requireUser,
} from "../lib/security";
import { ROLES } from "../../lib/roles";
import { refreshInvoiceStatus } from "./invoices";

async function notify(
  ctx: MutationCtx,
  userId: Id<"users">,
  title: string,
  body: string,
  type: "CHARGE" | "INVOICE" | "PAYMENT" | "OVERDUE" | "PENALTY" | "EXPENSE" | "SYSTEM",
): Promise<void> {
  if (!userId) return;
  await ctx.db.insert("notifications", { userId, title, body, type, read: false, createdAt: Date.now() });
}

/** Payment method labels for the UI. */
export const METHOD_LABELS: Record<string, string> = {
  CASH: "نقدی",
  BANK_TRANSFER: "کارت‌به‌کارت / حواله",
  CARD: "کارت",
  POS: "دستگاه پوز",
  ONLINE: "پرداخت آنلاین",
  CHEQUE: "چک",
  OTHER: "سایر",
};

/* ---------- unit payments ---------- */

export const recordPayment = mutation({
  args: {
    unitId: v.id("units"),
    payer: v.optional(v.string()),
    payerUserId: v.optional(v.id("users")),
    amountRial: v.number(),
    method: methodValidator,
    paymentDate: v.optional(v.number()),
    referenceNumber: v.optional(v.string()),
    trackingCode: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    cashAccountId: v.optional(v.id("cashAccounts")),
    bankAccountId: v.optional(v.id("bankAccounts")),
    description: v.optional(v.string()),
    allocations: v.optional(
      v.array(v.object({ invoiceId: v.id("invoices"), amountRial: v.number() })),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const amount = normalizeRialAmount(args.amountRial, "مبلغ پرداخت");
    if (amount <= 0) throw financialError("INVALID_AMOUNT", "مبلغ پرداخت باید بزرگ‌تر از صفر باشد.");
    if (args.cashAccountId && args.bankAccountId) {
      throw financialError("INVALID_ALLOCATION", "فقط یکی از صندوق یا بانک را انتخاب کنید.");
    }
    if (!args.cashAccountId && !args.bankAccountId) {
      throw financialError("INVALID_ALLOCATION", "صندوق یا حساب بانکی را انتخاب کنید.");
    }

    // Idempotency guards: duplicate tracking code / reference / idempotency key.
    if (args.trackingCode) {
      const dup = await ctx.db
        .query("payments")
        .withIndex("by_tracking", (q) => q.eq("trackingCode", args.trackingCode!))
        .first();
      if (dup && dup.status === "COMPLETED") {
        throw financialError("DUPLICATE_PAYMENT", `این پرداخت قبلاً با شماره ${dup.paymentNumber} ثبت شده است.`);
      }
    }
    if (args.referenceNumber) {
      const dup = await ctx.db
        .query("payments")
        .withIndex("by_reference", (q) => q.eq("referenceNumber", args.referenceNumber!))
        .first();
      if (dup && dup.status === "COMPLETED") {
        throw financialError("DUPLICATE_PAYMENT", `شماره مرجع ${args.referenceNumber} قبلاً استفاده شده است.`);
      }
    }
    if (args.idempotencyKey) {
      const all = await ctx.db.query("payments").collect();
      const dup = all.find((p) => p.idempotencyKey === args.idempotencyKey && p.status === "COMPLETED");
      if (dup) {
        throw financialError("DUPLICATE_PAYMENT", `این پرداخت قبلاً با شماره ${dup.paymentNumber} ثبت شده است.`);
      }
    }

    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw financialError("NOT_FOUND", "واحد یافت نشد.");
    const account = await ctx.db.get(unit.financialAccountId);
    if (!account) throw financialError("NOT_FOUND", "حساب مالی واحد یافت نشد.");

    // ---- allocations ----
    let allocations: { invoiceId: Id<"invoices">; amountRial: number }[];
    if (args.allocations && args.allocations.length > 0) {
      allocations = [];
      let sum = 0;
      for (const alloc of args.allocations) {
        const allocAmount = normalizeRialAmount(alloc.amountRial, "مبلغ تخصیص");
        if (allocAmount <= 0) continue;
        const invoice = await ctx.db.get(alloc.invoiceId);
        if (!invoice) throw financialError("NOT_FOUND", "فاکتور تخصیص یافت نشد.");
        if (invoice.unitId !== unit._id) {
          throw financialError("INVALID_ALLOCATION", "فاکتور انتخابی متعلق به این واحد نیست.");
        }
        if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
          throw financialError("INVOICE_CANCELLED", `فاکتور ${invoice.invoiceNumber} باطل است.`);
        }
        if (invoice.remainingRial <= 0) {
          throw financialError("INVOICE_ALREADY_PAID", `فاکتور ${invoice.invoiceNumber} قبلاً تسویه شده است.`);
        }
        if (allocAmount > invoice.remainingRial) {
          throw financialError(
            "INVALID_ALLOCATION",
            `مبلغ تخصیص به فاکتور ${invoice.invoiceNumber} از مانده آن بیشتر است.`,
          );
        }
        sum += allocAmount;
        allocations.push({ invoiceId: invoice._id, amountRial: allocAmount });
      }
      if (sum > amount) {
        throw financialError("INVALID_ALLOCATION", "جمع تخصیص‌ها از مبلغ پرداخت بیشتر است.");
      }
    } else {
      // auto-allocate FIFO by due date
      allocations = [];
      const openInvoices = await ctx.db.query("invoices").collect();
      const candidates = openInvoices
        .filter(
          (inv) =>
            inv.unitId === unit._id &&
            inv.remainingRial > 0 &&
            inv.status !== "VOID" &&
            inv.status !== "CANCELLED" &&
            inv.status !== "PAID",
        )
        .sort((a, b) => a.dueDate - b.dueDate || a.issueDate - b.issueDate);
      let remaining = amount;
      for (const inv of candidates) {
        if (remaining <= 0) break;
        const allocAmount = Math.min(inv.remainingRial, remaining);
        allocations.push({ invoiceId: inv._id, amountRial: allocAmount });
        remaining -= allocAmount;
      }
    }

    const allocatedRial = allocations.reduce((s, a) => s + a.amountRial, 0);
    const creditRial = amount - allocatedRial; // overpayment -> بستانکاری

    const paymentNumber = await nextFinancialNumber(ctx, "PAY");
    const paymentId = await ctx.db.insert("payments", {
      paymentNumber,
      kind: "UNIT_PAYMENT",
      payer: args.payer?.trim() || unit.ownerName || unit.tenantName || `واحد ${unit.unitNumber}`,
      payerUserId: args.payerUserId,
      unitId: unit._id,
      financialAccountId: account._id,
      amountRial: amount,
      method: args.method,
      paymentDate: args.paymentDate ?? Date.now(),
      referenceNumber: args.referenceNumber,
      trackingCode: args.trackingCode,
      idempotencyKey: args.idempotencyKey,
      description: args.description,
      status: "COMPLETED",
      allocatedRial,
      creditRial,
      cashAccountId: args.cashAccountId,
      bankAccountId: args.bankAccountId,
      createdBy: userId,
    });

    for (const alloc of allocations) {
      await ctx.db.insert("paymentAllocations", {
        paymentId,
        invoiceId: alloc.invoiceId,
        amountRial: alloc.amountRial,
      });
      await refreshInvoiceStatus(ctx, alloc.invoiceId);
    }

    // Journal: DR cash/bank / CR AR (allocated) / CR prepaid (excess)
    const entries: Parameters<typeof postJournal>[1]["entries"] = [];
    if (args.cashAccountId) {
      entries.push({ accountCode: COA.CASH, debitRial: amount, cashAccountId: args.cashAccountId });
    }
    if (args.bankAccountId) {
      entries.push({ accountCode: COA.BANK, debitRial: amount, bankAccountId: args.bankAccountId });
    }
    for (const alloc of allocations) {
      entries.push({
        accountCode: COA.AR,
        creditRial: alloc.amountRial,
        unitId: unit._id,
        financialAccountId: account._id,
      });
    }
    if (creditRial > 0) {
      entries.push({
        accountCode: COA.PREPAID,
        creditRial,
        unitId: unit._id,
        financialAccountId: account._id,
      });
    }
    await postJournal(ctx, {
      date: args.paymentDate ?? Date.now(),
      description: `دریافت ${paymentNumber} — ${unit.ownerName || unit.tenantName || `واحد ${unit.unitNumber}`}`,
      sourceType: "PAYMENT",
      sourceId: paymentId,
      createdBy: userId,
      entries,
    });

    // notifications for linked users
    for (const uid of [unit.ownerUserId, unit.tenantUserId]) {
      if (uid && uid !== userId) {
        await notify(ctx, uid, "پرداخت ثبت شد", `دریافت ${amount.toLocaleString("en-US")} ریال برای واحد ${unit.unitNumber} ثبت شد.`, "PAYMENT");
      }
    }

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.PAYMENT,
      entity: "payments",
      entityId: paymentId,
      after: { paymentNumber, unitId: unit._id, amountRial: amount, creditRial },
    });

    return { paymentId, paymentNumber, allocatedRial, creditRial };
  },
});

/* ---------- expense payments ---------- */

export const recordExpensePayment = mutation({
  args: {
    expenseId: v.id("expenses"),
    amountRial: v.number(),
    method: methodValidator,
    paymentDate: v.optional(v.number()),
    referenceNumber: v.optional(v.string()),
    cashAccountId: v.optional(v.id("cashAccounts")),
    bankAccountId: v.optional(v.id("bankAccounts")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const amount = normalizeRialAmount(args.amountRial, "مبلغ پرداخت هزینه");
    if (amount <= 0) throw financialError("INVALID_AMOUNT", "مبلغ پرداخت باید بزرگ‌تر از صفر باشد.");
    if ((args.cashAccountId ? 1 : 0) + (args.bankAccountId ? 1 : 0) !== 1) {
      throw financialError("INVALID_ALLOCATION", "صندوق یا حساب بانکی را انتخاب کنید.");
    }
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw financialError("NOT_FOUND", "هزینه یافت نشد.");
    if (expense.remainingRial <= 0) {
      throw financialError("EXPENSE_PAID", "این هزینه قبلاً تسویه شده است.");
    }
    if (amount > expense.remainingRial) {
      throw financialError("INVALID_AMOUNT", "مبلغ پرداخت از مانده هزینه بیشتر است.");
    }

    const paymentNumber = await nextFinancialNumber(ctx, "PAY");
    const paymentId = await ctx.db.insert("payments", {
      paymentNumber,
      kind: "EXPENSE_PAYMENT",
      payer: expense.vendor ?? "مجتمع",
      unitId: undefined,
      financialAccountId: undefined,
      expenseId: expense._id,
      amountRial: amount,
      method: args.method,
      paymentDate: args.paymentDate ?? Date.now(),
      referenceNumber: args.referenceNumber,
      status: "COMPLETED",
      allocatedRial: amount,
      creditRial: 0,
      cashAccountId: args.cashAccountId,
      bankAccountId: args.bankAccountId,
      createdBy: userId,
    });

    const paidRial = expense.paidRial + amount;
    const remainingRial = expense.amountRial - paidRial;
    await ctx.db.patch(expense._id, {
      paidRial,
      remainingRial,
      status: remainingRial <= 0 ? "PAID" : "PARTIALLY_PAID",
    });

    const entries: Parameters<typeof postJournal>[1]["entries"] = [
      { accountCode: COA.PAYABLE, debitRial: amount },
    ];
    if (args.cashAccountId) entries.push({ accountCode: COA.CASH, creditRial: amount, cashAccountId: args.cashAccountId });
    if (args.bankAccountId) entries.push({ accountCode: COA.BANK, creditRial: amount, bankAccountId: args.bankAccountId });
    await postJournal(ctx, {
      date: args.paymentDate ?? Date.now(),
      description: `پرداخت هزینه ${expense.expenseNumber} — ${expense.title}`,
      sourceType: "PAYMENT",
      sourceId: paymentId,
      createdBy: userId,
      entries,
    });

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.PAYMENT,
      entity: "payments",
      entityId: paymentId,
      after: { paymentNumber, expenseId: expense._id, amountRial: amount },
    });
    return { paymentId, paymentNumber };
  },
});

/* ---------- void a payment (full reversal, never delete) ---------- */

export const voidPayment = mutation({
  args: { paymentId: v.id("payments"), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw financialError("NOT_FOUND", "پرداخت یافت نشد.");
    if (payment.status === "VOID") {
      throw financialError("ALREADY_VOID", "پرداخت قبلاً باطل شده است.");
    }

    if (payment.kind === "UNIT_PAYMENT") {
      const allocations = await ctx.db
        .query("paymentAllocations")
        .withIndex("by_payment", (q) => q.eq("paymentId", payment._id))
        .collect();
      for (const alloc of allocations) {
        await refreshInvoiceStatus(ctx, alloc.invoiceId);
      }
    } else if (payment.expenseId) {
      const expense = await ctx.db.get(payment.expenseId);
      if (expense) {
        const paidRial = Math.max(expense.paidRial - payment.amountRial, 0);
        await ctx.db.patch(expense._id, {
          paidRial,
          remainingRial: expense.amountRial - paidRial,
          status: paidRial <= 0 ? "UNPAID" : "PARTIALLY_PAID",
        });
      }
    }

    const journal = await ctx.db
      .query("journal")
      .withIndex("by_source", (q) => q.eq("sourceType", "PAYMENT").eq("sourceId", payment._id))
      .first();
    if (journal) {
      await voidJournal(ctx, journal._id, userId, `باطل‌کردن پرداخت ${payment.paymentNumber}: ${args.reason}`);
    }

    await ctx.db.patch(payment._id, { status: "VOID" });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.REVERSAL,
      entity: "payments",
      entityId: payment._id,
      before: { status: "COMPLETED" },
      after: { status: "VOID" },
      reason: args.reason,
    });
  },
});

/* ---------- refunds ---------- */

export const recordRefund = mutation({
  args: {
    unitId: v.id("units"),
    amountRial: v.number(),
    reason: v.string(),
    refundDate: v.optional(v.number()),
    method: methodValidator,
    referenceNumber: v.optional(v.string()),
    cashAccountId: v.optional(v.id("cashAccounts")),
    bankAccountId: v.optional(v.id("bankAccounts")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const amount = normalizeRialAmount(args.amountRial, "مبلغ برگشت");
    if (amount <= 0) throw financialError("INVALID_AMOUNT", "مبلغ برگشت باید بزرگ‌تر از صفر باشد.");
    if ((args.cashAccountId ? 1 : 0) + (args.bankAccountId ? 1 : 0) !== 1) {
      throw financialError("INVALID_ALLOCATION", "صندوق یا حساب بانکی را انتخاب کنید.");
    }
    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw financialError("NOT_FOUND", "واحد یافت نشد.");
    const account = await ctx.db.get(unit.financialAccountId);
    if (!account) throw financialError("NOT_FOUND", "حساب مالی واحد یافت نشد.");
    if (account.creditRial < amount) {
      throw financialError(
        "INSUFFICIENT_BALANCE",
        `بستانکاری واحد ${unit.unitNumber} (${account.creditRial.toLocaleString("en-US")} ریال) کمتر از مبلغ برگشت است.`,
      );
    }

    const refundNumber = await nextFinancialNumber(ctx, "RFS");
    const refundId = await ctx.db.insert("refunds", {
      refundNumber,
      unitId: unit._id,
      financialAccountId: account._id,
      amountRial: amount,
      refundDate: args.refundDate ?? Date.now(),
      reason: args.reason.trim(),
      approvedBy: userId,
      method: args.method,
      referenceNumber: args.referenceNumber,
      status: "COMPLETED",
      createdBy: userId,
    });

    const entries: Parameters<typeof postJournal>[1]["entries"] = [
      { accountCode: COA.PREPAID, debitRial: amount, unitId: unit._id, financialAccountId: account._id },
    ];
    if (args.cashAccountId) entries.push({ accountCode: COA.CASH, creditRial: amount, cashAccountId: args.cashAccountId });
    if (args.bankAccountId) entries.push({ accountCode: COA.BANK, creditRial: amount, bankAccountId: args.bankAccountId });
    await postJournal(ctx, {
      date: args.refundDate ?? Date.now(),
      description: `برگشت وجه به واحد ${unit.unitNumber} — ${refundNumber}`,
      sourceType: "REFUND",
      sourceId: refundId,
      createdBy: userId,
      entries,
    });

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.REFUND,
      entity: "refunds",
      entityId: refundId,
      after: { refundNumber, unitId: unit._id, amountRial: amount, reason: args.reason },
    });
    return { refundId, refundNumber };
  },
});

/* ---------- listings ---------- */

export const listPayments = query({
  args: {
    unitId: v.optional(v.id("units")),
    kind: v.optional(v.union(v.literal("UNIT_PAYMENT"), v.literal("EXPENSE_PAYMENT"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authed = await requireUser(ctx);
    let payments: Doc<"payments">[];
    if (args.unitId) {
      payments = await ctx.db
        .query("payments")
        .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
        .order("desc")
        .take(args.limit ?? 100);
    } else {
      payments = await ctx.db.query("payments").order("desc").take(args.limit ?? 200);
    }
    const staff =
      authed.role === ROLES.SUPER_ADMIN || authed.role === ROLES.ACCOUNTANT || authed.role === ROLES.BOARD_MEMBER;
    if (!staff) {
      const owned = new Set<string>();
      const units = await ctx.db.query("units").collect();
      for (const u of units) {
        if (u.ownerUserId === authed.userId || u.tenantUserId === authed.userId) owned.add(u._id);
      }
      payments = payments.filter((p) => p.unitId && owned.has(p.unitId));
    }
    const filtered = payments.filter((p) => (args.kind ? p.kind === args.kind : true));

    const out: Array<Doc<"payments"> & { unit?: Doc<"units">; expense?: Doc<"expenses">; allocations?: Doc<"paymentAllocations">[] }> = [];
    for (const p of filtered) {
      const unit = p.unitId ? await ctx.db.get(p.unitId) : undefined;
      const expense = p.expenseId ? await ctx.db.get(p.expenseId) : undefined;
      const allocations = await ctx.db
        .query("paymentAllocations")
        .withIndex("by_payment", (q) => q.eq("paymentId", p._id))
        .collect();
      out.push({ ...p, unit: unit ?? undefined, expense: expense ?? undefined, allocations });
    }
    return out;
  },
});