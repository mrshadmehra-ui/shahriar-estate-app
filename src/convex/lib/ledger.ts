/**
 * Double-entry accounting engine.
 *
 * RULES ENFORCED HERE (project-wide):
 *   - Every material financial operation posts a Journal (debit == credit).
 *   - Amounts are integers, always in RIAL. No floats, ever.
 *   - The Journal is the source of truth; balances are caches that can be
 *     rebuilt via recalcAllBalances().
 *   - Financial records are never hard-deleted; they are VOIDED.
 *   - All mutations run inside one Convex mutation = one atomic unit of work.
 *
 * Special COA codes the engine relies on (seeded):
 *   1-01 صندوق | 1-02 بانک | 1-04 حسابهای دریافتنی واحدها
 *   2-01 بدهی به پیمانکاران | 2-03 بستانکاری (پیشپرداخت) واحدها
 *   5-01 مانده افتتاحیه
 */
import { currentJalaliYear } from "../../lib/jalali";
import { normalizeRialAmount } from "../../lib/money";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { financialError } from "./security";
import { nextFinancialNumber } from "./seq";

export const COA = {
  CASH: "1-01",
  BANK: "1-02",
  AR: "1-04",
  PAYABLE: "2-01",
  PREPAID: "2-03",
  OPENING_EQUITY: "5-01",
} as const;

export interface JournalEntryInput {
  accountCode: string;
  debitRial?: number;
  creditRial?: number;
  unitId?: Id<"units">;
  financialAccountId?: Id<"financialAccounts">;
  cashAccountId?: Id<"cashAccounts">;
  bankAccountId?: Id<"bankAccounts">;
  fundId?: Id<"funds">;
}

export interface PostJournalArgs {
  date: number;
  description: string;
  sourceType:
    | "CHARGE"
    | "INVOICE"
    | "PAYMENT"
    | "EXPENSE"
    | "REFUND"
    | "TRANSFER"
    | "ADJUSTMENT"
    | "OPENING_BALANCE"
    | "REVERSAL";
  sourceId: string;
  entries: JournalEntryInput[];
  createdBy: Id<"users">;
  fiscalPeriodId?: Id<"fiscalPeriods">;
  isReversal?: boolean;
  reversedJournalId?: Id<"journal">;
  reference?: string;
}

/* ---------- fiscal periods ---------- */

export async function getOpenFiscalPeriod(ctx: QueryCtx | MutationCtx) {
  return ctx.db
    .query("fiscalPeriods")
    .withIndex("by_status", (q) => q.eq("status", "OPEN"))
    .first();
}

export async function assertDateNotInClosedPeriod(ctx: MutationCtx, date: number): Promise<void> {
  const closed = await ctx.db.query("fiscalPeriods").collect();
  for (const period of closed) {
    if (period.status !== "OPEN" && date >= period.startDate && date <= period.endDate) {
      throw new ConvexError({
        code: "FISCAL_PERIOD_CLOSED",
        message: `دوره مالی «${period.name}» بسته شده است؛ ثبت تراکنش در این بازه مجاز نیست.`,
      });
    }
  }
}

export async function findPeriodForDate(
  ctx: QueryCtx | MutationCtx,
  date: number,
): Promise<Doc<"fiscalPeriods"> | undefined> {
  const periods = await ctx.db.query("fiscalPeriods").collect();
  return periods.find((p) => p.status === "OPEN" && date >= p.startDate && date <= p.endDate);
}

/* ---------- posting ---------- */

