/** Display labels for backend enums. Keep in sync with src/convex modules. */

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  ISSUED: "صادرشده",
  PARTIALLY_PAID: "پرداخت جزئی",
  PAID: "پرداخت‌شده",
  OVERDUE: "معوق",
  CANCELLED: "لغوشده",
  VOID: "باطل‌شده",
};

export const INVOICE_STATUS_TONES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ISSUED: "bg-sky-100 text-sky-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  VOID: "bg-slate-100 text-slate-500 line-through",
};

export const CHARGE_TYPE_LABELS: Record<string, string> = {
  monthly: "شارژ ماهانه",
  fixed: "شارژ ثابت",
  area: "شارژ متراژی",
  parking: "شارژ پارکینگ",
  special: "شارژ اختصاصی",
  general: "شارژ عمومی",
  penalty: "جریمه",
  discount: "تخفیف",
};

export const CHARGE_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار فاکتور",
  INVOICED: "فاکتور شده",
  PAID: "پرداخت‌شده",
  VOID: "باطل‌شده",
};

export const CHARGE_STATUS_TONES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  INVOICED: "bg-sky-100 text-sky-700",
  PAID: "bg-emerald-100 text-emerald-700",
  VOID: "bg-slate-100 text-slate-500 line-through",
};

export const METHOD_LABELS: Record<string, string> = {
  CASH: "نقدی",
  BANK_TRANSFER: "کارت‌به‌کارت / حواله",
  CARD: "کارت",
  POS: "دستگاه پوز",
  ONLINE: "پرداخت آنلاین",
  CHEQUE: "چک",
  OTHER: "سایر",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  UNPAID: "پرداخت‌نشده",
  PARTIALLY_PAID: "پرداخت جزئی",
  PAID: "پرداخت‌شده",
  VOID: "باطل‌شده",
};

export const EXPENSE_STATUS_TONES: Record<string, string> = {
  UNPAID: "bg-rose-100 text-rose-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  VOID: "bg-slate-100 text-slate-500 line-through",
};

export const JOURNAL_SOURCE_LABELS: Record<string, string> = {
  CHARGE: "شارژ",
  INVOICE: "فاکتور",
  PAYMENT: "پرداخت",
  EXPENSE: "هزینه",
  REFUND: "برگشت وجه",
  TRANSFER: "انتقال وجه",
  ADJUSTMENT: "اصلاح",
  OPENING_BALANCE: "مانده اولیه",
  REVERSAL: "برگشت سند",
};

export const FISCAL_STATUS_LABELS: Record<string, string> = {
  OPEN: "باز",
  CLOSED: "بسته",
  LOCKED: "قفل",
};

export const FISCAL_STATUS_TONES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-amber-100 text-amber-700",
  LOCKED: "bg-slate-100 text-slate-500",
};