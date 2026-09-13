import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ---------------------------------------------------------------------------
// Roles — RBAC for the complex. Legacy values (admin/user/member) are kept in
// the validator so existing documents keep reading; normalizeRole() in
// src/lib/roles.ts maps them onto the new role set.
// ---------------------------------------------------------------------------
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  BOARD_MEMBER: "board_member",
  ACCOUNTANT: "accountant",
  OWNER: "owner",
  TENANT: "tenant",
  GUARD: "guard",
  GHOST: "ghost", // hidden role with full access — invisible to other users
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.SUPER_ADMIN),
  v.literal(ROLES.BOARD_MEMBER),
  v.literal(ROLES.ACCOUNTANT),
  v.literal(ROLES.OWNER),
  v.literal(ROLES.TENANT),
  v.literal(ROLES.GUARD),
  v.literal(ROLES.GHOST),
  // legacy roles from the previous product version
  v.literal("admin"),
  v.literal("user"),
  v.literal("member"),
);
export type Role = Infer<typeof roleValidator>;

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------
export const MONEY_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CARD",
  "POS",
  "ONLINE",
  "CHEQUE",
  "OTHER",
] as const;
export type MoneyMethod = (typeof MONEY_METHODS)[number];

export const CHARGE_TYPES = [
  "monthly",
  "fixed",
  "area",
  "parking",
  "special",
  "general",
  "penalty",
  "discount",
] as const;
export type ChargeType = (typeof CHARGE_TYPES)[number];

export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "VOID",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const USAGES = ["تجاری", "اداری", "مسکونی", "پارکینگ", "انباری"] as const;
export type Usage = (typeof USAGES)[number];

