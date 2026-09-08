/**
 * Accounting — expenses.
 *
 * Registering an expense always books it:
 *   unpaid:  DR دسته هزینه / CR بدهی به پیمانکاران (payable)
 *   paid:    DR دسته هزینه / CR صندوق|بانک
 *   partial: DR دسته هزینه / CR صندوق|بانک (paid part) / CR بدهی به پیمانکاران (rest)
 *
 * Payment of the payable happens through payments.recordExpensePayment.
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { normalizeRialAmount } from "../../lib/money";
import { recordAudit, ACTIONS } from "../audit";
import { postJournal, COA } from "../lib/ledger";
import { nextFinancialNumber } from "../lib/seq";
import { financialError, requireAccounting, requireFinanceViewer } from "../lib/security";

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  UNPAID: "پرداخت‌نشده",
  PARTIALLY_PAID: "پرداخت جزئی",
  PAID: "پرداخت‌شده",
};

export const createExpense = mutation({
  args: {
    title: v.string(),
    categoryCode: v.string(),
    amountRial: v.number(),
    expenseDate: v.optional(v.number()),
    vendor: v.optional(v.string()),
    description: v.optional(v.string()),
    paidAmountRial: v.optional(v.number()),
    cashAccountId: v.optional(v.id("cashAccounts")),
    bankAccountId: v.optional(v.id("bankAccounts")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const amount = normalizeRialAmount(args.amountRial, "مبلغ هزینه");
    if (amount <= 0) throw financialError("INVALID_AMOUNT", "مبلغ هزینه باید بزرگ‌تر از صفر باشد.");
    const paid = args.paidAmountRial ? normalizeRialAmount(args.paidAmountRial, "مبلغ پرداختی") : 0;
    if (paid > amount) {
      throw financialError("INVALID_AMOUNT", "مبلغ پرداختی نمی‌تواند از کل هزینه بیشتر باشد.");
    }
    if (paid > 0 && !args.cashAccountId && !args.bankAccountId) {
      throw financialError("INVALID_ALLOCATION", "برای پرداخت نقدی، صندوق یا بانک را انتخاب کنید.");
    }

    const expenseNumber = await nextFinancialNumber(ctx, "EXP");
    const remaining = amount - paid;
    const expenseId = await ctx.db.insert("expenses", {
      expenseNumber,
      title: args.title.trim(),
      categoryCode: args.categoryCode,
      amountRial: amount,
      expenseDate: args.expenseDate ?? Date.now(),
      vendor: args.vendor,
      description: args.description,
      status: remaining <= 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "UNPAID",
      paidRial: paid,
      remainingRial: remaining,
      createdBy: userId,
    });

    const entries: Parameters<typeof postJournal>[1]["entries"] = [
      { accountCode: args.categoryCode, debitRial: amount },
    ];
    if (paid > 0) {
      if (args.cashAccountId) entries.push({ accountCode: COA.CASH, creditRial: paid, cashAccountId: args.cashAccountId });
      if (args.bankAccountId) entries.push({ accountCode: COA.BANK, creditRial: paid, bankAccountId: args.bankAccountId });
    }
    if (remaining > 0) {
      entries.push({ accountCode: COA.PAYABLE, creditRial: remaining });
    }
    await postJournal(ctx, {
      date: args.expenseDate ?? Date.now(),
      description: args.title.trim(),
      sourceType: "EXPENSE",
      sourceId: expenseId,
      createdBy: userId,
      entries,
    });

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "expenses",
      entityId: expenseId,
      after: { expenseNumber, title: args.title.trim(), amountRial: amount, paidRial: paid },
    });
    return { expenseId, expenseNumber };
  },
});

export const listExpenses = query({
  args: {
    status: v.optional(v.union(v.literal("UNPAID"), v.literal("PARTIALLY_PAID"), v.literal("PAID"), v.literal("VOID"))),
    categoryCode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    let expenses = await ctx.db.query("expenses").order("desc").take(args.limit ?? 200);
    expenses = expenses.filter((e) => {
      if (args.status !== undefined && e.status !== args.status) return false;
      if (args.categoryCode !== undefined && e.categoryCode !== args.categoryCode) return false;
      return true;
    });
    return expenses;
  },
});

export const listExpenseCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceViewer(ctx);
    const coa = await ctx.db.query("chartOfAccounts").collect();
    return coa.filter((c) => c.type === "expense" && c.isActive);
  },
});

/** Void an expense with no payments (reverses its journal). */
export const voidExpense = mutation({
  args: { expenseId: v.id("expenses"), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw financialError("NOT_FOUND", "هزینه یافت نشد.");
    if (expense.paidRial > 0) {
      throw financialError("EXPENSE_PAID", "هزینه دارای پرداخت است؛ ابتدا پرداخت را برگشت بزنید.");
    }
    const journal = await ctx.db
      .query("journal")
      .withIndex("by_source", (q) => q.eq("sourceType", "EXPENSE").eq("sourceId", expense._id))
      .first();
    if (journal && journal.status === "POSTED") {
      // reversal: DR payable / CR expense category
      await postJournal(ctx, {
        date: Date.now(),
        description: `باطل‌کردن هزینه ${expense.expenseNumber} — ${args.reason}`,
        sourceType: "REVERSAL",
        sourceId: expense._id,
        createdBy: userId,
        isReversal: true,
        reversedJournalId: journal._id,
        entries: [
          { accountCode: COA.PAYABLE, debitRial: expense.amountRial },
          { accountCode: expense.categoryCode, creditRial: expense.amountRial },
        ],
      });
    }
    await ctx.db.patch(expense._id, { status: "VOID", remainingRial: 0 });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.VOID,
      entity: "expenses",
      entityId: expense._id,
      before: { status: expense.status },
      after: { status: "VOID" },
      reason: args.reason,
    });
  },
});