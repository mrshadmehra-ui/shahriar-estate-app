/**
 * Accounting — reports & analytics.
 * All heavy aggregation runs server-side; the frontend only renders.
 * Receivables and payables are REPORTED here (derived from invoices/expenses)
 * rather than stored as duplicate tables.
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { recordAudit, ACTIONS } from "../audit";
import { integrityCheck, recalcAllBalances } from "../lib/ledger";
import { requireAccounting, requireFinanceViewer, requireUser } from "../lib/security";
import { ROLES } from "../../lib/roles";

const DAY = 24 * 60 * 60 * 1000;

/* ---------- financial dashboard ---------- */

export const financialDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceViewer(ctx);
    const [cash, banks, funds, fas, invoices, payments, expenses] = await Promise.all([
      ctx.db.query("cashAccounts").collect(),
      ctx.db.query("bankAccounts").collect(),
      ctx.db.query("funds").collect(),
      ctx.db.query("financialAccounts").collect(),
      ctx.db.query("invoices").collect(),
      ctx.db.query("payments").collect(),
      ctx.db.query("expenses").collect(),
    ]);

    const now = Date.now();
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthStart = startOfMonth.getTime();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const today = todayStart.getTime();

    const cashTotal = cash.reduce((s, c) => s + c.balanceRial, 0);
    const bankTotal = banks.reduce((s, b) => s + b.balanceRial, 0);
    const fundTotal = funds.reduce((s, f) => s + f.balanceRial, 0);
    const totalReceivable = fas.reduce((s, f) => s + Math.max(f.balanceRial - f.creditRial, 0), 0);
    const totalCredit = fas.reduce((s, f) => s + f.creditRial, 0);

    // income / expense this month from the journal
    const entries = await ctx.db.query("journalEntries").collect();
    let monthIncome = 0;
    let monthExpense = 0;
    const journals = await ctx.db.query("journal").collect();
    const journalDates = new Map(journals.map((j) => [j._id, j.date]));
    for (const e of entries) {
      if (e.isVoided) continue;
      const d = journalDates.get(e.journalId) ?? 0;
      if (d < monthStart) continue;
      if (e.accountCode.startsWith("3-")) monthIncome += e.creditRial - e.debitRial;
      if (e.accountCode.startsWith("4-")) monthExpense += e.debitRial - e.creditRial;
    }

    const paymentsToday = payments
      .filter((p) => p.status === "COMPLETED" && p.paymentDate >= today)
      .reduce((s, p) => s + p.amountRial, 0);
    const expensesToday = payments
      .filter((p) => p.status === "COMPLETED" && p.kind === "EXPENSE_PAYMENT" && p.paymentDate >= today)
      .reduce((s, p) => s + p.amountRial, 0);

    // debtors (top 6)
    const debtorUnits = await Promise.all(
      fas
        .filter((f) => f.balanceRial - f.creditRial > 0 && f.unitId)
        .sort((a, b) => b.balanceRial - b.creditRial - (a.balanceRial - a.creditRial))
        .slice(0, 6)
        .map(async (f) => {
          const unit = f.unitId ? await ctx.db.get(f.unitId) : undefined;
          return { account: f, unit: unit ?? undefined, netBalanceRial: f.balanceRial - f.creditRial };
        }),
    );

    const dueSoon = invoices
      .filter(
        (inv) =>
          inv.remainingRial > 0 &&
          inv.status !== "VOID" &&
          inv.status !== "CANCELLED" &&
          inv.dueDate >= now &&
          inv.dueDate <= now + 7 * DAY,
      )
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 8);
    const overdueCount = invoices.filter(
      (inv) => inv.remainingRial > 0 && inv.status !== "VOID" && inv.status !== "CANCELLED" && inv.dueDate < now,
    ).length;

    const totalExpenseUnpaid = expenses
      .filter((e) => e.status !== "VOID")
      .reduce((s, e) => s + e.remainingRial, 0);

    return {
      cashTotal,
      bankTotal,
      fundTotal,
      treasuryTotal: cashTotal + bankTotal + fundTotal,
      totalReceivable,
      totalCredit,
      monthIncome,
      monthExpense,
      paymentsToday,
      expensesToday,
      totalExpenseUnpaid,
      overdueCount,
      topDebtors: debtorUnits,
      dueSoon,
      unitCount: fas.filter((f) => f.unitId).length,
    };
  },
});

/* ---------- unit statement ---------- */

