import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ChartColumn, FileDown, Printer, Search, TrendingDown, TrendingUp, Users2, Wallet } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentJalaliMonth, currentJalaliYear, formatJalali } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { toFa } from "@/lib/fa";
import { useMoneyPref } from "./money-context";
import { Badge, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { INVOICE_STATUS_LABELS } from "./labels";
import { downloadCsv, printHtml } from "@/lib/export";

type Tab = "debtors" | "income" | "expense" | "cashflow" | "search";

export function ReportsSection() {
  const { unit } = useMoneyPref();
  const [tab, setTab] = useState<Tab>("debtors");

  const [bucket, setBucket] = useState("all");
  const [sortBy, setSortBy] = useState("amount");
  const [q, setQ] = useState("");

  const debtors = useQuery(api.accounting.reports.debtorsReport, {
    bucket: bucket as "all" | "1m" | "3m" | "6m",
    sortBy: sortBy as "amount" | "age",
  });
  const income = useQuery(api.accounting.reports.incomeReport, {});
  const expense = useQuery(api.accounting.reports.expenseReport, {});
  const cashflow = useQuery(api.accounting.reports.cashflowReport, {});
  const search = useQuery(api.accounting.reports.searchFinancial, q.trim().length >= 2 ? { q: q.trim() } : "skip");

  const thisMonthLabel = `${toFa(currentJalaliYear())}/${toFa(String(currentJalaliMonth()).padStart(2, "0"))}`;

  const totalDebt = useMemo(
    () => (debtors ?? []).reduce((s, d) => s + d.netBalanceRial, 0),
    [debtors],
  );

  const reportSubtitle = (label: string) =>
    `${label} — مجتمع تجاری اداری شهریار — تاریخ تهیه: ${formatJalali(Date.now())}`;
  const ageLabel = (days: number) =>
    days < 30 ? "کمتر از ۱ ماه" : days < 90 ? "۱ تا ۳ ماه" : days < 180 ? "۳ تا ۶ ماه" : "بیش از ۶ ماه";

  const debtorsRows = () =>
    (debtors ?? []).map((d) => [
      d.unit ? `واحد ${d.unit.unitNumber}` : "—",
      d.accountNumber,
      d.oldestDueDate ? formatJalali(d.oldestDueDate) : "—",
      formatMoney(d.netBalanceRial, unit),
      ageLabel(d.ageDays),
    ]);
  const incomeRows = () => [
    ...(income?.rows ?? []).map((r) => [r.code, r.name, formatMoney(r.netRial, unit)]),
    ["جمع", "", formatMoney(income?.totalRial ?? 0, unit)],
  ];
  const expenseRows = () => [
    ...(expense?.rows ?? []).map((r) => [r.code, r.name, formatMoney(r.netRial, unit)]),
    ["جمع", "", formatMoney(expense?.totalRial ?? 0, unit)],
  ];
  const cashflowRows = () => [
    ["ورودی وجه (۳۰ روز)", formatMoney(cashflow?.inflowRial ?? 0, unit), ""],
    ["خروجی وجه (۳۰ روز)", "", formatMoney(cashflow?.outflowRial ?? 0, unit)],
    ["خالص جریان نقدی", formatMoney(cashflow?.netRial ?? 0, unit), ""],
    ...(cashflow?.days ?? []).map((d) => [
      formatJalali(new Date(d.day).getTime()),
      formatMoney(d.inflowRial, unit),
      formatMoney(d.outflowRial, unit),
    ]),
  ];

  const TABS: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: "debtors", label: "بدهکاران", icon: Users2 },
    { id: "income", label: "درآمد", icon: TrendingUp },
    { id: "expense", label: "هزینه", icon: TrendingDown },
    { id: "cashflow", label: "جریان نقدی", icon: Wallet },
    { id: "search", label: "جستجو", icon: Search },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="گزارش‌ها"
        description="گزارش بدهکاران، درآمد، هزینه و جریان نقدی — همه محاسبات سمت سرور انجام می‌شود."
      />

      <div className="inline-flex max-w-full flex-wrap rounded-full border border-border/70 bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "debtors" && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <Users2 className="size-4 text-rose-600" />
              گزارش بدهکاران
            </h3>
            <div className="flex items-center gap-2">
              <ExportButtons
                onCsv={() => downloadCsv("debtors.csv", ["واحد", "شماره حساب", "قدیمی‌ترین بدهی", "بدهی", "سن بدهی"], debtorsRows())}
                onPrint={() => printHtml("گزارش بدهکاران", reportSubtitle(`بدهکاران — ${toFa(debtors?.length ?? 0)} واحد — جمع: ${formatMoney(totalDebt, unit)}`), ["واحد", "شماره حساب", "قدیمی‌ترین بدهی", "بدهی", "سن بدهی"], debtorsRows())}
              />
              <Select value={bucket} onValueChange={setBucket}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="1m">بالای ۱ ماه</SelectItem>
                  <SelectItem value="3m">بالای ۳ ماه</SelectItem>
                  <SelectItem value="6m">بالای ۶ ماه</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">بیشترین بدهی</SelectItem>
                  <SelectItem value="age">قدیمی‌ترین بدهی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {debtors === undefined ? (
            <LoadingRow />
          ) : debtors.length === 0 ? (
            <EmptyState title="بدهکاری وجود ندارد 🎉" description="همه واحدها تسویه‌اند یا فاکتوری صادر نشده است." />
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                <span className="text-[11px] font-bold text-muted-foreground">{toFa(debtors.length)} واحد بدهکار</span>
                <span className="text-sm font-extrabold tabular-nums text-rose-600">جمع: {formatMoney(totalDebt, unit)}</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-extrabold text-foreground">واحد</TableHead>
                      <TableHead className="text-xs font-extrabold text-foreground">حساب</TableHead>
                      <TableHead className="hidden text-xs font-extrabold text-foreground lg:table-cell">قدیمی‌ترین بدهی</TableHead>
                      <TableHead className="text-end text-xs font-extrabold text-foreground">بدهی</TableHead>
                      <TableHead className="text-xs font-extrabold text-foreground">سن بدهی</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtors.map((d) => (
                      <TableRow key={d.accountNumber} className="hover:bg-muted/40">
                        <TableCell className="text-xs font-bold">واحد {d.unit?.unitNumber ?? "—"}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{d.accountNumber}</TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                          {d.oldestDueDate ? formatJalali(d.oldestDueDate) : "—"}
                        </TableCell>
                        <TableCell className="text-end text-xs font-extrabold tabular-nums text-rose-600">
                          {formatMoney(d.netBalanceRial, unit)}
                        </TableCell>
                        <TableCell>
                          <Badge tone={d.ageDays > 180 ? "bg-rose-100 text-rose-700" : d.ageDays > 90 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                            {d.ageDays < 30 ? "کمتر از ۱ ماه" : d.ageDays < 90 ? "۱ تا ۳ ماه" : d.ageDays < 180 ? "۳ تا ۶ ماه" : "بیش از ۶ ماه"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Panel>
      )}

      {tab === "income" && (
        <Panel>
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <TrendingUp className="size-4 text-emerald-600" />
              گزارش درآمد — از ابتدا تا کنون
            </h3>
            <div className="flex items-center gap-2">
              <Badge tone="bg-emerald-100 text-emerald-700">{thisMonthLabel}</Badge>
              <ExportButtons
                onCsv={() => downloadCsv("income.csv", ["کد", "سرفصل", "مبلغ"], incomeRows())}
                onPrint={() => printHtml("گزارش درآمد", reportSubtitle(`درآمد — جمع: ${formatMoney(income?.totalRial ?? 0, unit)}`), ["کد", "سرفصل", "مبلغ"], incomeRows())}
              />
            </div>
          </div>
          {income === undefined ? (
            <LoadingRow />
          ) : (
            <IncomeExpenseRows rows={income.rows} total={income.totalRial} unit={unit} type="income" />
          )}
        </Panel>
      )}

      {tab === "expense" && (
        <Panel>
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <TrendingDown className="size-4 text-orange-600" />
              گزارش هزینه — از ابتدا تا کنون
            </h3>
            <div className="flex items-center gap-2">
              <Badge tone="bg-orange-100 text-orange-700">{thisMonthLabel}</Badge>
              <ExportButtons
                onCsv={() => downloadCsv("expenses.csv", ["کد", "سرفصل", "مبلغ"], expenseRows())}
                onPrint={() => printHtml("گزارش هزینه", reportSubtitle(`هزینه‌ها — جمع: ${formatMoney(expense?.totalRial ?? 0, unit)}`), ["کد", "سرفصل", "مبلغ"], expenseRows())}
              />
            </div>
          </div>
          {expense === undefined ? (
            <LoadingRow />
          ) : (
            <IncomeExpenseRows rows={expense.rows} total={expense.totalRial} unit={unit} type="expense" />
          )}
        </Panel>
      )}

      {tab === "cashflow" && (
        <Panel>
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <Wallet className="size-4 text-sky-600" />
              جریان نقدی (۳۰ روز اخیر)
            </h3>
            <ExportButtons
              onCsv={() => downloadCsv("cashflow.csv", ["شرح / تاریخ", "ورودی", "خروجی"], cashflowRows())}
              onPrint={() => printHtml("گزارش جریان نقدی", reportSubtitle("جریان نقدی (۳۰ روز اخیر)"), ["شرح / تاریخ", "ورودی", "خروجی"], cashflowRows())}
            />
          </div>
          {cashflow === undefined ? (
            <LoadingRow />
          ) : cashflow.days.length === 0 ? (
            <EmptyState title="حرکت نقدی وجود ندارد" description="پس از ثبت اولین دریافت یا پرداخت، نمودار جریان نقدی نمایش داده می‌شود." />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 border-b border-border/60 p-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <p className="text-sm font-extrabold tabular-nums text-emerald-700">{formatMoney(cashflow.inflowRial, unit)}</p>
                  <p className="text-[11px] text-muted-foreground">ورودی وجه</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3 text-center">
                  <p className="text-sm font-extrabold tabular-nums text-rose-700">{formatMoney(cashflow.outflowRial, unit)}</p>
                  <p className="text-[11px] text-muted-foreground">خروجی وجه</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-center">
                  <p className="text-sm font-extrabold tabular-nums text-foreground">{formatMoney(cashflow.netRial, unit)}</p>
                  <p className="text-[11px] text-muted-foreground">خالص جریان نقدی</p>
                </div>
              </div>
              <div className="space-y-0.5 p-4">
                {cashflow.days.map((d) => {
                  const max = Math.max(cashflow.inflowRial, cashflow.outflowRial, 1);
                  return (
                    <div key={d.day} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-[10px] text-muted-foreground">{formatJalali(new Date(d.day).getTime())}</span>
                      <div className="flex h-4 flex-1 items-center gap-0.5">
                        <div
                          className="h-3 rounded-full bg-emerald-500/80"
                          style={{ width: `${(d.inflowRial / max) * 100}%` }}
                          title={`ورودی: ${formatMoney(d.inflowRial, unit)}`}
                        />
                        <div
                          className="h-3 rounded-full bg-rose-500/80"
                          style={{ width: `${(d.outflowRial / max) * 100}%` }}
                          title={`خروجی: ${formatMoney(d.outflowRial, unit)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Panel>
      )}

      {tab === "search" && (
        <Panel>
          <div className="border-b border-border/70 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                dir="rtl"
                className="h-10 pe-4 ps-9 text-sm"
                placeholder="جستجو: شماره فاکتور، شماره پرداخت، کد پیگیری، نام مالک/مستأجر، شماره واحد…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          {q.trim().length < 2 ? (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">حداقل ۲ حرف وارد کنید.</p>
          ) : search === undefined ? (
            <LoadingRow />
          ) : (
            <div className="space-y-4 p-4">
              <SearchGroup
                icon={<ChartColumn className="size-3.5" />}
                title="فاکتورها"
                items={search.invoices.map((i) => (
                  <div key={i._id} className="flex items-center justify-between gap-2">
                    <div className="leading-tight">
                      <p className="text-xs font-bold">{i.invoiceNumber}</p>
                      <p className="text-[10px] text-muted-foreground">سررسید {formatJalali(i.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="bg-muted text-muted-foreground">{INVOICE_STATUS_LABELS[i.status]}</Badge>
                      <span className="text-xs font-extrabold tabular-nums">{formatMoney(i.remainingRial, unit)}</span>
                    </div>
                  </div>
                ))}
              />
              <SearchGroup
                icon={<Wallet className="size-3.5" />}
                title="پرداخت‌ها"
                items={search.payments.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-2">
                    <div className="leading-tight">
                      <p className="text-xs font-bold">{p.paymentNumber} — {p.payer}</p>
                      <p className="text-[10px] text-muted-foreground">{formatJalali(p.paymentDate)}</p>
                    </div>
                    <span className="text-xs font-extrabold tabular-nums">{formatMoney(p.amountRial, unit)}</span>
                  </div>
                ))}
              />
              <SearchGroup
                icon={<Users2 className="size-3.5" />}
                title="واحدها"
                items={search.units.map((u) => (
                  <div key={u._id} className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold">واحد {u.unitNumber} — {u.ownerName ?? u.tenantName ?? u.usage}</p>
                    <span className="text-[10px] text-muted-foreground">{u.usage} — {toFa(u.areaM2)} متر</span>
                  </div>
                ))}
              />
              <SearchGroup
                icon={<TrendingDown className="size-3.5" />}
                title="هزینه‌ها"
                items={search.expenses.map((e) => (
                  <div key={e._id} className="flex items-center justify-between gap-2">
                    <div className="leading-tight">
                      <p className="text-xs font-bold">{e.expenseNumber} — {e.title}</p>
                      <p className="text-[10px] text-muted-foreground">{e.vendor ?? ""}</p>
                    </div>
                    <span className="text-xs font-extrabold tabular-nums">{formatMoney(e.remainingRial, unit)}</span>
                  </div>
                ))}
              />
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function IncomeExpenseRows({
  rows,
  total,
  unit,
  type,
}: {
  rows: Array<{ code: string; name: string; netRial: number }>;
  total: number;
  unit: "toman" | "rial";
  type: "income" | "expense";
}) {
  if (rows.length === 0) {
    return <EmptyState title={type === "income" ? "درآمدی ثبت نشده است" : "هزینه‌ای ثبت نشده است"} />;
  }
  return (
    <div className="divide-y divide-border/60">
      {rows.map((r) => (
        <div key={r.code} className="flex items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Badge tone={type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}>{r.code}</Badge>
            <span className="text-xs font-bold text-foreground">{r.name}</span>
          </div>
          <span className={`text-xs font-extrabold tabular-nums ${type === "income" ? "text-emerald-600" : "text-orange-600"}`}>
            {formatMoney(r.netRial, unit)}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 bg-muted/30 px-4 py-3">
        <span className="text-xs font-extrabold text-foreground">جمع</span>
        <span className={`text-sm font-extrabold tabular-nums ${type === "income" ? "text-emerald-700" : "text-orange-700"}`}>
          {formatMoney(total, unit)}
        </span>
      </div>
    </div>
  );
}

function ExportButtons({ onCsv, onPrint }: { onCsv: () => void; onPrint: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-[11px] font-bold" onClick={onCsv}>
        <FileDown className="size-3.5" />
        Excel
      </Button>
      <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-[11px] font-bold" onClick={onPrint}>
        <Printer className="size-3.5" />
        چاپ/PDF
      </Button>
    </div>
  );
}

function SearchGroup({ icon, title, items }: { icon: React.ReactNode; title: string; items: React.ReactNode[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/70">
      <div className="flex items-center gap-1.5 border-b border-border/70 px-3 py-2 text-[11px] font-bold text-muted-foreground">
        {icon}
        {title} — {toFa(items.length)}
      </div>
      <div className="divide-y divide-border/60 px-3 py-1">
        {items.map((item, i) => (
          <div key={i} className="py-2">{item}</div>
        ))}
      </div>
    </div>
  );
}