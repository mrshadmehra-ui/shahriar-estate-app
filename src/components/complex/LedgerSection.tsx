import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BookOpenCheck, Download, FileSpreadsheet, ListTree, Pencil, Plus, Printer, RefreshCw, ScrollText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatJalali } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { toFa } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { downloadCsv, printHtml } from "@/lib/export";
import { startOfJalaliDay, startOfJalaliMonth, startOfJalaliYear } from "@/lib/jalali";
import { useMoneyPref } from "./money-context";
import { Badge, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { JOURNAL_SOURCE_LABELS } from "./labels";

/* ---------- export (Excel / PDF) of ledger + audit log ---------- */

const SCOPE_OPTIONS = [
  { value: "daily", label: "روزانه (امروز)" },
  { value: "monthly", label: "ماهانه (جاری)" },
  { value: "yearly", label: "سالانه (سال مالی جاری)" },
  { value: "full", label: "کامل (همه اسناد)" },
] as const;

type ExportScope = (typeof SCOPE_OPTIONS)[number]["value"];

const SCOPE_LABELS: Record<ExportScope, string> = {
  daily: "روزانه",
  monthly: "ماهانه",
  yearly: "سالانه",
  full: "کامل",
};

function scopeRange(scope: ExportScope): { from: number; to: number } {
  const now = Date.now();
  switch (scope) {
    case "daily":
      return { from: startOfJalaliDay(now), to: now };
    case "monthly":
      return { from: startOfJalaliMonth(now), to: now };
    case "yearly":
      return { from: startOfJalaliYear(now), to: now };
    case "full":
    default:
      return { from: 0, to: now };
  }
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: "ایجاد",
  UPDATE: "ویرایش",
  DELETE_ATTEMPT: "تلاش حذف",
  PAYMENT: "پرداخت",
  REFUND: "برگشت وجه",
  VOID: "ابطال",
  REVERSAL: "برگشت سند",
  ROLE_CHANGE: "تغییر نقش",
  LOGIN: "ورود",
  LOGOUT: "خروج",
  ACCOUNTING_ADJUSTMENT: "اصلاح حسابداری",
  CLOSE_FISCAL_PERIOD: "بستن دوره مالی",
  GENERATE_CHARGES: "تولید شارژ",
  RESTORE: "بازیابی پشتیبان",
  WIPE: "پاکسازی داده‌ها",
};

const COA_TYPES = [
  { value: "asset", label: "دارایی‌ها" },
  { value: "liability", label: "بدهی‌ها" },
  { value: "income", label: "درآمدها" },
  { value: "expense", label: "هزینه‌ها" },
  { value: "equity", label: "سرمایه / مانده افتتاحیه" },
] as const;

const TYPE_TONE: Record<string, string> = {
  asset: "bg-emerald-100 text-emerald-700",
  liability: "bg-rose-100 text-rose-700",
  income: "bg-sky-100 text-sky-700",
  expense: "bg-amber-100 text-amber-700",
  equity: "bg-violet-100 text-violet-700",
};

type CoaDoc = Doc<"chartOfAccounts">;

export function LedgerSection() {
  const { unit } = useMoneyPref();
  const ledger = useQuery(api.accounting.reports.ledger, { limit: 60 });
  const integrity = useQuery(api.accounting.reports.runIntegrityCheck);
  const coa = useQuery(api.accounting.accounts.listChartOfAccounts);
  const rebuild = useMutation(api.accounting.reports.rebuildBalances);
  const createAccount = useMutation(api.accounting.accounts.createAccount);
  const updateAccount = useMutation(api.accounting.accounts.updateAccount);

  const [rebuilding, setRebuilding] = useState(false);

  // export dialog
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>("monthly");
  const [exportBusy, setExportBusy] = useState(false);

  // export data — loaded live while the export dialog is open
  const range = scopeRange(exportOpen ? exportScope : "full");
  const exportLedger = useQuery(
    api.accounting.reports.ledgerExport,
    exportOpen ? { from: range.from, to: range.to, max: 2000 } : "skip",
  );
  const exportAudit = useQuery(
    api.accounting.reports.auditExport,
    exportOpen ? { from: range.from, to: range.to, max: 2000 } : "skip",
  );

  // new COA form
  const [coaOpen, setCoaOpen] = useState(false);
  const [coaCode, setCoaCode] = useState("");
  const [coaName, setCoaName] = useState("");
  const [coaType, setCoaType] = useState<string>("income");
  const [coaParent, setCoaParent] = useState("");

  // edit COA form
  const [editing, setEditing] = useState<CoaDoc | null>(null);
  const [eName, setEName] = useState("");
  const [eParent, setEParent] = useState("");
  const [eActive, setEActive] = useState("true");

  const [saving, setSaving] = useState(false);

  const doRebuild = async () => {
    setRebuilding(true);
    try {
      const res = await rebuild();
      toast.success("مانده حساب‌ها بازسازی شد", {
        description: `تاریخچه بازسازی: ${JSON.stringify(res)}`,
      });
    } catch (e) {
      toast.error((e as Error).message ?? "بازسازی ناموفق بود");
    } finally {
      setRebuilding(false);
    }
  };

  const resetCoaForm = () => {
    setCoaCode("");
    setCoaName("");
    setCoaType("income");
    setCoaParent("");
  };

  const submitCreateAccount = async () => {
    if (!coaCode.trim() || !coaName.trim()) {
      toast.error("کد و نام سرفصل را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await createAccount({
        code: coaCode.trim(),
        name: coaName.trim(),
        type: coaType as "asset" | "liability" | "income" | "expense" | "equity",
        parentCode: coaParent.trim() || undefined,
      });
      toast.success("سرفصل جدید ثبت شد");
      setCoaOpen(false);
      resetCoaForm();
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت سرفصل ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (a: CoaDoc) => {
    setEditing(a);
    setEName(a.name);
    setEParent(a.parentCode ?? "");
    setEActive(a.isActive ? "true" : "false");
  };

  const submitEdit = async () => {
    if (!editing || !eName.trim()) {
      toast.error("نام سرفصل را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await updateAccount({
        accountId: editing._id,
        name: eName.trim(),
        parentCode: eParent.trim() || undefined,
        isActive: eActive === "true",
      });
      toast.success("سرفصل به‌روزرسانی شد");
      setEditing(null);
    } catch (e) {
      toast.error((e as Error).message ?? "به‌روزرسانی ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const coaByType = (type: string) =>
    (coa ?? []).filter((a) => a.type === type).sort((a, b) => a.code.localeCompare(b.code));

  const ledgerExportRows = (exportLedger ?? []).map(({ journal, entries }) => ({
    date: formatJalali(journal.date, true),
    reference: journal.reference,
    source: JOURNAL_SOURCE_LABELS[journal.sourceType] ?? journal.sourceType,
    description: journal.description,
    debit: entries.reduce((s, e) => s + e.debitRial, 0),
    credit: entries.reduce((s, e) => s + e.creditRial, 0),
    reversal: journal.isReversal ? "بله" : "خیر",
  }));

  const ledgerDetailRows = (exportLedger ?? []).flatMap(({ journal, entries }) =>
    entries.map((e) => ({
      date: formatJalali(journal.date, true),
      reference: journal.reference,
      source: JOURNAL_SOURCE_LABELS[journal.sourceType] ?? journal.sourceType,
      description: journal.description,
      account: `${e.accountCode} — ${e.accountName}`,
      debit: e.debitRial,
      credit: e.creditRial,
    })),
  );

  const auditExportRows = (exportAudit ?? []).map((a) => ({
    date: formatJalali(a._creationTime, true),
    user: a.userName,
    action: AUDIT_ACTION_LABELS[a.action] ?? a.action,
    entity: a.entity,
    entityId: a.entityId,
    reason: a.reason ?? "",
  }));

  const scopeSubtitle = () =>
    `بازه: ${SCOPE_LABELS[exportScope]} — ${SCOPE_OPTIONS.find((s) => s.value === exportScope)?.label} — ${toFa(
      ledgerExportRows.length,
    )} سند / ${toFa(auditExportRows.length)} رویداد گزارش عملیات`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="دفتر کل و سرفصل‌های حسابداری"
        description="سرفصل‌ها، همه اسناد حسابداری و بررسی سلامت — منبع حقیقت سیستم دفتر کل است."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="size-4" />
              خروجی اکسل / PDF
            </Button>
            <Button variant="outline" size="sm" onClick={doRebuild} disabled={rebuilding}>
              <RefreshCw className={`size-4 ${rebuilding ? "animate-spin" : ""}`} />
              بازسازی مانده‌ها
            </Button>
          </div>
        }
      />

      {/* chart of accounts */}
      <Panel>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ListTree className="size-4 text-primary" />
            سرفصل‌های حسابداری
          </h3>
          <Button size="sm" className="h-8 gap-1.5 text-xs font-bold" onClick={() => setCoaOpen(true)}>
            <Plus className="size-3.5" />
            سرفصل جدید
          </Button>
        </div>
        {coa === undefined ? (
          <LoadingRow />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {COA_TYPES.map((t) => {
              const list = coaByType(t.value);
              if (list.length === 0) return null;
              return (
                <div key={t.value} className="rounded-xl border border-border/60">
                  <div className="flex items-center justify-between rounded-t-xl bg-muted/40 px-3 py-2">
                    <p className="text-[11px] font-extrabold text-foreground">{t.label}</p>
                    <Badge tone={TYPE_TONE[t.value]}>{toFa(list.length)} سرفصل</Badge>
                  </div>
                  <div className="divide-y divide-border/50">
                    {list.map((a) => (
                      <div key={a._id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0 leading-tight">
                          <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <span dir="ltr" className="tabular-nums">{a.code}</span>
                            <span className="truncate">{a.name}</span>
                            {a.isSystem && <Badge tone="bg-muted text-muted-foreground">سیستمی</Badge>}
                            {!a.isActive && <Badge tone="bg-slate-100 text-slate-500">غیرفعال</Badge>}
                          </p>
                          {a.parentCode && (
                            <p className="text-[10px] text-muted-foreground" dir="ltr">زیرمجموعه {a.parentCode}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="ویرایش سرفصل"
                          className="size-7 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* integrity check */}
      <div className="rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ShieldCheck className="size-4 text-emerald-600" />
            بررسی سلامت حسابداری
          </h3>
        </div>
        {integrity === undefined ? (
          <LoadingRow />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums text-foreground">
                  {toFa(integrity.filter((i) => i.type === "unbalanced_journal").length)}
                </p>
                <p className="text-[11px] text-muted-foreground">سند نامتوازن</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums text-foreground">
                  {toFa(integrity.filter((i) => i.type === "balance_mismatch").length)}
                </p>
                <p className="text-[11px] text-muted-foreground">مانده ناسازگار با دفتر کل</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums text-foreground">
                  {toFa(integrity.filter((i) => i.type.startsWith("duplicate_")).length)}
                </p>
                <p className="text-[11px] text-muted-foreground">مرجع تکراری</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums text-foreground">
                  {toFa(integrity.filter((i) => i.type.startsWith("invoice_") || i.type === "payment_split").length)}
                </p>
                <p className="text-[11px] text-muted-foreground">فاکتور/پرداخت ناسازگار</p>
              </div>
            </div>
            {integrity.length > 0 && (
              <div className="border-t border-border/70 px-4 py-3">
                <p className="mb-2 text-[11px] font-bold text-rose-600">مشکلات شناسایی‌شده:</p>
                <ul className="space-y-1">
                  {integrity.map((issue, i) => (
                    <li key={i} className="text-[11px] leading-5 text-muted-foreground">
                      • {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <Panel>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ScrollText className="size-4 text-primary" />
            آخرین اسناد
          </h3>
        </div>
        {ledger === undefined ? (
          <LoadingRow />
        ) : ledger.length === 0 ? (
          <EmptyState title="سندی ثبت نشده است" description="اولین تراکنش مالی پس از ثبت شارژ یا هزینه در اینجا ظاهر می‌شود." />
        ) : (
          <div className="divide-y divide-border/60">
            {ledger.map(({ journal: j, entries }) => (
              <div key={j._id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="bg-slate-100 text-slate-600">{j.reference}</Badge>
                    <Badge tone="bg-muted text-muted-foreground">{JOURNAL_SOURCE_LABELS[j.sourceType] ?? j.sourceType}</Badge>
                    {j.isReversal && <Badge tone="bg-rose-100 text-rose-700">برگشت سند</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">{formatJalali(j.date, true)}</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-foreground/70">
                      <BookOpenCheck className="size-3.5" />
                      {toFa(entries.length)} ردیف
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-xs font-bold text-foreground">{j.description}</p>
                <div className="mt-2 overflow-x-auto">
                  <Table>
                    <TableBody>
                      {entries.map((e) => (
                        <TableRow key={e._id} className="border-0 hover:bg-muted/30">
                          <TableCell className="py-1.5 text-[11px] font-medium text-muted-foreground">
                            {e.accountCode} — {e.accountName}
                          </TableCell>
                          <TableCell className="py-1.5 text-end text-[11px] font-bold tabular-nums text-rose-600">
                            {e.debitRial > 0 ? formatMoney(e.debitRial, unit) : "—"}
                          </TableCell>
                          <TableCell className="py-1.5 text-end text-[11px] font-bold tabular-nums text-emerald-600">
                            {e.creditRial > 0 ? formatMoney(e.creditRial, unit) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* new COA dialog */}
      <Dialog open={coaOpen} onOpenChange={setCoaOpen}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">سرفصل حسابداری جدید</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              سرفصل‌های درآمد (3-xx) و هزینه (4-xx) در فرم‌های شارژ و هزینه در دسترس قرار می‌گیرند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">کد سرفصل</Label>
                <Input dir="ltr" className="text-end" value={coaCode} onChange={(e) => setCoaCode(e.target.value)} placeholder="مثلاً: 3-05" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">گروه</Label>
                <Select value={coaType} onValueChange={setCoaType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COA_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام سرفصل</Label>
              <Input dir="rtl" value={coaName} onChange={(e) => setCoaName(e.target.value)} placeholder="مثلاً: درآمد اجاره مشاعات" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">کد سرفصل والد (اختیاری)</Label>
              <Input dir="ltr" className="text-end" value={coaParent} onChange={(e) => setCoaParent(e.target.value)} placeholder="مثلاً: 3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoaOpen(false)}>انصراف</Button>
            <Button onClick={submitCreateAccount} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت سرفصل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* export dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="glass max-w-lg border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">خروجی دفتر کل و گزارش عملیات</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              بازه زمانی را انتخاب کنید؛ سپس اکسل (CSV) یا چاپ/PDF بگیرید. اسناد با ردیف‌های دفتر کل و رویدادهای گزارش عملیات هر دو خروجی داده می‌شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">بازه زمانی</Label>
              <Select value={exportScope} onValueChange={(v) => setExportScope(v as ExportScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {exportLedger === undefined || exportAudit === undefined ? (
              <LoadingRow />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/40 p-3 text-center">
                  <p className="text-lg font-extrabold tabular-nums">{toFa(ledgerExportRows.length)}</p>
                  <p className="text-[11px] text-muted-foreground">سند در این بازه</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-center">
                  <p className="text-lg font-extrabold tabular-nums">{toFa(auditExportRows.length)}</p>
                  <p className="text-[11px] text-muted-foreground">رویداد گزارش عملیات</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={exportBusy || exportLedger === undefined || exportAudit === undefined}
                onClick={() => {
                  downloadCsv(
                    `ledger-${exportScope}.csv`,
                    ["تاریخ", "شماره سند", "منبع", "شرح", "بدهکار", "بستانکار", "برگشتی"],
                    ledgerExportRows.map((r) => [r.date, r.reference, r.source, r.description, r.debit, r.credit, r.reversal]),
                  );
                  downloadCsv(
                    `ledger-entries-${exportScope}.csv`,
                    ["تاریخ", "شماره سند", "منبع", "شرح", "حساب", "بدهکار", "بستانکار"],
                    ledgerDetailRows.map((r) => [r.date, r.reference, r.source, r.description, r.account, r.debit, r.credit]),
                  );
                  downloadCsv(
                    `audit-${exportScope}.csv`,
                    ["زمان", "کاربر", "عملیات", "موجودیت", "شناسه", "علت"],
                    auditExportRows.map((r) => [r.date, r.user, r.action, r.entity, r.entityId, r.reason]),
                 );
                  toast.success("سه فایل اکسل دانلود شد: اسناد، ردیف‌های دفتر کل و گزارش عملیات");
                }}
              >
                <FileSpreadsheet className="size-4" />
                اکسل (۳ فایل CSV)
              </Button>
              <Button
                className="gap-1.5"
                disabled={exportBusy || exportLedger === undefined || exportAudit === undefined}
                onClick={() => {
                  const sub = scopeSubtitle();
                  printHtml(
                    "دفتر کل — مجتمع تجاری اداری شهریار",
                    sub,
                    ["تاریخ", "شماره سند", "منبع", "شرح", "بدهکار", "بستانکار"],
                    ledgerExportRows.map((r) => [r.date, r.reference, r.source, r.description, formatMoney(r.debit, unit), formatMoney(r.credit, unit)]),
                  );
                  printHtml(
                    "ردیف‌های دفتر کل — مجتمع تجاری اداری شهریار",
                    sub,
                    ["تاریخ", "شماره سند", "منبع", "شرح", "حساب", "بدهکار", "بستانکار"],
                    ledgerDetailRows.map((r) => [r.date, r.reference, r.source, r.description, r.account, formatMoney(r.debit, unit), formatMoney(r.credit, unit)]),
                  );
                  printHtml(
                    "گزارش عملیات — مجتمع تجاری اداری شهریار",
                    sub,
                    ["زمان", "کاربر", "عملیات", "موجودیت", "شناسه", "علت"],
                    auditExportRows.map((r) => [r.date, r.user, r.action, r.entity, r.entityId, r.reason]),
                  );
                }}
              >
                <Printer className="size-4" />
                چاپ / PDF (۳ گزارش)
              </Button>
            </div>
            <p className="text-[11px] leading-5 text-muted-foreground">
              نکته: مرورگرها فقط اجازه باز کردن یک پنجره چاپ را در هر کلیک می‌دهند؛ برای PDF کامل، هر گزارش را جداگانه ذخیره کنید یا از خروجی اکسل استفاده کنید.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit COA dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش سرفصل</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editing?.isSystem
                ? "این سرفصل سیستمی است و فقط می‌توانید وضعیت آن را تغییر دهید."
                : "کد سرفصل قابل تغییر نیست چون در اسناد دفتر کل استفاده شده است."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <p className="text-xs font-bold text-foreground" dir="ltr">
                {editing?.code}
                <span className="ms-2 text-muted-foreground">— {COA_TYPES.find((t) => t.value === editing?.type)?.label}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام سرفصل</Label>
              <Input dir="rtl" value={eName} onChange={(e) => setEName(e.target.value)} disabled={editing?.isSystem} />
            </div>
            {!editing?.isSystem && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">کد سرفصل والد (اختیاری)</Label>
                <Input dir="ltr" className="text-end" value={eParent} onChange={(e) => setEParent(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">وضعیت</Label>
              <Select value={eActive} onValueChange={setEActive}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">فعال</SelectItem>
                  <SelectItem value="false">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>انصراف</Button>
            <Button onClick={submitEdit} disabled={saving || editing?.isSystem}>
              {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}