export const unitStatement = query({
  args: {
    unitId: v.id("units"),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authed = await requireUser(ctx);
    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw new Error("واحد یافت نشد.");
    const staff =
      authed.role === ROLES.SUPER_ADMIN || authed.role === ROLES.ACCOUNTANT || authed.role === ROLES.BOARD_MEMBER;
    if (!staff && unit.ownerUserId !== authed.userId && unit.tenantUserId !== authed.userId) {
      throw new Error("شما به این واحد دسترسی ندارید.");
    }
    const account = await ctx.db.get(unit.financialAccountId);
    if (!account) throw new Error("حساب مالی واحد یافت نشد.");

    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_financialAccount", (q) => q.eq("financialAccountId", account._id))
      .collect();
    const journals = new Map<string, Doc<"journal">>();
    for (const e of entries) {
      if (!journals.has(e.journalId)) {
        const j = await ctx.db.get(e.journalId);
        if (j) journals.set(e.journalId, j);
      }
    }

    const rows: Array<{
      entryId: string;
      date: number;
      reference: string;
      description: string;
      sourceType: string;
      accountCode: string;
      accountName: string;
      debitRial: number;
      creditRial: number;
      balanceRial: number;
    }> = entries
      .filter((e) => {
        if (e.isVoided) return false;
        const jDate = journals.get(e.journalId)?.date ?? 0;
        if (args.from !== undefined && jDate < args.from) return false;
        if (args.to !== undefined && jDate > args.to) return false;
        return true;
      })
      .map((e) => {
        const j = journals.get(e.journalId);
        return {
          entryId: e._id,
          date: j?.date ?? 0,
          reference: j?.reference ?? "",
          description: j?.description ?? "",
          sourceType: j?.sourceType ?? "ADJUSTMENT",
          accountCode: e.accountCode,
          accountName: e.accountName,
          debitRial: e.debitRial,
          creditRial: e.creditRial,
          balanceRial: 0,
        };
      })
      .sort((a, b) => a.date - b.date);

    let running = 0;
    for (const r of rows) {
      running += r.debitRial - r.creditRial;
      r.balanceRial = running;
    }

    const invoices = (await ctx.db.query("invoices").collect())
      .filter((inv) => inv.unitId === unit._id)
      .sort((a, b) => b.issueDate - a.issueDate);
    const charges = (await ctx.db.query("charges").collect())
      .filter((c) => c.unitId === unit._id && c.status !== "VOID")
      .sort((a, b) => b.periodYear - a.periodYear || (b.periodMonth ?? 0) - (a.periodMonth ?? 0));
    const payments = (await ctx.db.query("payments").collect())
      .filter((p) => p.unitId === unit._id && p.status === "COMPLETED")
      .sort((a, b) => b.paymentDate - a.paymentDate);

    return {
      unit,
      account,
      statement: rows,
      balanceRial: account.balanceRial,
      creditRial: account.creditRial,
      netBalanceRial: account.balanceRial - account.creditRial,
      invoices,
      charges,
      payments,
    };
  },
});

/* ---------- debtors ---------- */

export const debtorsReport = query({
  args: {
    bucket: v.optional(v.union(v.literal("all"), v.literal("1m"), v.literal("3m"), v.literal("6m"))),
    sortBy: v.optional(v.union(v.literal("amount"), v.literal("age"))),
    /** Only count invoices with issueDate >= from as the debt basis. */
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const fas = await ctx.db.query("financialAccounts").collect();
    let invoices = await ctx.db.query("invoices").collect();
    if (args.from !== undefined) invoices = invoices.filter((i) => i.issueDate >= args.from!);
    if (args.to !== undefined) invoices = invoices.filter((i) => i.issueDate <= args.to!);
    const now = Date.now();

    const rows = [];
    for (const fa of fas) {
      if (!fa.unitId || fa.balanceRial - fa.creditRial <= 0) continue;
      const unit = await ctx.db.get(fa.unitId);
      const unpaidInvoices = invoices.filter(
        (inv) => inv.unitId === fa.unitId && inv.remainingRial > 0 && inv.status !== "VOID" && inv.status !== "CANCELLED",
      );
      const oldestDue = unpaidInvoices.length > 0 ? Math.min(...unpaidInvoices.map((i) => i.dueDate)) : now;
      const ageDays = Math.max(Math.floor((now - oldestDue) / DAY), 0);
      const bucket = args.bucket ?? "all";
      if (bucket === "1m" && ageDays < 30) continue;
      if (bucket === "3m" && ageDays < 90) continue;
      if (bucket === "6m" && ageDays < 180) continue;
      rows.push({
        unit: unit ?? undefined,
        accountNumber: fa.accountNumber,
        netBalanceRial: fa.balanceRial - fa.creditRial,
        balanceRial: fa.balanceRial,
        creditRial: fa.creditRial,
        oldestDueDate: unpaidInvoices.length > 0 ? oldestDue : undefined,
        ageDays,
        unpaidInvoiceCount: unpaidInvoices.length,
      });
    }
    rows.sort((a, b) =>
      args.sortBy === "age"
        ? b.ageDays - a.ageDays
        : b.netBalanceRial - a.netBalanceRial,
    );
    return rows;
  },
});

