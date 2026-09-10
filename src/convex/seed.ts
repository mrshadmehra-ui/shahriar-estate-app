/**
 * Seed data — idempotent, never overwrites existing data.
 * Seeds: default Chart of Accounts, current fiscal period, treasury accounts,
 * the demo building with units, and default charge rules.
 * Runs only when the corresponding tables are empty.
 */
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { recordAudit, ACTIONS } from "./audit";
import { createUnitFinancialAccount } from "./accounting/accounts";
import { requireAccounting } from "./lib/security";

const COA: Array<{ code: string; name: string; type: "asset" | "liability" | "income" | "expense" | "equity"; parentCode?: string }> = [
  { code: "1", name: "دارایی‌ها", type: "asset" },
  { code: "1-01", name: "صندوق", type: "asset", parentCode: "1" },
  { code: "1-02", name: "بانک", type: "asset", parentCode: "1" },
  { code: "1-04", name: "حساب‌های دریافتنی واحدها", type: "asset", parentCode: "1" },
  { code: "1-05", name: "صندوق‌های تخصصی", type: "asset", parentCode: "1" },
  { code: "2", name: "بدهی‌ها", type: "liability" },
  { code: "2-01", name: "بدهی به پیمانکاران و فروشندگان", type: "liability", parentCode: "2" },
  { code: "2-02", name: "سایر بدهی‌ها", type: "liability", parentCode: "2" },
  { code: "2-03", name: "بستانکاری (پیش‌پرداخت) واحدها", type: "liability", parentCode: "2" },
  { code: "3", name: "درآمدها", type: "income" },
  { code: "3-01", name: "درآمد شارژ", type: "income", parentCode: "3" },
  { code: "3-02", name: "درآمد اجاره مشاعات", type: "income", parentCode: "3" },
  { code: "3-03", name: "درآمد پارکینگ", type: "income", parentCode: "3" },
  { code: "3-04", name: "سایر درآمدها", type: "income", parentCode: "3" },
  { code: "3-05", name: "درآمد جریمه دیرکرد", type: "income", parentCode: "3" },
  { code: "4", name: "هزینه‌ها", type: "expense" },
  { code: "4-01", name: "برق", type: "expense", parentCode: "4" },
  { code: "4-02", name: "آب", type: "expense", parentCode: "4" },
  { code: "4-03", name: "گاز", type: "expense", parentCode: "4" },
  { code: "4-04", name: "نگهبانی", type: "expense", parentCode: "4" },
  { code: "4-05", name: "نظافت", type: "expense", parentCode: "4" },
  { code: "4-06", name: "تعمیرات", type: "expense", parentCode: "4" },
  { code: "4-07", name: "آسانسور", type: "expense", parentCode: "4" },
  { code: "4-08", name: "سرمایش", type: "expense", parentCode: "4" },
  { code: "4-09", name: "گرمایش", type: "expense", parentCode: "4" },
  { code: "4-10", name: "بیمه", type: "expense", parentCode: "4" },
  { code: "4-11", name: "حقوق", type: "expense", parentCode: "4" },
  { code: "4-12", name: "سایر هزینه‌ها", type: "expense", parentCode: "4" },
  { code: "5", name: "سرمایه / مانده افتتاحیه", type: "equity" },
  { code: "5-01", name: "مانده افتتاحیه (سرمایه)", type: "equity", parentCode: "5" },
];

/** Jalali 1405 start/end (2026-03-21 -> 2027-03-20). */
const J1405_START = new Date(2026, 2, 21).getTime();
const J1405_END = new Date(2027, 2, 20, 23, 59, 59).getTime();

