import { useQuery } from "convex/react";
import { Building2, FileText, ReceiptText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatJalali } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { useMoneyPref } from "./money-context";
import { Badge, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES } from "./labels";

export function MyUnitsSection() {
  const { unit } = useMoneyPref();
  const my = useQuery(api.accounting.reports.myFinancial);

  if (my === undefined) return <LoadingRow />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="واحدهای من"
        description="وضعیت مالی واحدهایی که به حساب شما متصل است — بدهی، فاکتورها و پرداخت‌های شما."
      />

      {my.length === 0 && (
        <EmptyState
          title="واحدی به حساب شما متصل نشده است"
          description="برای اتصال واحد به حساب شما، مدیر مجتمع باید واحد شما را با نام شما ثبت کند."
        />
      )}

      <div className="space-y-5">
        {my.map(({ unit: u, account, netBalanceRial, creditRial, balanceRial, invoices, payments }) => (
          <Panel key={u._id}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-extrabold text-foreground">واحد {u.unitNumber}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {u.usage} — {account?.accountNumber} — {u.ownerName ? `مالک: ${u.ownerName}` : ""}{u.tenantName ? ` — مستأجر: ${u.tenantName}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-muted/40 px-3 py-2 text-center">
                  <p className="text-[10px] text-muted-foreground">بدهی</p>
                  <p className={`text-sm font-extrabold tabular-nums ${netBalanceRial > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatMoney(balanceRial, unit)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 px-3 py-2 text-center">
                  <p className="text-[10px] text-muted-foreground">بستانکاری</p>
                  <p className="text-sm font-extrabold tabular-nums text-emerald-600">{formatMoney(creditRial, unit)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 px-3 py-2 text-center">
                  <p className="text-[10px] text-muted-foreground">مانده نهایی</p>
                  <p className="text-sm font-extrabold tabular-nums text-foreground">
                    {formatMoney(Math.max(netBalanceRial, 0), unit)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                  <FileText className="size-3.5 text-primary" />
                  فاکتورها
                </p>
                <div className="divide-y divide-border/60 rounded-xl border border-border/70">
                  {invoices.length === 0 && (
                    <p className="px-3 py-5 text-center text-[11px] text-muted-foreground">فاکتوری صادر نشده است.</p>
                  )}
                  {invoices.map((inv) => (
                    <div key={inv._id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="leading-tight">
                        <p className="text-xs font-bold">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-muted-foreground">سررسید {formatJalali(inv.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={INVOICE_STATUS_TONES[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                        <span className="text-xs font-extrabold tabular-nums">{formatMoney(inv.totalRial, unit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                  <ReceiptText className="size-3.5 text-emerald-600" />
                  پرداخت‌ها
                </p>
                <div className="divide-y divide-border/60 rounded-xl border border-border/70">
                  {payments.length === 0 && (
                    <p className="px-3 py-5 text-center text-[11px] text-muted-foreground">پرداختی ثبت نشده است.</p>
                  )}
                  {payments.map((p) => (
                    <div key={p._id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="leading-tight">
                        <p className="text-xs font-bold">{p.paymentNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{formatJalali(p.paymentDate)}</p>
                      </div>
                      <span className="text-xs font-extrabold tabular-nums text-emerald-600">
                        {formatMoney(p.amountRial, unit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}