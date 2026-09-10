import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowRight, FileDown, Printer } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatJalali } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { useMoneyPref } from "@/components/complex/money-context";
import { Badge, LoadingRow } from "@/components/complex/ui";
import { INVOICE_STATUS_LABELS, JOURNAL_SOURCE_LABELS as SOURCE_LABELS } from "@/components/complex/labels";
import { downloadCsv } from "@/lib/export";

/**
 * Standalone, print-optimized unit statement (A4, RTL).
 * Opens in its own window/tab — no dialog scroll/clipping issues when printing.
 * Pass ?print=1 to trigger the browser print dialog automatically once loaded.
 */
export default function UnitStatementPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { unit } = useMoneyPref();
  const data = useQuery(
    api.accounting.reports.unitStatement,
    unitId ? { unitId: unitId as Id<"units"> } : "skip",
  );

  useEffect(() => {
    if (searchParams.get("print") === "1" && data) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [searchParams, data]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-200 print:bg-white">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="size-3.5" />
            بازگشت به پنل
          </Button>
          <span className="text-xs font-bold text-slate-600">
            صورت‌حساب واحد {data?.unit?.unitNumber ?? "…"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold"
            onClick={() => {
              if (!data) return;
              downloadCsv(
                `unit-statement-${data.unit.unitNumber}.csv`,
                ["تاریخ", "شرح", "مرجع", "نوع", "بدهکار", "بستانکار", "مانده"],
                data.statement.map((row) => [
                  formatJalali(row.date),
                  row.description,
                  row.reference,
                  SOURCE_LABELS[row.sourceType] ?? row.sourceType,
                  row.debitRial > 0 ? formatMoney(row.debitRial, unit) : "",
                  row.creditRial > 0 ? formatMoney(row.creditRial, unit) : "",
                  formatMoney(Math.abs(row.balanceRial), unit),
                ]),
              );
            }}
          >
            <FileDown className="size-3.5" />
            Excel
          </Button>
          <Button size="sm" className="gap-1.5 text-xs font-bold" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            چاپ / ذخیره PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[210mm] p-4 sm:p-6 print:m-0 print:max-w-none print:p-0">
        {/* A4 sheet */}
        <div className="rounded-2xl bg-white p-6 shadow-lg print:rounded-none print:p-0 print:shadow-none sm:p-10">
          {data === undefined ? (
            <div className="py-16">
              <LoadingRow />
            </div>
          ) : (
            <div className="space-y-6 print:space-y-4">
              {/* letterhead */}
              <div className="border-b-2 border-slate-800 pb-4 text-center">
                <p className="text-xl font-extrabold text-slate-900">مجتمع تجاری اداری شهریار</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  صورت‌حساب واحد {data.unit.unitNumber} — {data.unit.usage}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  حساب مالی: {data.account.accountNumber} — مالک: {data.unit.ownerName ?? "—"}
                  {data.unit.tenantName ? ` — مستأجر: ${data.unit.tenantName}` : ""}
                  {data.unit.ownerPhone ? ` — تلفن مالک: ${data.unit.ownerPhone}` : ""}
                </p>
              </div>

              {/* summary balances */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-300 p-3 text-center">
                  <p className="text-[11px] text-slate-500">مانده بدهی</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-rose-700">
                    {formatMoney(data.balanceRial, unit)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-300 p-3 text-center">
                  <p className="text-[11px] text-slate-500">بستانکاری (پیش‌پرداخت)</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-emerald-700">
                    {formatMoney(data.creditRial, unit)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-300 p-3 text-center">
                  <p className="text-[11px] text-slate-500">مانده نهایی</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-slate-900">
                    {formatMoney(Math.max(data.netBalanceRial, 0), unit)}
                  </p>
                </div>
              </div>

              {/* statement table */}
              <div>
                <p className="mb-2 text-sm font-extrabold text-slate-900">گردش حساب</p>
                <Table className="border border-slate-300">
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                      <TableHead className="border border-slate-300 text-[11px] font-extrabold text-slate-700">تاریخ</TableHead>
                      <TableHead className="border border-slate-300 text-[11px] font-extrabold text-slate-700">شرح</TableHead>
                      <TableHead className="border border-slate-300 text-[11px] font-extrabold text-slate-700">نوع</TableHead>
                      <TableHead className="border border-slate-300 text-end text-[11px] font-extrabold text-slate-700">بدهکار</TableHead>
                      <TableHead className="border border-slate-300 text-end text-[11px] font-extrabold text-slate-700">بستانکار</TableHead>
                      <TableHead className="border border-slate-300 text-end text-[11px] font-extrabold text-slate-700">مانده</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.statement.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="border border-slate-300 py-8 text-center text-xs text-slate-500">
                          تراکنشی ثبت نشده است.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.statement.map((row) => (
                      <TableRow key={row.entryId} className="hover:bg-slate-50">
                        <TableCell className="whitespace-nowrap border border-slate-200 text-xs text-slate-600">
                          {formatJalali(row.date)}
                        </TableCell>
                        <TableCell className="border border-slate-200 text-xs font-medium text-slate-800">
                          {row.description}
                          <span className="ms-1.5 text-[10px] text-slate-400">{row.reference}</span>
                        </TableCell>
                        <TableCell className="border border-slate-200">
                          <Badge tone="bg-slate-100 text-slate-600">{SOURCE_LABELS[row.sourceType] ?? row.sourceType}</Badge>
                        </TableCell>
                        <TableCell className="border border-slate-200 text-end text-xs font-bold tabular-nums text-rose-700">
                          {row.debitRial > 0 ? formatMoney(row.debitRial, unit) : "—"}
                        </TableCell>
                        <TableCell className="border border-slate-200 text-end text-xs font-bold tabular-nums text-emerald-700">
                          {row.creditRial > 0 ? formatMoney(row.creditRial, unit) : "—"}
                        </TableCell>
                        <TableCell className="border border-slate-200 text-end text-xs font-extrabold tabular-nums text-slate-900">
                          {formatMoney(Math.abs(row.balanceRial), unit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* invoices */}
              <div>
                <p className="mb-2 text-sm font-extrabold text-slate-900">فاکتورهای واحد</p>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-300">
                  {data.invoices.length === 0 && (
                    <p className="py-3 text-center text-xs text-slate-500">فاکتوری صادر نشده است.</p>
                  )}
                  {data.invoices.map((inv) => (
                    <div key={inv._id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="leading-tight">
                        <p className="text-xs font-bold text-slate-800">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-slate-500">سررسید {formatJalali(inv.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="bg-slate-100 text-slate-600">{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                        <span className="text-xs font-extrabold tabular-nums text-slate-900">{formatMoney(inv.totalRial, unit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* payments */}
              <div>
                <p className="mb-2 text-sm font-extrabold text-slate-900">پرداخت‌های واحد</p>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-300">
                  {data.payments.length === 0 && (
                    <p className="py-3 text-center text-xs text-slate-500">پرداختی ثبت نشده است.</p>
                  )}
                  {data.payments.map((p) => (
                    <div key={p._id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="leading-tight">
                        <p className="text-xs font-bold text-slate-800">{p.paymentNumber}</p>
                        <p className="text-[10px] text-slate-500">{formatJalali(p.paymentDate)} — {p.payer}</p>
                      </div>
                      <span className="text-xs font-extrabold tabular-nums text-emerald-700">
                        {formatMoney(p.amountRial, unit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-[10px] text-slate-400">
                این صورت‌حساب در تاریخ {formatJalali(Date.now())} از سامانه مدیریت مجتمع شهریار استخراج شده است — مبالغ به واحد «{unit === "toman" ? "تومان" : "ریال"}».
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}