export async function postJournal(
  ctx: MutationCtx,
  args: PostJournalArgs,
): Promise<Doc<"journal">> {
  if (args.entries.length < 2) {
    throw new ConvexError({
      code: "INVALID_JOURNAL",
      message: "سند حسابداری باید حداقل دو طرفه (بدهکار/بستانکار) باشد.",
    });
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const validated: JournalEntryInput[] = args.entries.map((e) => {
    const debit = e.debitRial === undefined ? 0 : normalizeRialAmount(e.debitRial, "بدهکار");
    const credit = e.creditRial === undefined ? 0 : normalizeRialAmount(e.creditRial, "بستانکار");
    if (debit > 0 && credit > 0) {
      throw new ConvexError({
        code: "INVALID_JOURNAL",
        message: "هر ردیف سند فقط یک طرف (بدهکار یا بستانکار) دارد.",
      });
    }
    if (debit === 0 && credit === 0) {
      throw new ConvexError({
        code: "INVALID_JOURNAL",
        message: "ردیف سند بدون مبلغ ثبت شد.",
      });
    }
    totalDebit += debit;
    totalCredit += credit;
    return { ...e, debitRial: debit, creditRial: credit };
  });

  if (totalDebit !== totalCredit) {
    throw new ConvexError({
      code: "INVALID_JOURNAL",
      message: `سند نامتوازن است: جمع بدهکار (${totalDebit}) با جمع بستانکار (${totalCredit}) برابر نیست.`,
    });
  }

  await assertDateNotInClosedPeriod(ctx, args.date);

  let fiscalPeriodId = args.fiscalPeriodId;
  if (!fiscalPeriodId) {
    const period = await findPeriodForDate(ctx, args.date);
    fiscalPeriodId = period?._id;
  }

  // Resolve account names once.
  const coa = await ctx.db.query("chartOfAccounts").collect();
  const coaMap = new Map(coa.map((c) => [c.code, c.name]));

  const reference = args.reference ?? (await nextFinancialNumber(ctx, "TRX", currentJalaliYear()));
  const journalId = await ctx.db.insert("journal", {
    date: args.date,
    fiscalPeriodId,
    reference,
    description: args.description,
    sourceType: args.sourceType,
    sourceId: args.sourceId,
    createdBy: args.createdBy,
    isReversal: args.isReversal ?? false,
    reversedJournalId: args.reversedJournalId,
    status: "POSTED",
  });

  for (const e of validated) {
    await ctx.db.insert("journalEntries", {
      journalId,
      accountCode: e.accountCode,
      accountName: coaMap.get(e.accountCode) ?? e.accountCode,
      debitRial: e.debitRial ?? 0,
      creditRial: e.creditRial ?? 0,
      isVoided: false,
      unitId: e.unitId,
      financialAccountId: e.financialAccountId,
      cashAccountId: e.cashAccountId,
      bankAccountId: e.bankAccountId,
      fundId: e.fundId,
    });
    await applyBalanceDelta(ctx, e, 1);
  }

  const journal = await ctx.db.get(journalId);
  if (!journal) throw new Error("journal insert failed");
  return journal;
}

/** Apply a signed balance delta to cached balances (dir = +1 post, -1 void). */
async function applyBalanceDelta(ctx: MutationCtx, e: JournalEntryInput, dir: number): Promise<void> {
  const delta = (e.debitRial ?? 0) - (e.creditRial ?? 0);
  if (e.financialAccountId) {
    const fa = await ctx.db.get(e.financialAccountId);
    if (fa) {
      if (e.accountCode === COA.AR) {
        await ctx.db.patch(fa._id, { balanceRial: fa.balanceRial + delta * dir });
      } else if (e.accountCode === COA.PREPAID) {
        await ctx.db.patch(fa._id, { creditRial: fa.creditRial - delta * dir });
      }
    }
  }
  if (e.cashAccountId) {
    const cash = await ctx.db.get(e.cashAccountId);
    if (cash) await ctx.db.patch(cash._id, { balanceRial: cash.balanceRial + delta * dir });
  }
  if (e.bankAccountId) {
    const bank = await ctx.db.get(e.bankAccountId);
    if (bank) await ctx.db.patch(bank._id, { balanceRial: bank.balanceRial + delta * dir });
  }
  if (e.fundId) {
    const fund = await ctx.db.get(e.fundId);
    if (fund) await ctx.db.patch(fund._id, { balanceRial: fund.balanceRial + delta * dir });
  }
}

/* ---------- voiding (no hard deletes) ---------- */

export async function voidJournal(
  ctx: MutationCtx,
  journalId: Id<"journal">,
  userId: Id<"users">,
  reason: string,
): Promise<Doc<"journal">> {
  const journal = await ctx.db.get(journalId);
  if (!journal) throw new ConvexError({ code: "NOT_FOUND", message: "سند یافت نشد." });
  if (journal.status === "VOID") {
    throw new ConvexError({ code: "INVALID_JOURNAL", message: "این سند قبلاً باطل شده است." });
  }
  const entries = await ctx.db
    .query("journalEntries")
    .withIndex("by_journal", (q) => q.eq("journalId", journal._id))
    .collect();
  for (const e of entries) {
    await ctx.db.patch(e._id, { isVoided: true });
    await applyBalanceDelta(
      ctx,
      {
        accountCode: e.accountCode,
        debitRial: e.debitRial,
        creditRial: e.creditRial,
        unitId: e.unitId,
        financialAccountId: e.financialAccountId,
        cashAccountId: e.cashAccountId,
        bankAccountId: e.bankAccountId,
        fundId: e.fundId,
      },
      -1,
    );
  }
  await ctx.db.patch(journal._id, { status: "VOID" });
  return journal;
}

/* ---------- balance rebuild ---------- */

/** Recompute cached balances from non-voided journal entries (admin tool). */
export async function recalcAllBalances(ctx: MutationCtx): Promise<{ accounts: number }> {
  let accounts = 0;

  const fas = await ctx.db.query("financialAccounts").collect();
  for (const fa of fas) {
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_financialAccount", (q) => q.eq("financialAccountId", fa._id))
      .collect();
    let balance = 0;
    let credit = 0;
    for (const e of entries) {
      if (e.isVoided) continue;
      const delta = e.debitRial - e.creditRial;
      if (e.accountCode === COA.AR) balance += delta;
      if (e.accountCode === COA.PREPAID) credit -= delta;
    }
    await ctx.db.patch(fa._id, { balanceRial: balance, creditRial: credit });
    accounts += 1;
  }

  const cashes = await ctx.db.query("cashAccounts").collect();
  for (const c of cashes) {
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_cash", (q) => q.eq("cashAccountId", c._id))
      .collect();
    let balance = 0;
    for (const e of entries) {
      if (!e.isVoided) balance += e.debitRial - e.creditRial;
    }
    await ctx.db.patch(c._id, { balanceRial: balance });
    accounts += 1;
  }

  const banks = await ctx.db.query("bankAccounts").collect();
  for (const b of banks) {
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_bank", (q) => q.eq("bankAccountId", b._id))
      .collect();
    let balance = 0;
    for (const e of entries) {
      if (!e.isVoided) balance += e.debitRial - e.creditRial;
    }
    await ctx.db.patch(b._id, { balanceRial: balance });
    accounts += 1;
  }

  const funds = await ctx.db.query("funds").collect();
  for (const f of funds) {
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_fund", (q) => q.eq("fundId", f._id))
      .collect();
    let balance = 0;
    for (const e of entries) {
      if (!e.isVoided) balance += e.debitRial - e.creditRial;
    }
    await ctx.db.patch(f._id, { balanceRial: balance });
    accounts += 1;
  }

  return { accounts };
}

/* ---------- integrity check ---------- */

export interface IntegrityIssue {
  type: string;
  message: string;
  entityId: string;
}

export async function integrityCheck(ctx: QueryCtx): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  // 1. Every journal must balance.
  const journals = await ctx.db.query("journal").collect();
  for (const j of journals) {
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_journal", (q) => q.eq("journalId", j._id))
      .collect();
    let debit = 0;
    let credit = 0;
    for (const e of entries) {
      debit += e.debitRial;
      credit += e.creditRial;
      if (e.debitRial > 0 && e.creditRial > 0) {
        issues.push({ type: "entry_two_sides", message: `ردیف دوسطحی در سند ${j.reference}`, entityId: e._id });
      }
    }
    if (debit !== credit) {
      issues.push({
        type: "unbalanced_journal",
        message: `سند ${j.reference} نامتوازن است (${debit} ≠ ${credit})`,
        entityId: j._id,
      });
    }
  }

  // 2. Cached balances vs journal.
  const fas = await ctx.db.query("financialAccounts").collect();
  for (const fa of fas) {
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_financialAccount", (q) => q.eq("financialAccountId", fa._id))
      .collect();
    let balance = 0;
    let credit = 0;
    for (const e of entries) {
      if (e.isVoided) continue;
      const delta = e.debitRial - e.creditRial;
      if (e.accountCode === COA.AR) balance += delta;
      if (e.accountCode === COA.PREPAID) credit -= delta;
    }
    if (fa.balanceRial !== balance || fa.creditRial !== credit) {
      issues.push({
        type: "balance_mismatch",
        message: `مانده حساب ${fa.accountNumber} با دفتر کل مغایرت دارد`,
        entityId: fa._id,
      });
    }
  }

  // 3. Invoices: paid vs allocations; totals.
  const invoices = await ctx.db.query("invoices").collect();
  for (const inv of invoices) {
    if (inv.totalRial !== inv.subtotalRial - inv.discountRial + inv.penaltyRial) {
      issues.push({
        type: "invoice_totals",
        message: `جمع فاکتور ${inv.invoiceNumber} ناسازگار است`,
        entityId: inv._id,
      });
    }
    const allocations = await ctx.db
      .query("paymentAllocations")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
      .collect();
    let paid = 0;
    for (const a of allocations) {
      const payment = await ctx.db.get(a.paymentId);
      if (payment && payment.status === "COMPLETED") paid += a.amountRial;
    }
    if (inv.paidRial !== paid) {
      issues.push({
        type: "invoice_paid_mismatch",
        message: `مبلغ پرداختی فاکتور ${inv.invoiceNumber} با تخصیصها مغایرت دارد`,
        entityId: inv._id,
      });
    }
  }

  // 4. Payments: allocated + credit == amount; duplicate references.
  const payments = await ctx.db.query("payments").collect();
  const seenTracking = new Map<string, string>();
  const seenRef = new Map<string, string>();
  for (const p of payments) {
    if (p.status !== "COMPLETED") continue;
    if (p.kind === "UNIT_PAYMENT" && p.allocatedRial + p.creditRial !== p.amountRial) {
      issues.push({
        type: "payment_split",
        message: `پرداخت ${p.paymentNumber}: جمع تخصیص و بستانکاری با مبلغ برابر نیست`,
        entityId: p._id,
      });
    }
    if (p.trackingCode) {
      const prev = seenTracking.get(p.trackingCode);
      if (prev) {
        issues.push({
          type: "duplicate_tracking",
          message: `کد پیگیری تکراری ${p.trackingCode} (${prev} / ${p.paymentNumber})`,
          entityId: p._id,
        });
      } else seenTracking.set(p.trackingCode, p.paymentNumber);
    }
    if (p.referenceNumber) {
      const prev = seenRef.get(p.referenceNumber);
      if (prev) {
        issues.push({
          type: "duplicate_reference",
          message: `شماره مرجع تکراری ${p.referenceNumber} (${prev} / ${p.paymentNumber})`,
          entityId: p._id,
        });
      } else seenRef.set(p.referenceNumber, p.paymentNumber);
    }
  }

  return issues;
}