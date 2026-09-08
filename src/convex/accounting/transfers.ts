/**
 * Accounting — transfers (bank -> cash, cash -> bank, bank A -> bank B, …).
 * A transfer is a zero-sum double-entry: DR target / CR source.
 * The cached balances of both accounts are updated by the journal engine.
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { normalizeRialAmount } from "../../lib/money";
import { recordAudit, ACTIONS } from "../audit";
import { postJournal } from "../lib/ledger";
import { nextFinancialNumber } from "../lib/seq";
import { financialError, requireAccounting, requireFinanceViewer } from "../lib/security";

const ACCOUNT_TYPE_CODES = { CASH: "1-01", BANK: "1-02", FUND: "1-05" } as const;

export const createTransfer = mutation({
  args: {
    fromType: v.union(v.literal("CASH"), v.literal("BANK"), v.literal("FUND")),
    fromId: v.string(),
    toType: v.union(v.literal("CASH"), v.literal("BANK"), v.literal("FUND")),
    toId: v.string(),
    amountRial: v.number(),
    transferDate: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const amount = normalizeRialAmount(args.amountRial, "مبلغ انتقال");
    if (amount <= 0) throw financialError("INVALID_AMOUNT", "مبلغ انتقال باید بزرگ‌تر از صفر باشد.");
    if (args.fromType === args.toType && args.fromId === args.toId) {
      throw financialError("INVALID_ALLOCATION", "حساب مبدأ و مقصد یکسان است.");
    }

    const from = await getAccount(ctx, args.fromType, args.fromId);
    const to = await getAccount(ctx, args.toType, args.toId);
    if (!from) throw financialError("NOT_FOUND", "حساب مبدأ یافت نشد.");
    if (!to) throw financialError("NOT_FOUND", "حساب مقصد یافت نشد.");
    if (from.balanceRial < amount) {
      throw financialError(
        "INSUFFICIENT_BALANCE",
        `موجودی مبدأ (${from.balanceRial.toLocaleString("en-US")} ریال) کافی نیست.`,
      );
    }

    const transferNumber = await nextFinancialNumber(ctx, "TRF");
    const transferId = await ctx.db.insert("transfers", {
      transferNumber,
      fromType: args.fromType,
      fromId: args.fromId,
      toType: args.toType,
      toId: args.toId,
      amountRial: amount,
      transferDate: args.transferDate ?? Date.now(),
      description: args.description,
      status: "COMPLETED",
      createdBy: userId,
    });

    const entries: Parameters<typeof postJournal>[1]["entries"] = [
      {
        accountCode: ACCOUNT_TYPE_CODES[args.toType],
        debitRial: amount,
        cashAccountId: args.toType === "CASH" ? (args.toId as Id<"cashAccounts">) : undefined,
        bankAccountId: args.toType === "BANK" ? (args.toId as Id<"bankAccounts">) : undefined,
        fundId: args.toType === "FUND" ? (args.toId as Id<"funds">) : undefined,
      },
      {
        accountCode: ACCOUNT_TYPE_CODES[args.fromType],
        creditRial: amount,
        cashAccountId: args.fromType === "CASH" ? (args.fromId as Id<"cashAccounts">) : undefined,
        bankAccountId: args.fromType === "BANK" ? (args.fromId as Id<"bankAccounts">) : undefined,
        fundId: args.fromType === "FUND" ? (args.fromId as Id<"funds">) : undefined,
      },
    ];
    await postJournal(ctx, {
      date: args.transferDate ?? Date.now(),
      description: `انتقال وجه ${transferNumber}${args.description ? ` — ${args.description}` : ""}`,
      sourceType: "TRANSFER",
      sourceId: transferId,
      createdBy: userId,
      entries,
    });

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "transfers",
      entityId: transferId,
      after: { transferNumber, fromType: args.fromType, toType: args.toType, amountRial: amount },
    });
    return { transferId, transferNumber };
  },
});

async function getAccount(
  ctx: { db: import("../_generated/server").QueryCtx["db"] },
  type: "CASH" | "BANK" | "FUND",
  id: string,
): Promise<Doc<"cashAccounts"> | Doc<"bankAccounts"> | Doc<"funds"> | null> {
  if (type === "CASH") return (await ctx.db.get(id as Id<"cashAccounts">)) ?? null;
  if (type === "BANK") return (await ctx.db.get(id as Id<"bankAccounts">)) ?? null;
  return (await ctx.db.get(id as Id<"funds">)) ?? null;
}

function accountLabel(account: Doc<"cashAccounts"> | Doc<"bankAccounts"> | Doc<"funds"> | null): string {
  if (!account) return "—";
  if ("bankName" in account) return account.bankName;
  return account.name;
}

export const listTransfers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireFinanceViewer(ctx);
    const transfers = await ctx.db.query("transfers").order("desc").take(args.limit ?? 100);
    const out: Array<Doc<"transfers"> & { fromName?: string; toName?: string }> = [];
    for (const t of transfers) {
      const from = await getAccount(ctx, t.fromType, t.fromId);
      const to = await getAccount(ctx, t.toType, t.toId);
      out.push({
        ...t,
        fromName: accountLabel(from),
        toName: accountLabel(to),
      });
    }
    return out;
  },
});