import { useQuery } from "convex/react";
import {
  AlertCircle,
  Banknote,
  Building2,
  Landmark,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatJalali, jalaliMonthKey } from "@/lib/jalali";
import { formatMoney, type MoneyUnit } from "@/lib/money";
import { useMoneyPref } from "./money-context";
import { Badge, LoadingRow, Panel, SectionHeader, StatCard } from "./ui";
import { cn } from "@/lib/utils";

export function FinDashboardSection() {
  const { unit } = useMoneyPref();
  const dash = useQuery(api.accounting.reports.financialDashboard);

  if (dash === undefined) return <LoadingRow />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="داشبورد مالی"
        description={`نمای کلی وضعیت مالی مجتمع — ${jalaliMonthKey(Date.now())}`}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="موجودی صندوق" rial={dash.cashTotal} unit={unit} icon={Banknote} tone="bg-emerald-100 text-emerald-700" />
        <StatCard label="موجودی بانک" rial={dash.bankTotal} unit={unit} icon={Landmark} tone="bg-sky-100 text-sky-700" />
        <StatCard label="مطالبات واحدها" rial={dash.totalReceivable} unit={unit} icon={Wallet} tone="bg-rose-100 text-rose-700" hint={`${dash.overdueCount} فاکتور معوق`} />
        <StatCard label="بستانکاری (پیش‌پرداخت)" rial={dash.totalCredit} unit={unit} icon={PiggyBank} tone="bg-amber-100 text-amber-700" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="درآمد ماه جاری" rial={dash.monthIncome} unit={unit} icon={TrendingUp} tone="bg-emerald-100 text-emerald-700" />
        <StatCard label="هزینه ماه جاری" rial={dash.monthExpense} unit={unit} icon={TrendingDown} tone="bg-orange-100 text-orange-700" />
        <StatCard label="دریافتی امروز" rial={dash.paymentsToday} unit={unit} icon={Receipt} tone="bg-sky-100 text-sky-700" />
        <StatCard label="هزینه‌های پرداخت‌نشده" rial={dash.totalExpenseUnpaid} unit={unit} icon={AlertCircle} tone="bg-rose-100 text-rose-700" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top debtors */}
        <Panel>
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <Building2 className="size-4 text-rose-600" />
              بدهکارترین واحدها
            </h3>
            <Badge tone="bg-rose-100 text-rose-700">{dash.topDebtors.length} واحد</Badge>
          </div>
          <div className="divide-y divide-border/60">
            {dash.topDebtors.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">بدهی معوقی وجود ندارد 🎉</p>
            )}
            {dash.topDebtors.map(({ unit: u, netBalanceRial }) => (
              <div key={u?._id ?? "x"} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-bold text-foreground">
                    واحد {u?.unitNumber ?? "—"}
                    <span className="ms-2 text-[11px] font-medium text-muted-foreground">{u?.usage}</span>
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{u?.ownerName ?? u?.tenantName ?? ""}</p>
                </div>
                <span className="text-sm font-extrabold tabular-nums text-rose-600">
                  {formatMoney(netBalanceRial, unit)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Due soon */}
        <Panel>
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <AlertCircle className="size-4 text-amber-600" />
              سررسیدهای نزدیک
            </h3>
            <Badge tone="bg-amber-100 text-amber-700">۷ روز آینده</Badge>
          </div>
          <div className="divide-y divide-border/60">
            {dash.dueSoon.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">سررسید نزدیکی وجود ندارد.</p>
            )}
            {dash.dueSoon.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-bold text-foreground">{inv.invoiceNumber}</p>
                  <p className="text-[11px] text-muted-foreground">سررسید {formatJalali(inv.dueDate)}</p>
                </div>
                <span className="text-sm font-extrabold tabular-nums text-foreground">
                  {formatMoney(inv.remainingRial, unit)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* treasury summary strip */}
      <div className={cn("glass-soft flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3")}>
        <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Wallet className="size-4 text-gold-deep" />
          مجموع نقدینگی (صندوق + بانک + صندوق‌های تخصصی)
        </p>
        <p className="text-base font-extrabold tabular-nums text-navy">{formatMoney(dash.treasuryTotal, unit)}</p>
      </div>
    </div>
  );
}