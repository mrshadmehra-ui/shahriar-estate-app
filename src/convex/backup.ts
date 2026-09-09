/**
 * Backup — full JSON snapshot export (super_admin only).
 *
 * Produces a complete, restore-able snapshot of the complex: buildings, units,
 * all accounting tables, journal, audit log, counters and sanitized users
 * (no auth tokens or secrets are ever exported).
 *
 * Export format:
 *   { app, version, exportedAt, data: { <tableName>: Doc[] … } }
 *
 * The frontend downloads this as a JSON file. For very large datasets the
 * response could exceed Convex's result-size limit — for a medium complex
 * (hundreds of units / thousands of journal entries) it stays well within.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { ROLES } from "../lib/roles";
import { requireRole } from "./lib/security";

export const exportBackup = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);

    const data: Record<string, unknown> = {
      buildings: await ctx.db.query("buildings").collect(),
      units: await ctx.db.query("units").collect(),
      financialAccounts: await ctx.db.query("financialAccounts").collect(),
      chartOfAccounts: await ctx.db.query("chartOfAccounts").collect(),
      fiscalPeriods: await ctx.db.query("fiscalPeriods").collect(),
      chargeRules: await ctx.db.query("chargeRules").collect(),
      charges: await ctx.db.query("charges").collect(),
      invoices: await ctx.db.query("invoices").collect(),
      invoiceItems: await ctx.db.query("invoiceItems").collect(),
      payments: await ctx.db.query("payments").collect(),
      paymentAllocations: await ctx.db.query("paymentAllocations").collect(),
      expenses: await ctx.db.query("expenses").collect(),
      cashAccounts: await ctx.db.query("cashAccounts").collect(),
      bankAccounts: await ctx.db.query("bankAccounts").collect(),
      funds: await ctx.db.query("funds").collect(),
      transfers: await ctx.db.query("transfers").collect(),
      refunds: await ctx.db.query("refunds").collect(),
      journal: await ctx.db.query("journal").collect(),
      journalEntries: await ctx.db.query("journalEntries").collect(),
      auditLog: await ctx.db.query("auditLog").collect(),
      notifications: await ctx.db.query("notifications").collect(),
      counters: await ctx.db.query("counters").collect(),
      settings: await ctx.db.query("settings").collect(),
    };

    // Users: sanitized profile only — never auth secrets.
    const users = await ctx.db.query("users").collect();
    data.users = users
      .filter((u) => !u.isAnonymous)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        emailVerificationTime: u.emailVerificationTime,
      }));

    return {
      app: "مجتمع تجاری اداری شهریار",
      version: 1,
      exportedAt: Date.now(),
      data,
    };
  },
});