/* ---------- income / expense / cashflow ---------- */

export const incomeReport = query({
  args: { from: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const from = args.from ?? 0;
    const to = args.to ?? Date.now();
    const entries = await ctx.db.query("journalEntries").collect();
    const journals = await ctx.db.query("journal").collect();
    const dates = new Map(journals.map((j) => [j._id, j.date]));
    const byCode = new Map<string, { code: string; name: string; debitRial: number; creditRial: number }>();
    for (const e of entries) {
      if (e.isVoided) continue;
      if (!e.accountCode.startsWith("3-")) continue;
      const d = dates.get(e.journalId) ?? 0;
      if (d < from || d > to) continue;
      const row = byCode.get(e.accountCode) ?? {
        code: e.accountCode,
        name: e.accountName,
        debitRial: 0,
        creditRial: 0,
      };
      row.debitRial += e.debitRial;
      row.creditRial += e.creditRial;
      byCode.set(e.accountCode, row);
    }
    const rows = [...byCode.values()]
      .map((r) => ({ ...r, netRial: r.creditRial - r.debitRial }))
      .filter((r) => r.netRial !== 0)
      .sort((a, b) => b.netRial - a.netRial);
    return { rows, totalRial: rows.reduce((s, r) => s + r.netRial, 0) };
  },
});

export const expenseReport = query({
  args: { from: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const from = args.from ?? 0;
    const to = args.to ?? Date.now();
    const entries = await ctx.db.query("journalEntries").collect();
    const journals = await ctx.db.query("journal").collect();
    const dates = new Map(journals.map((j) => [j._id, j.date]));
    const byCode = new Map<string, { code: string; name: string; netRial: number }>();
    for (const e of entries) {
      if (e.isVoided) continue;
      if (!e.accountCode.startsWith("4-")) continue;
      const d = dates.get(e.journalId) ?? 0;
      if (d < from || d > to) continue;
      const row = byCode.get(e.accountCode) ?? { code: e.accountCode, name: e.accountName, netRial: 0 };
      row.netRial += e.debitRial - e.creditRial;
      byCode.set(e.accountCode, row);
    }
    const rows = [...byCode.values()].filter((r) => r.netRial !== 0).sort((a, b) => b.netRial - a.netRial);
    return { rows, totalRial: rows.reduce((s, r) => s + r.netRial, 0) };
  },
});

export const cashflowReport = query({
  args: { from: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const from = args.from ?? Date.now() - 30 * DAY;
    const to = args.to ?? Date.now();
    const entries = await ctx.db.query("journalEntries").collect();
    const journals = await ctx.db.query("journal").collect();
    const dates = new Map(journals.map((j) => [j._id, j.date]));
    const byDay = new Map<string, { day: string; inflowRial: number; outflowRial: number }>();
    for (const e of entries) {
      if (e.isVoided) continue;
      if (!e.cashAccountId && !e.bankAccountId) continue;
      const d = dates.get(e.journalId) ?? 0;
      if (d < from || d > to) continue;
      const dayKey = new Date(d).toISOString().slice(0, 10);
      const row = byDay.get(dayKey) ?? { day: dayKey, inflowRial: 0, outflowRial: 0 };
      row.inflowRial += e.debitRial;
      row.outflowRial += e.creditRial;
      byDay.set(dayKey, row);
    }
    const days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
    const inflow = days.reduce((s, d) => s + d.inflowRial, 0);
    const outflow = days.reduce((s, d) => s + d.outflowRial, 0);
    return { days, inflowRial: inflow, outflowRial: outflow, netRial: inflow - outflow };
  },
});

/* ---------- ledger ---------- */

export const ledger = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    accountCode: v.optional(v.string()),
    unitId: v.optional(v.id("units")),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 50;
    let journals = await ctx.db.query("journal").order("desc").take(offset + limit + 20);
    journals = journals.filter((j) => {
      if (args.from !== undefined && j.date < args.from) return false;
      if (args.to !== undefined && j.date > args.to) return false;
      return true;
    });
    const out = [];
    let count = 0;
    for (const j of journals) {
      if (count >= limit) break;
      const entries = await ctx.db
        .query("journalEntries")
        .withIndex("by_journal", (q) => q.eq("journalId", j._id))
        .collect();
      const filtered = entries.filter((e) => {
        if (args.accountCode && e.accountCode !== args.accountCode) return false;
        if (args.unitId && e.unitId !== args.unitId) return false;
        return true;
      });
      if (filtered.length === 0) continue;
      if (count < offset) {
        count += 1;
        continue;
      }
      count += 1;
      out.push({ journal: j, entries: filtered });
    }
    return out;
  },
});

