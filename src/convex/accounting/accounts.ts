/**
 * Accounting — accounts.
 * Chart of Accounts (hierarchical), per-unit FinancialAccounts, and treasury
 * accounts (cash / banks / funds).
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { normalizeRialAmount } from "../../lib/money";
import { recordAudit, ACTIONS } from "../audit";
import { nextSeq } from "../lib/seq";
import {
  financialError,
  requireAccounting,
  requireFinanceViewer,
  requireRole,
} from "../lib/security";
import { ROLES } from "../../lib/roles";

/* ---------- Chart of Accounts ---------- */

export const listChartOfAccounts = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceViewer(ctx);
    return await ctx.db.query("chartOfAccounts").collect();
  },
});

export const createAccount = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("income"),
      v.literal("expense"),
      v.literal("equity"),
    ),
    parentCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const code = args.code.trim();
    const existing = await ctx.db
      .query("chartOfAccounts")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) {
      throw financialError("DUPLICATE", "سرفصل با این کد قبلاً ثبت شده است.");
    }
    const id = await ctx.db.insert("chartOfAccounts", {
      code,
      name: args.name.trim(),
      type: args.type,
      parentCode: args.parentCode,
      isActive: true,
      isSystem: false,
    });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "chartOfAccounts",
      entityId: id,
      after: { code, name: args.name.trim(), type: args.type },
    });
    return id;
  },
});

/* ---------- Financial accounts (per unit) ---------- */

/** Staff: all financial accounts with their unit info. */
export const listFinancialAccounts = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceViewer(ctx);
    const accounts = await ctx.db.query("financialAccounts").collect();
    const out: Array<Doc<"financialAccounts"> & { unit?: Doc<"units"> }> = [];
    for (const account of accounts) {
      const unit = account.unitId ? await ctx.db.get(account.unitId) : undefined;
      out.push({ ...account, unit: unit ?? undefined });
    }
    return out.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
  },
});

/** Create the main financial account of a unit. Called by complex.createUnit. */
export async function createUnitFinancialAccount(
  ctx: MutationCtx,
  args: { unitNumber: string; ownerUserId?: Id<"users"> },
): Promise<Id<"financialAccounts">> {
  const seq = await nextSeq(ctx, "fa");
  const accountNumber = `FA-${String(seq).padStart(6, "0")}`;
  return await ctx.db.insert("financialAccounts", {
    accountNumber,
    name: `حساب مالی واحد ${args.unitNumber}`,
    unitId: undefined,
    ownerUserId: args.ownerUserId,
    type: "unit",
    currency: "IRR",
    isActive: true,
    balanceRial: 0,
    creditRial: 0,
  });
}

/* ---------- Treasury: cash / banks / funds ---------- */

export const listTreasury = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceViewer(ctx);
    const [cash, banks, funds] = await Promise.all([
      ctx.db.query("cashAccounts").collect(),
      ctx.db.query("bankAccounts").collect(),
      ctx.db.query("funds").collect(),
    ]);
    return { cash, banks, funds };
  },
});

export const createCashAccount = mutation({
  args: {
    name: v.string(),
    fundId: v.optional(v.id("funds")),
    description: v.optional(v.string()),
    openingBalanceRial: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const opening = args.openingBalanceRial ? normalizeRialAmount(args.openingBalanceRial) : 0;
    const id = await ctx.db.insert("cashAccounts", {
      name: args.name.trim(),
      fundId: args.fundId,
      balanceRial: opening,
      isActive: true,
      description: args.description,
    });
    if (opening > 0) {
      // Opening balance: DR cash / CR opening equity (5-01)
      const journalId = await ctx.db.insert("journal", {
        date: Date.now(),
        description: `مانده اولیه صندوق «${args.name.trim()}»`,
        reference: `OPEN-${id.slice(-8)}`,
        sourceType: "OPENING_BALANCE",
        sourceId: id,
        createdBy: userId,
        isReversal: false,
        status: "POSTED",
      });
      await ctx.db.insert("journalEntries", {
        journalId,
        accountCode: "1-01",
        accountName: "صندوق",
        debitRial: opening,
        creditRial: 0,
        isVoided: false,
        cashAccountId: id,
      });
      await ctx.db.insert("journalEntries", {
        journalId,
        accountCode: "5-01",
        accountName: "مانده افتتاحیه (سرمایه)",
        debitRial: 0,
        creditRial: opening,
        isVoided: false,
      });
    }
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "cashAccounts",
      entityId: id,
      after: { name: args.name.trim(), opening },
    });
    return id;
  },
});

export const createBankAccount = mutation({
  args: {
    bankName: v.string(),
    accountNumber: v.string(),
    iban: v.optional(v.string()),
    cardNumber: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    openingBalanceRial: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const opening = args.openingBalanceRial ? normalizeRialAmount(args.openingBalanceRial) : 0;
    const id = await ctx.db.insert("bankAccounts", {
      bankName: args.bankName.trim(),
      accountNumber: args.accountNumber.trim(),
      iban: args.iban,
      cardNumber: args.cardNumber,
      ownerName: args.ownerName,
      openingBalanceRial: opening,
      balanceRial: opening,
      isActive: true,
    });
    if (opening > 0) {
      const journalId = await ctx.db.insert("journal", {
        date: Date.now(),
        description: `مانده اولیه حساب ${args.bankName.trim()}`,
        reference: `OPEN-${id.slice(-8)}`,
        sourceType: "OPENING_BALANCE",
        sourceId: id,
        createdBy: userId,
        isReversal: false,
        status: "POSTED",
      });
      await ctx.db.insert("journalEntries", {
        journalId,
        accountCode: "1-02",
        accountName: "بانک",
        debitRial: opening,
        creditRial: 0,
        isVoided: false,
        bankAccountId: id,
      });
      await ctx.db.insert("journalEntries", {
        journalId,
        accountCode: "5-01",
        accountName: "مانده افتتاحیه (سرمایه)",
        debitRial: 0,
        creditRial: opening,
        isVoided: false,
      });
    }
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "bankAccounts",
      entityId: id,
      after: { bankName: args.bankName.trim(), opening },
    });
    return id;
  },
});

export const createFund = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const id = await ctx.db.insert("funds", {
      name: args.name.trim(),
      description: args.description,
      balanceRial: 0,
      isActive: true,
    });
    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "funds",
      entityId: id,
      after: { name: args.name.trim() },
    });
    return id;
  },
});