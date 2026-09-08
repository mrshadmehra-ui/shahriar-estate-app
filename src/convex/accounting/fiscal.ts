/**
 * Accounting — fiscal periods.
 *
 * An OPEN period accepts new journals. Closing it freezes the period: the
 * journal engine (assertDateNotInClosedPeriod) rejects any new transaction
 * dated inside a CLOSED/LOCKED period. Corrections after closing must go
 * through reversals/adjustments, never edits.
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { recordAudit, ACTIONS } from "../audit";
import { financialError, requireRole } from "../lib/security";
import { ROLES } from "../../lib/roles";

export const listFiscalPeriods = query({
  args: {},
  handler: async (ctx) => {
    const periods = await ctx.db.query("fiscalPeriods").collect();
    return periods.sort((a, b) => b.year - a.year);
  },
});

export const openFiscalPeriod = mutation({
  args: {
    name: v.string(),
    year: v.number(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT]);
    if (args.endDate <= args.startDate) {
      throw financialError("INVALID_PERIOD", "تاریخ پایان باید بعد از شروع باشد.");
    }
    const existingOpen = await ctx.db
      .query("fiscalPeriods")
      .withIndex("by_status", (q) => q.eq("status", "OPEN"))
      .first();
    if (existingOpen) {
      throw financialError(
        "FISCAL_PERIOD_OPEN",
        `دوره مالی «${existingOpen.name}» هنوز باز است؛ ابتدا آن را ببندید.`,
      );
    }
    const id = await ctx.db.insert("fiscalPeriods", {
      name: args.name.trim(),
      year: args.year,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "OPEN",
      openedBy: userId,
    });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "fiscalPeriods",
      entityId: id,
      after: { name: args.name.trim(), year: args.year },
    });
    return id;
  },
});

export const closeFiscalPeriod = mutation({
  args: { fiscalPeriodId: v.id("fiscalPeriods") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const period = await ctx.db.get(args.fiscalPeriodId);
    if (!period) throw financialError("NOT_FOUND", "دوره مالی یافت نشد.");
    if (period.status !== "OPEN") {
      throw financialError("FISCAL_PERIOD_CLOSED", "این دوره مالی باز نیست.");
    }

    // Integrity check before closing: any unbalanced journal in this period blocks closing.
    const journalsInPeriod = (await ctx.db.query("journal").collect()).filter(
      (j) => j.fiscalPeriodId === period._id && j.status === "POSTED",
    );
    for (const j of journalsInPeriod) {
      const entries = await ctx.db
        .query("journalEntries")
        .withIndex("by_journal", (q) => q.eq("journalId", j._id))
        .collect();
      let debit = 0;
      let credit = 0;
      for (const e of entries) {
        debit += e.debitRial;
        credit += e.creditRial;
      }
      if (debit !== credit) {
        throw financialError(
          "INVALID_JOURNAL",
          `سند ${j.reference} نامتوازن است؛ قبل از بستن دوره آن را اصلاح کنید.`,
        );
      }
    }

    await ctx.db.patch(period._id, {
      status: "CLOSED",
      closedAt: Date.now(),
      closedBy: userId,
    });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CLOSE_FISCAL_PERIOD,
      entity: "fiscalPeriods",
      entityId: period._id,
      before: { status: "OPEN" },
      after: { status: "CLOSED" },
    });
  },
});

export const lockFiscalPeriod = mutation({
  args: { fiscalPeriodId: v.id("fiscalPeriods") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const period = await ctx.db.get(args.fiscalPeriodId);
    if (!period) throw financialError("NOT_FOUND", "دوره مالی یافت نشد.");
    if (period.status !== "CLOSED") {
      throw financialError("FISCAL_PERIOD_CLOSED", "دوره باید ابتدا بسته شود.");
    }
    await ctx.db.patch(period._id, { status: "LOCKED" });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.UPDATE,
      entity: "fiscalPeriods",
      entityId: period._id,
      before: { status: "CLOSED" },
      after: { status: "LOCKED" },
    });
  },
});