import { useQuery } from "convex/react";
import { Printer } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatJalali } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { useMoneyPref } from "./money-context";
import { Badge, LoadingRow } from "./ui";
import { INVOICE_STATUS_LABELS, JOURNAL_SOURCE_LABELS as SOURCE_LABELS } from "./labels";


export function UnitStatementDialog({
  unitId,
  onOpenChange,
}: {
  unitId: Id<"units"> | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { unit } = useMoneyPref();
  const data = useQuery(api.accounting.reports.unitStatement, unitId ? { unitId } : "skip");

  return (
    <Dialog open={unitId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[85vh] max-w-3xl overflow-y-auto border-white/60">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="text-navy">صورت‌حساب واحد</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            چاپ
          </Button>
        </DialogHeader>

        {data === undefined ? (
          <LoadingRow />
        ) : (
          <div className="space-y-5 print:space-y-4">
            {/* header */}
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-center">
              <p className="text-lg font-extrabold text-foreground">
                مجتمع تجاری اداری شهریار
              </p>
              <p className="mt-1 text-sm font-bold text-foreground/80">
                صورت‌حساب واحد {data.unit.unitNumber} — {data.unit.usage}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                حساب مالی: {data.account.accountNumber} — مالک: {data.unit.ownerName ?? "—"}
                {data.unit.tenantName ? ` — مستأجر: ${data.unit.tenantName}` : ""}
              </p>
            </div>

            {/* balances */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/70 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">مانده بدهی</p>
                <p className="mt-1 text-sm font-extrabold tabular-nums text-rose-600">
                  {formatMoney(data.balanceRial, unit)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">بستانکاری (پیش‌پرداخت)</p>
                <p className="mt-1 text-sm font-extrabold tabular-nums text-emerald-600">
                  {formatMoney(data.creditRial, unit)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">مانده نهایی</p>
                <p className="mt-1 text-sm font-extrabold tabular-nums text-foreground">
                  {formatMoney(Math.max(data.netBalanceRial, 0), unit)}
                </p>
              </div>
            </div>

            {/* statement rows */}
            <div className="overflow-x-auto rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-extrabold">تاریخ</TableHead>
                    <TableHead className="text-[11px] font-extrabold">شرح</TableHead>
                    <TableHead className="text-[11px] font-extrabold">نوع</TableHead>
                    <TableHead className="text-end text-[11px] font-extrabold">بدهکار</TableHead>
                    <TableHead className="text-end text-[11px] font-extrabold">بستانکار</TableHead>
                    <TableHead className="text-end text-[11px] font-extrabold">مانده</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.statement.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        تراکنشی ثبت نشده است.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.statement.map((row) => (
                    <TableRow key={row.entryId} className="hover:bg-muted/40">
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatJalali(row.date)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs font-medium">
                        {row.description}
                        <span className="ms-1.5 text-[10px] text-muted-foreground">{row.reference}</span>
                      </TableCell>
                      <TableCell>
                        <Badge tone="bg-muted text-muted-foreground">{SOURCE_LABELS[row.sourceType] ?? row.sourceType}</Badge>
                      </TableCell>
                      <TableCell className="text-end text-xs font-bold tabular-nums text-rose-600">
                        {row.debitRial > 0 ? formatMoney(row.debitRial, unit) : "—"}
                      </TableCell>
                      <TableCell className="text-end text-xs font-bold tabular-nums text-emerald-600">
                        {row.creditRial > 0 ? formatMoney(row.creditRial, unit) : "—"}
                      </TableCell>
                      <TableCell className="text-end text-xs font-extrabold tabular-nums">
                        {formatMoney(Math.abs(row.balanceRial), unit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* invoices */}
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="mb-2 text-sm font-extrabold text-foreground">فاکتورهای واحد</p>
              <div className="divide-y divide-border/60">
                {data.invoices.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">فاکتوری صادر نشده است.</p>
                )}
                {data.invoices.map((inv) => (
                  <div key={inv._id} className="flex items-center justify-between gap-2 py-2">
                    <div className="leading-tight">
                      <p className="text-xs font-bold">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-muted-foreground">سررسید {formatJalali(inv.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="bg-muted text-muted-foreground">{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                      <span className="text-xs font-extrabold tabular-nums">{formatMoney(inv.totalRial, unit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* payments */}
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="mb-2 text-sm font-extrabold text-foreground">پرداخت‌های واحد</p>
              <div className="divide-y divide-border/60">
                {data.payments.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">پرداختی ثبت نشده است.</p>
                )}
                {data.payments.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-2 py-2">
                    <div className="leading-tight">
                      <p className="text-xs font-bold">{p.paymentNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{formatJalali(p.paymentDate)} — {p.payer}</p>
                    </div>
                    <span className="text-xs font-extrabold tabular-nums text-emerald-600">
                      {formatMoney(p.amountRial, unit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground print:block">
              این صورت‌حساب در تاریخ {formatJalali(Date.now())} از سامانه مدیریت مجتمع شهریار استخراج شده است — مبالغ به واحد «{unit === "toman" ? "تومان" : "ریال"}».
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}