export const seedDefaults = mutation({
  args: { withDemo: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { userId } = await requireAccounting(ctx);
    const withDemo = args.withDemo ?? true;
    const report: Record<string, number> = {};

    // 1. Chart of accounts
    const coaCount = (await ctx.db.query("chartOfAccounts").collect()).length;
    // Penalty income account (3-05) is inserted even when the rest of the COA
    // already exists — old deployments seeded without it.
    const penaltyIncome = await ctx.db
      .query("chartOfAccounts")
      .withIndex("by_code", (q) => q.eq("code", "3-05"))
      .first();
    if (!penaltyIncome) {
      await ctx.db.insert("chartOfAccounts", {
        code: "3-05",
        name: "درآمد جریمه دیرکرد",
        type: "income",
        parentCode: "3",
        isActive: true,
        isSystem: true,
      });
      report.penaltyIncome = 1;
    } else {
      report.penaltyIncome = 0;
    }
    if (coaCount === 0) {
      for (const c of COA) {
        await ctx.db.insert("chartOfAccounts", {
          code: c.code,
          name: c.name,
          type: c.type,
          parentCode: c.parentCode,
          isActive: true,
          isSystem: true,
        });
      }
      report.coa = COA.length;
    } else {
      report.coa = 0;
    }

    // 2. Fiscal period 1405
    const periods = await ctx.db.query("fiscalPeriods").collect();
    if (periods.length === 0) {
      await ctx.db.insert("fiscalPeriods", {
        name: "سال مالی ۱۴۰۵",
        year: 1405,
        startDate: J1405_START,
        endDate: J1405_END,
        status: "OPEN",
        openedBy: userId,
      });
      report.fiscalPeriod = 1;
    } else {
      report.fiscalPeriod = 0;
    }

    // 3. Treasury
    const cash = await ctx.db.query("cashAccounts").collect();
    if (cash.length === 0) {
      await ctx.db.insert("cashAccounts", { name: "صندوق اصلی", balanceRial: 0, isActive: true, description: "دریافت‌ها و پرداخت‌های نقدی مجتمع" });
      await ctx.db.insert("cashAccounts", { name: "تنخواه", balanceRial: 0, isActive: true, description: "هزینه‌های جزیی روزانه" });
      report.cash = 2;
    } else {
      report.cash = 0;
    }
    const banks = await ctx.db.query("bankAccounts").collect();
    if (banks.length === 0) {
      await ctx.db.insert("bankAccounts", {
        bankName: "بانک ملت",
        accountNumber: "0100000000001",
        ownerName: "مجتمع تجاری اداری شهریار",
        openingBalanceRial: 0,
        balanceRial: 0,
        isActive: true,
      });
      report.banks = 1;
    } else {
      report.banks = 0;
    }
    const funds = await ctx.db.query("funds").collect();
    if (funds.length === 0) {
      await ctx.db.insert("funds", { name: "صندوق جاری", description: "امور جاری مجتمع", balanceRial: 0, isActive: true });
      await ctx.db.insert("funds", { name: "صندوق تعمیرات", description: "هزینه‌های تعمیر و نگهداری", balanceRial: 0, isActive: true });
      report.funds = 2;
    } else {
      report.funds = 0;
    }

    // 4. Charge rules
    const rules = await ctx.db.query("chargeRules").collect();
    if (rules.length === 0) {
      await ctx.db.insert("chargeRules", {
        name: "شارژ ماهانه",
        chargeType: "monthly",
        categoryCode: "3-01",
        baseRial: 2_000_000,
        ratePerM2Rial: 0,
        parkingRateRial: 0,
        isActive: true,
        description: "شارژ ثابت ماهانه همه واحدها",
      });
      await ctx.db.insert("chargeRules", {
        name: "شارژ متراژی اداری",
        chargeType: "area",
        categoryCode: "3-01",
        baseRial: 0,
        ratePerM2Rial: 15_000,
        parkingRateRial: 0,
        appliesToUsage: "اداری",
        isActive: true,
        description: "۱۵٬۰۰۰ تومان به ازای هر متر مربع",
      });
      await ctx.db.insert("chargeRules", {
        name: "شارژ پارکینگ",
        chargeType: "parking",
        categoryCode: "3-03",
        baseRial: 0,
        ratePerM2Rial: 0,
        parkingRateRial: 500_000,
        isActive: true,
        description: "۵۰۰٬۰۰۰ تومان به ازای هر پارکینگ",
      });
      report.rules = 3;
    } else {
      report.rules = 0;
    }

    // 5. Demo building + units (only with withDemo)
    const buildings = await ctx.db.query("buildings").collect();
    if (withDemo && buildings.length === 0) {
      const buildingId = await ctx.db.insert("buildings", {
        name: "مجتمع تجاری اداری شهریار",
        address: "شهریار، روبروی شهرک اداری",
        floors: 5,
        phone: "021-00000000",
        description: "مجتمع نمونه — واحدهای نمایشی",
        isActive: true,
      });
      report.building = 1;

      const demoUnits: Array<{
        unitNumber: string; floor: number; areaM2: number; usage: "تجاری" | "اداری" | "مسکونی";
        ownerName: string; tenantName?: string; parkingSlots: number;
      }> = [
        { unitNumber: "101", floor: 1, areaM2: 45, usage: "تجاری", ownerName: "محمد رضایی", parkingSlots: 1 },
        { unitNumber: "102", floor: 1, areaM2: 60, usage: "تجاری", ownerName: "علی کریمی", parkingSlots: 1 },
        { unitNumber: "103", floor: 1, areaM2: 40, usage: "تجاری", ownerName: "زهرا احمدی", parkingSlots: 1 },
        { unitNumber: "201", floor: 2, areaM2: 80, usage: "اداری", ownerName: "شرکت آریا", tenantName: "دفتر مهندسی آریا", parkingSlots: 2 },
        { unitNumber: "202", floor: 2, areaM2: 65, usage: "اداری", ownerName: "حسین موسوی", tenantName: "آژانس مسافرتی سفر", parkingSlots: 1 },
        { unitNumber: "301", floor: 3, areaM2: 90, usage: "اداری", ownerName: "شرکت پارس", tenantName: "دفتر فنی پارس", parkingSlots: 2 },
        { unitNumber: "302", floor: 3, areaM2: 55, usage: "اداری", ownerName: "فاطمه حسینی", parkingSlots: 1 },
        { unitNumber: "401", floor: 4, areaM2: 70, usage: "اداری", ownerName: "رضا قاسمی", parkingSlots: 1 },
        { unitNumber: "402", floor: 4, areaM2: 85, usage: "اداری", ownerName: "مهندسین مشاور برج", parkingSlots: 2 },
        { unitNumber: "501", floor: 5, areaM2: 50, usage: "مسکونی", ownerName: "مریم نادری", parkingSlots: 1 },
      ];
      let seededUnits = 0;
      for (const du of demoUnits) {
        const faId = await createUnitFinancialAccount(ctx, { unitNumber: du.unitNumber });
        const unitId = await ctx.db.insert("units", {
          buildingId,
          unitNumber: du.unitNumber,
          floor: du.floor,
          areaM2: du.areaM2,
          usage: du.usage,
          ownerName: du.ownerName,
          tenantName: du.tenantName,
          parkingSlots: du.parkingSlots,
          storageSlots: 0,
          isActive: true,
          financialAccountId: faId,
        });
        await ctx.db.patch(faId, { unitId });
        seededUnits += 1;
      }
      report.units = seededUnits;
    } else {
      report.building = 0;
      report.units = 0;
    }

    await recordAudit(ctx, {
      userId,
      action: ACTIONS.CREATE,
      entity: "seed",
      entityId: "defaults",
      after: report,
    });
    return report;
  },
});