/* ---------- search ---------- */

export const searchFinancial = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const q = args.q.trim().toLowerCase();
    if (q.length < 2) return { invoices: [], payments: [], units: [], expenses: [], charges: [] };

    const [invoices, payments, units, expenses, charges] = await Promise.all([
      ctx.db.query("invoices").collect(),
      ctx.db.query("payments").collect(),
      ctx.db.query("units").collect(),
      ctx.db.query("expenses").collect(),
      ctx.db.query("charges").collect(),
    ]);

    const includes = (s: string | undefined) => s?.toLowerCase().includes(q) ?? false;

    return {
      invoices: invoices
        .filter((i) => includes(i.invoiceNumber))
        .slice(0, 10),
      payments: payments
        .filter((p) => includes(p.paymentNumber) || includes(p.trackingCode) || includes(p.referenceNumber) || includes(p.payer))
        .slice(0, 10),
      units: units
        .filter((u) => includes(u.unitNumber) || includes(u.ownerName) || includes(u.tenantName))
        .slice(0, 10),
      expenses: expenses
        .filter((e) => includes(e.expenseNumber) || includes(e.title) || includes(e.vendor))
        .slice(0, 10),
      charges: charges
        .filter((c) => includes(c.title))
        .slice(0, 10),
    };
  },
});

/* ---------- export feeds (دفتر کل / گزارش عملیات) ---------- */

/**
 * Journals inside a date range with their entries — feeds the Excel/PDF
 * export of the general ledger. Returns up to `max` newest-first (the UI
 * re-sorts to chronological for printing).
 */
export const ledgerExport = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    max: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const from = args.from ?? 0;
    const to = args.to ?? Date.now();
    const cap = args.max ?? 2000;
    const journals = (await ctx.db.query("journal").order("desc").collect())
      .filter((j) => j.date >= from && j.date <= to)
      .slice(0, cap);
    const out = [];
    for (const j of journals) {
      const entries = await ctx.db
        .query("journalEntries")
        .withIndex("by_journal", (q) => q.eq("journalId", j._id))
        .collect();
      out.push({ journal: j, entries });
    }
    return out.reverse(); // chronological
  },
});

/** Audit log inside a date range — feeds the audit-log Excel/PDF export. */
export const auditExport = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    max: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const from = args.from ?? 0;
    const to = args.to ?? Date.now();
    const items = (await ctx.db.query("auditLog").order("desc").collect())
      .filter((a) => {
        const t = a._creationTime;
        return t >= from && t <= to;
      })
      .slice(0, args.max ?? 2000);
    const users = new Map<string, string>();
    for (const item of items) {
      if (!users.has(item.userId)) {
        const u = await ctx.db.get(item.userId);
        users.set(item.userId, u?.name ?? u?.email ?? "کاربر");
      }
    }
    return items.map((item) => ({
      ...item,
      userName: users.get(item.userId) ?? "کاربر",
    }));
  },
});

/* ---------- admin tools ---------- */

export const rebuildBalances = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAccounting(ctx);
    const result = await recalcAllBalances(ctx);
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.ACCOUNTING_ADJUSTMENT,
      entity: "financialAccounts",
      entityId: "all",
      after: result,
    });
    return result;
  },
});

export const runIntegrityCheck = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceViewer(ctx);
    return await integrityCheck(ctx);
  },
});

/* ---------- my financial (owner/tenant) ---------- */

export const myFinancial = query({
  args: {},
  handler: async (ctx) => {
    const authed = await requireUser(ctx);
    const units = (await ctx.db.query("units").collect()).filter(
      (u) => u.ownerUserId === authed.userId || u.tenantUserId === authed.userId,
    );
    const accounts = await ctx.db.query("financialAccounts").collect();
    const invoices = await ctx.db.query("invoices").collect();
    const payments = await ctx.db.query("payments").collect();
    const myUnits = [];
    for (const u of units) {
      const account = accounts.find((a) => a._id === u.financialAccountId);
      myUnits.push({
        unit: u,
        account,
        balanceRial: account?.balanceRial ?? 0,
        creditRial: account?.creditRial ?? 0,
        netBalanceRial: (account?.balanceRial ?? 0) - (account?.creditRial ?? 0),
        invoices: invoices
          .filter((i) => i.unitId === u._id)
          .sort((a, b) => b.issueDate - a.issueDate),
        payments: payments
          .filter((p) => p.unitId === u._id && p.status === "COMPLETED")
          .sort((a, b) => b.paymentDate - a.paymentDate),
      });
    }
    return myUnits;
  },
});

/* ---------- notifications ---------- */

export const myNotifications = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const markNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    for (const item of items) {
      await ctx.db.patch(item._id, { read: true });
    }
  },
});