export const ACCOUNT_TYPES = ["asset", "liability", "income", "expense", "equity"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const JOURNAL_SOURCE_TYPES = [
  "CHARGE",
  "INVOICE",
  "PAYMENT",
  "EXPENSE",
  "REFUND",
  "TRANSFER",
  "ADJUSTMENT",
  "OPENING_BALANCE",
  "REVERSAL",
] as const;
export type JournalSourceType = (typeof JOURNAL_SOURCE_TYPES)[number];

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      phone: v.optional(v.string()), // contact phone (owners/tenants)
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // -----------------------------------------------------------------------
    // Pre-existing tables (kept intact; data preserved)
    // -----------------------------------------------------------------------
    consultations: defineTable({
      name: v.string(),
      phone: v.string(),
      requestType: v.optional(v.string()),
      description: v.optional(v.string()),
      transaction: v.optional(
        v.union(v.literal("فروش"), v.literal("اجاره")),
      ),
      category: v.optional(
        v.union(
          v.literal("مسکونی"),
          v.literal("اداری"),
          v.literal("تجاری"),
          v.literal("صنعتی"),
        ),
      ),
      area: v.optional(v.string()),
      budgetValue: v.optional(v.number()),
    }),

    properties: defineTable({
      title: v.string(),
      location: v.string(),
      area: v.string(),
      category: v.union(
        v.literal("مسکونی"),
        v.literal("اداری"),
        v.literal("تجاری"),
        v.literal("صنعتی"),
      ),
      transaction: v.union(v.literal("فروش"), v.literal("اجاره")),
      image: v.string(),
      gallery: v.array(v.string()),
      specs: v.array(v.object({ icon: v.string(), label: v.string() })),
      amenities: v.array(v.string()),
      description: v.string(),
      price: v.optional(v.string()),
      pricePerMeter: v.optional(v.string()),
      priceValue: v.number(),
    })
      .index("by_category", ["category"])
      .index("by_transaction", ["transaction"]),

    // -----------------------------------------------------------------------
    // Complex / buildings / units
    // -----------------------------------------------------------------------
    buildings: defineTable({
      name: v.string(), // e.g. «مجتمع تجاری اداری شهریار»
      address: v.optional(v.string()),
      floors: v.number(),
      phone: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
    }),

    units: defineTable({
      buildingId: v.id("buildings"),
      unitNumber: v.string(), // e.g. "101"
      floor: v.number(),
      areaM2: v.number(),
      usage: v.union(
        v.literal("تجاری"),
        v.literal("اداری"),
        v.literal("مسکونی"),
        v.literal("پارکینگ"),
        v.literal("انباری"),
      ),
      ownerUserId: v.optional(v.id("users")), // linked account when the owner has one
      ownerName: v.optional(v.string()), // display name (always stored)
      ownerPhone: v.optional(v.string()), // contact phone of the owner
      tenantUserId: v.optional(v.id("users")),
      tenantName: v.optional(v.string()),
      tenantPhone: v.optional(v.string()), // contact phone of the tenant
      parkingSlots: v.number(),
      storageSlots: v.number(),
      isActive: v.boolean(),
      notes: v.optional(v.string()),
      financialAccountId: v.id("financialAccounts"), // one main FA per unit
    })
      .index("by_building", ["buildingId"])
      .index("by_owner", ["ownerUserId"])
      .index("by_tenant", ["tenantUserId"])
      .index("by_account", ["financialAccountId"]),

    // -----------------------------------------------------------------------
    // Accounting core
    // -----------------------------------------------------------------------
    /** Main financial account of each unit: FA-000101 … */
    financialAccounts: defineTable({
      accountNumber: v.string(), // unique, e.g. "FA-000101"
      name: v.string(), // e.g. «حساب مالی واحد 101»
      unitId: v.optional(v.id("units")),
      ownerUserId: v.optional(v.id("users")),
      type: v.union(v.literal("unit"), v.literal("general")),
      currency: v.string(), // always "IRR"
      isActive: v.boolean(),
      /** cached net receivable balance (rial). Source of truth = journal entries. */
      balanceRial: v.number(),
      /** cached credit (prepaid/بستانکاری) balance (rial). */
      creditRial: v.number(),
    })
      .index("by_accountNumber", ["accountNumber"])
      .index("by_unit", ["unitId"])
      .index("by_owner", ["ownerUserId"]),

    /** Hierarchical chart of accounts (COA). */
    chartOfAccounts: defineTable({
      code: v.string(), // "1", "1-01", "3-01", …
      name: v.string(), // «داراییها», «درآمد شارژ», …
      type: v.union(
        v.literal("asset"),
        v.literal("liability"),
        v.literal("income"),
        v.literal("expense"),
        v.literal("equity"),
      ),
      parentCode: v.optional(v.string()),
      isActive: v.boolean(),
      isSystem: v.boolean(), // seeded by the system, not user-created
    })
      .index("by_code", ["code"])
      .index("by_parent", ["parentCode"])
      .index("by_type", ["type"]),

    fiscalPeriods: defineTable({
      name: v.string(), // «سال مالی ۱۴۰۵»
      year: v.number(), // Jalali year, used for document numbering
      startDate: v.number(), // epoch ms
      endDate: v.number(), // epoch ms
      status: v.union(v.literal("OPEN"), v.literal("CLOSED"), v.literal("LOCKED")),
      openedBy: v.optional(v.id("users")),
      closedAt: v.optional(v.number()),
      closedBy: v.optional(v.id("users")),
    })
      .index("by_status", ["status"])
      .index("by_year", ["year"]),

    // -----------------------------------------------------------------------
    // Billing: charges -> invoices -> payments -> allocations
    // -----------------------------------------------------------------------
    chargeRules: defineTable({
      name: v.string(), // «شارژ ماهانه», «شارژ پارکینگ», …
      chargeType: v.union(
        v.literal("monthly"),
        v.literal("fixed"),
        v.literal("area"),
        v.literal("parking"),
        v.literal("special"),
        v.literal("general"),
        v.literal("penalty"),
        v.literal("discount"),
      ),
      categoryCode: v.string(), // COA income code, e.g. "3-01"
      baseRial: v.number(), // fixed part
      ratePerM2Rial: v.number(), // area-based part
      parkingRateRial: v.number(), // per parking slot
      appliesToUsage: v.optional(
        v.union(v.literal("تجاری"), v.literal("اداری"), v.literal("مسکونی")),
      ), // restrict to a usage; undefined = all
      isActive: v.boolean(),
      description: v.optional(v.string()),
    }),

    charges: defineTable({
      unitId: v.id("units"),
      financialAccountId: v.id("financialAccounts"),
      title: v.string(), // «شارژ شهریور ۱۴۰۵»
      chargeType: v.union(
        v.literal("monthly"),
        v.literal("fixed"),
        v.literal("area"),
        v.literal("parking"),
        v.literal("special"),
        v.literal("general"),
        v.literal("penalty"),
        v.literal("discount"),
      ),
      periodYear: v.number(), // Jalali year of the period
      periodMonth: v.optional(v.number()), // 1-12
      amountRial: v.number(), // always rial, integer
      categoryCode: v.string(), // income account code
      description: v.optional(v.string()),
      sourceRuleId: v.optional(v.id("chargeRules")),
      /** (unitId|periodYear|periodMonth|chargeType|sourceRuleId) — idempotency guard */
      dedupeKey: v.string(),
      invoiceId: v.optional(v.id("invoices")),
      status: v.union(v.literal("PENDING"), v.literal("INVOICED"), v.literal("PAID"), v.literal("VOID")),
      createdBy: v.id("users"),
    })
      .index("by_unit", ["unitId"])
      .index("by_invoice", ["invoiceId"])
      .index("by_period", ["periodYear", "periodMonth"])
      .index("by_dedupe", ["dedupeKey"])
      .index("by_status", ["status"]),

    invoices: defineTable({
      invoiceNumber: v.string(), // INV-1405-000001
      unitId: v.id("units"),
      financialAccountId: v.id("financialAccounts"),
      fiscalPeriodId: v.optional(v.id("fiscalPeriods")),
      issueDate: v.number(),
      dueDate: v.number(),
      status: v.union(
        v.literal("DRAFT"),
        v.literal("ISSUED"),
        v.literal("PARTIALLY_PAID"),
        v.literal("PAID"),
        v.literal("OVERDUE"),
        v.literal("CANCELLED"),
        v.literal("VOID"),
      ),
      subtotalRial: v.number(),
      discountRial: v.number(),
      penaltyRial: v.number(),
      totalRial: v.number(),
      paidRial: v.number(),
      remainingRial: v.number(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
    })
      .index("by_unit", ["unitId"])
      .index("by_account", ["financialAccountId"])
      .index("by_status", ["status"])
      .index("by_number", ["invoiceNumber"])
      .index("by_dueDate", ["dueDate"]),

    invoiceItems: defineTable({
      invoiceId: v.id("invoices"),
      chargeId: v.optional(v.id("charges")),
      description: v.string(),
      quantity: v.number(),
      unitPriceRial: v.number(),
      amountRial: v.number(),
      categoryCode: v.string(),
    }).index("by_invoice", ["invoiceId"]),

    payments: defineTable({
      paymentNumber: v.string(), // PAY-1405-000001
      /** UNIT_PAYMENT settles unit invoices; EXPENSE_PAYMENT pays an expense. */
      kind: v.union(v.literal("UNIT_PAYMENT"), v.literal("EXPENSE_PAYMENT")),
      payer: v.string(), // who paid (owner/tenant name)
      payerUserId: v.optional(v.id("users")),
      unitId: v.optional(v.id("units")),
      financialAccountId: v.optional(v.id("financialAccounts")),
      expenseId: v.optional(v.id("expenses")),
      amountRial: v.number(),
      method: v.union(
        v.literal("CASH"),
        v.literal("BANK_TRANSFER"),
        v.literal("CARD"),
        v.literal("POS"),
        v.literal("ONLINE"),
        v.literal("CHEQUE"),
        v.literal("OTHER"),
      ),
      paymentDate: v.number(),
      referenceNumber: v.optional(v.string()),
      trackingCode: v.optional(v.string()),
      idempotencyKey: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.union(v.literal("COMPLETED"), v.literal("VOID")),
      allocatedRial: v.number(), // portion settled against invoices
      creditRial: v.number(), // overpayment credited to the unit
      cashAccountId: v.optional(v.id("cashAccounts")),
      bankAccountId: v.optional(v.id("bankAccounts")),
      createdBy: v.id("users"),
    })
      .index("by_unit", ["unitId"])
      .index("by_account", ["financialAccountId"])
      .index("by_date", ["paymentDate"])
      .index("by_tracking", ["trackingCode"])
      .index("by_reference", ["referenceNumber"])
      .index("by_number", ["paymentNumber"]),

    paymentAllocations: defineTable({
      paymentId: v.id("payments"),
      invoiceId: v.id("invoices"),
      amountRial: v.number(),
    })
      .index("by_payment", ["paymentId"])
      .index("by_invoice", ["invoiceId"]),

    // -----------------------------------------------------------------------
    // Expenses / payables
    // -----------------------------------------------------------------------
    expenses: defineTable({
      expenseNumber: v.string(), // EXP-1405-000001
      title: v.string(),
      categoryCode: v.string(), // expense COA code, e.g. "4-01"
      amountRial: v.number(),
      expenseDate: v.number(),
      fiscalPeriodId: v.optional(v.id("fiscalPeriods")),
      vendor: v.optional(v.string()), // پیمانکار / فروشنده
      description: v.optional(v.string()),
      status: v.union(v.literal("UNPAID"), v.literal("PARTIALLY_PAID"), v.literal("PAID"), v.literal("VOID")),
      paidRial: v.number(),
      remainingRial: v.number(),
      createdBy: v.id("users"),
    })
      .index("by_category", ["categoryCode"])
      .index("by_date", ["expenseDate"])
      .index("by_status", ["status"])
      .index("by_vendor", ["vendor"]),

    // -----------------------------------------------------------------------
    // Treasury: cash, banks, funds, transfers
    // -----------------------------------------------------------------------
    cashAccounts: defineTable({
      name: v.string(), // «صندوق اصلی», «تنخواه»
      fundId: v.optional(v.id("funds")),
      balanceRial: v.number(),
      isActive: v.boolean(),
      description: v.optional(v.string()),
    }).index("by_fund", ["fundId"]),

    bankAccounts: defineTable({
      bankName: v.string(),
      accountNumber: v.string(),
      iban: v.optional(v.string()),
      cardNumber: v.optional(v.string()), // masked on display
      ownerName: v.optional(v.string()),
      openingBalanceRial: v.number(),
      balanceRial: v.number(),
      isActive: v.boolean(),
    }),

    funds: defineTable({
      name: v.string(), // «صندوق جاری», «صندوق تعمیرات», …
      description: v.optional(v.string()),
      balanceRial: v.number(),
      isActive: v.boolean(),
    }),

    transfers: defineTable({
      transferNumber: v.string(), // TRF-1405-000001
      fromType: v.union(v.literal("CASH"), v.literal("BANK"), v.literal("FUND")),
      fromId: v.string(), // document id (polymorphic)
      toType: v.union(v.literal("CASH"), v.literal("BANK"), v.literal("FUND")),
      toId: v.string(),
      amountRial: v.number(),
      transferDate: v.number(),
      description: v.optional(v.string()),
      status: v.union(v.literal("COMPLETED"), v.literal("VOID")),
      createdBy: v.id("users"),
    })
      .index("by_date", ["transferDate"])
      .index("by_number", ["transferNumber"]),

    refunds: defineTable({
      refundNumber: v.string(), // RFS-1405-000001
      paymentId: v.optional(v.id("payments")),
      unitId: v.optional(v.id("units")),
      financialAccountId: v.optional(v.id("financialAccounts")),
      amountRial: v.number(),
      refundDate: v.number(),
      reason: v.string(),
      approvedBy: v.optional(v.id("users")),
      method: v.union(
        v.literal("CASH"),
        v.literal("BANK_TRANSFER"),
        v.literal("CARD"),
        v.literal("POS"),
        v.literal("ONLINE"),
        v.literal("CHEQUE"),
        v.literal("OTHER"),
      ),
      referenceNumber: v.optional(v.string()),
      status: v.union(v.literal("COMPLETED"), v.literal("VOID")),
      createdBy: v.id("users"),
    })
      .index("by_unit", ["unitId"])
      .index("by_payment", ["paymentId"])
      .index("by_number", ["refundNumber"]),

    // -----------------------------------------------------------------------
    // Double-entry ledger
    // -----------------------------------------------------------------------
    journal: defineTable({
      date: v.number(), // epoch ms
      fiscalPeriodId: v.optional(v.id("fiscalPeriods")),
      reference: v.string(), // TRX-1405-000001 (unique)
      description: v.string(),
      sourceType: v.union(
        v.literal("CHARGE"),
        v.literal("INVOICE"),
        v.literal("PAYMENT"),
        v.literal("EXPENSE"),
        v.literal("REFUND"),
        v.literal("TRANSFER"),
        v.literal("ADJUSTMENT"),
        v.literal("OPENING_BALANCE"),
        v.literal("REVERSAL"),
      ),
      sourceId: v.string(),
      createdBy: v.id("users"),
      isReversal: v.boolean(),
      reversedJournalId: v.optional(v.id("journal")),
      status: v.union(v.literal("POSTED"), v.literal("VOID")),
    })
      .index("by_date", ["date"])
      .index("by_reference", ["reference"])
      .index("by_source", ["sourceType", "sourceId"])
      .index("by_status", ["status"])
      .index("by_period", ["fiscalPeriodId"]),

    journalEntries: defineTable({
      journalId: v.id("journal"),
      accountCode: v.string(), // COA code
      accountName: v.string(), // denormalized for display
      debitRial: v.number(),
      creditRial: v.number(),
      /** denormalized from journal.status so balance queries are cheap */
      isVoided: v.boolean(),
      unitId: v.optional(v.id("units")),
      financialAccountId: v.optional(v.id("financialAccounts")),
      cashAccountId: v.optional(v.id("cashAccounts")),
      bankAccountId: v.optional(v.id("bankAccounts")),
      fundId: v.optional(v.id("funds")),
    })
      .index("by_journal", ["journalId"])
      .index("by_account", ["accountCode"])
      .index("by_unit", ["unitId"])
      .index("by_financialAccount", ["financialAccountId"])
      .index("by_cash", ["cashAccountId"])
      .index("by_bank", ["bankAccountId"])
      .index("by_fund", ["fundId"]),

    // -----------------------------------------------------------------------
    // Cross-cutting: audit, notifications, sequences, settings
    // -----------------------------------------------------------------------
    auditLog: defineTable({
      userId: v.id("users"),
      action: v.string(), // CREATE | UPDATE | PAYMENT | VOID | REVERSAL | …
      entity: v.string(), // "charges" | "invoices" | …
      entityId: v.string(),
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      reason: v.optional(v.string()),
      ip: v.optional(v.string()),
    })
      .index("by_entity", ["entity", "entityId"])
      .index("by_user", ["userId"])
      .index("by_action", ["action"]),

    notifications: defineTable({
      userId: v.id("users"),
      title: v.string(),
      body: v.string(),
      type: v.union(
        v.literal("CHARGE"),
        v.literal("INVOICE"),
        v.literal("PAYMENT"),
        v.literal("OVERDUE"),
        v.literal("PENALTY"),
        v.literal("EXPENSE"),
        v.literal("SYSTEM"),
      ),
      read: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_read", ["read"]),

    counters: defineTable({
      name: v.string(), // "invoice-1405", "payment-1405", …
      value: v.number(),
    }).index("by_name", ["name"]),

    settings: defineTable({
      key: v.string(), // "penalty_rate_percent", "penalty_grace_days", …
      value: v.any(),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;