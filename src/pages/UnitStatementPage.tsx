import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowRight, CalendarRange, FileDown, Printer, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatJalali, jalaliStrToMs } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { toFa } from "@/lib/fa";
import { useMoneyPref } from "@/components/complex/money-context";
import { LoadingRow } from "@/components/complex/ui";
import { INVOICE_STATUS_LABELS, JOURNAL_SOURCE_LABELS as SOURCE_LABELS } from "@/components/complex/labels";
import { downloadCsv } from "@/lib/export";

/** Persian text hidden from screen but kept in the print/PDF layout. */
const PrintOnly = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only print:sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
    {children}
  </span>
);

/**
 * Standalone, print-optimized unit statement (RTL).
 *
 * A4 portrait is the designed size: the sheet is exactly 210mm wide and the
 * table never exceeds the paper width, so no row ever splits into two ghost
 * rows and no horizontal scrollbar strip appears — on A4 and on any larger
 * paper (A3/letter) the sheet stays centered at true physical size.
 *
 * - Date range: from/to Jalali inputs filter the گردش حساب server-side.
 * - ?print=1 opens the print dialog automatically once data is ready.
 */
export default function UnitStatementPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { unit } = useMoneyPref();

  const [fromStr, setFromStr] = useState(searchParams.get("from") ?? "");
  const [toStr, setToStr] = useState(searchParams.get("to") ?? "");

  const fromMs = fromStr ? jalaliStrToMs(fromStr) : null;
  const toMs = toStr ? jalaliStrToMs(toStr, true) : null;
  const rangeInvalid = (fromStr !== "" && fromMs === null) || (toStr !== "" && toMs === null);
  const hasRange = fromStr !== "" || toStr !== "";

  const data = useQuery(
    api.accounting.reports.unitStatement,
    unitId
      ? {
          unitId: unitId as Id<"units">,
          from: fromMs ?? undefined,
          to: toMs ?? undefined,
        }
      : "skip",
  );

  useEffect(() => {
    if (searchParams.get("print") === "1" && data) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [searchParams, data]);

  const rangeLabel = () => {
    if (rangeInvalid) return "بازه نامعتبر";
    if (!hasRange) return "همه دوره‌ها";
    const from = fromStr && fromMs !== null ? toFa(fromStr) : "ابتدا";
    const to = toStr && toMs !== null ? toFa(toStr) : "اکنون";
    return `${from} تا ${to}`;
  };

  const onPrint = () => {
    if (!data) return;
    window.print();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`
        /* A4 portrait is the design size. 190mm = 210mm paper − 2×10mm margin:
           the sheet can never exceed the printable width, so rows never wrap
           into a second line and no horizontal scrollbar strip is drawn. */
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; width: auto !important; }
          /* Neutralize the table scroll-container clip (shadcn wrapper):
             overflow:auto in print clips the table and draws a bar under it. */
          [data-slot="table-container"] { overflow: visible !important; }
          thead { display: table-header-group; }
          tr, td, th { page-break-inside: avoid; break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white/90 px-4 py-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="size-3.5" />
            بازگشت به پنل
          </Button>
          <span className="text-xs font-bold text-slate-600">
            صورت‌حساب واحد {data?.unit?.unitNumber ?? "…"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* date range filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5">
            <CalendarRange className="size-3.5 text-slate-500" />
            <div className="flex items-center gap-1">
              <Label className="text-[10px] font-bold text-slate-500">از</Label>
              <Input
                dir="ltr"
                className="h-7 w-24 text-end text-xs"
                placeholder="1405/06/01"
                value={fromStr}
                onChange={(e) => setFromStr(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] font-bold text-slate-500">تا</Label>
              <Input
                dir="ltr"
                className="h-7 w-24 text-end text-xs"
                placeholder="1405/06/30"
                value={toStr}
                onChange={(e) => setToStr(e.target.value)}
              />
            </div>
            {hasRange && (
              <Button
                variant="ghost"
                size="icon"
                className="size-6 rounded-lg"
                aria-label="حذف بازه"
                onClick={() => {
                  setFromStr("");
                  setToStr("");
                }}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>

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
          <Button size="sm" className="gap-1.5 text-xs font-bold" onClick={onPrint}>
            <Printer className="size-3.5" />
            چاپ / ذخیره PDF
          </Button>
        </div>
      </div>

      {/* A4 sheet — exactly one paper width; centered on screen, true-to-size in print. */}
      <div className="mx-auto w-[190mm] max-w-full px-2 py-6 print:w-[190mm] print:max-w-none print:p-0 print:m-0">
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          {data === undefined ? (
            <div className="py-16">
              <LoadingRow />
            </div>
          ) : (
            <div className="space-y-6 print:space-y-4">
              {/* letterhead */}
              <div className="border-b-2 border-slate-800 pb-4 text-center">
                <p className="text-xl font-extrabold text-slate-900 print:text-lg">مجتمع تجاری اداری شهریار</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  صورت‌حساب واحد {data.unit.unitNumber} — {data.unit.usage}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  حساب مالی: {data.account.accountNumber} — مالک: {data.unit.ownerName ?? "—"}
                  {data.unit.tenantName ? ` — مستأجر: ${data.unit.tenantName}` : ""}
                  {data.unit.ownerPhone ? ` — تلفن مالک: ${data.unit.ownerPhone}` : ""}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-600">بازه گزارش: {rangeLabel()}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {toFa(data.statement.length)} ردیف گردش حساب در این بازه
                </p>
              </div>

              {/* summary balances — compact on paper */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-300 p-3 text-center">
                  <p className="text-[11px] text-slate-500">مانده بدهی</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-rose-700">
                    {formatMoney(data.balanceRial, unit)}
                    <PrintOnly> تومان</PrintOnly>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-300 p-3 text-center">
                  <p className="text-[11px] text-slate-500">بستانکاری (پیش‌پرداخت)</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-emerald-700">
                    {formatMoney(data.creditRial, unit)}
                    <PrintOnly> تومان</PrintOnly>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-300 p-3 text-center">
                  <p className="text-[11px] text-slate-500">مانده نهایی</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-slate-900">
                    {formatMoney(Math.max(data.netBalanceRial, 0), unit)}
                    <PrintOnly> تومان</PrintOnly>
                  </p>
                </div>
              </div>

              {/* statement table — designed for A4: no cell wraps to a second line */}
              <div className="w-full">
                <p className="mb-2 text-sm font-extrabold text-slate-900">گردش حساب</p>
                <table className="w-full table-fixed border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="w-[13%] border border-slate-300 px-1 py-1.5 text-start font-extrabold text-slate-700">تاریخ</th>
                      <th className="w-[33%] border border-slate-300 px-1 py-1.5 text-start font-extrabold text-slate-700">شرح</th>
                      <th className="w-[11%] border border-slate-300 px-1 py-1.5 text-center font-extrabold text-slate-700">نوع</th>
                      <th className="w-[15%] border border-slate-300 px-1 py-1.5 text-end font-extrabold text-slate-700">بدهکار</th>
                      <th className="w-[15%] border border-slate-300 px-1 py-1.5 text-end font-extrabold text-slate-700">بستانکار</th>
                      <th className="w-[13%] border border-slate-300 px-1 py-1.5 text-end font-extrabold text-slate-700">مانده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.statement.length === 0 && (
                      <tr>
                        <td colSpan={6} className="border border-slate-300 py-8 text-center text-slate-500">
                          تراکنشی در این بازه ثبت نشده است.
                        </td>
                      </tr>
                    )}
                    {data.statement.map((row) => (
                      <tr key={row.entryId} className="bg-white">
                        <td className="border border-slate-200 px-1 py-1 text-slate-600">{formatJalali(row.date)}</td>
                        <td className="border border-slate-200 px-1 py-1 font-medium text-slate-800">
                          <span className="block truncate" title={`${row.description} ${row.reference}`}>
                            {row.description}
                            <span className="ms-1 text-[9px] font-normal text-slate-400">{row.reference}</span>
                          </span>
                        </td>
                        <td className="border border-slate-200 px-1 py-1 text-center text-[9px] text-slate-600">
                          {SOURCE_LABELS[row.sourceType] ?? row.sourceType}
                        </td>
                        <td className="border border-slate-200 px-1 py-1 text-end font-bold tabular-nums text-rose-700">
                          {row.debitRial > 0 ? formatMoney(row.debitRial, unit) : "—"}
                        </td>
                        <td className="border border-slate-200 px-1 py-1 text-end font-bold tabular-nums text-emerald-700">
                          {row.creditRial > 0 ? formatMoney(row.creditRial, unit) : "—"}
                        </td>
                        <td className="border border-slate-200 px-1 py-1 text-end font-extrabold tabular-nums text-slate-900">
                          {formatMoney(Math.abs(row.balanceRial), unit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* invoices — continue on the next sheet */}
              <div className="w-full print:break-before-page">
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
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </span>
                        <span className="text-xs font-extrabold tabular-nums text-slate-900">{formatMoney(inv.totalRial, unit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* payments — continue on the next sheet */}
              <div className="w-full print:break-before-page">
                <p className="mb-2 text-sm font-extrabold text-slate-900">پرداخت‌های واحد</p>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-300">
                  {data.payments.length === 0 && (
                    <p className="py-3 text-center text-xs text-slate-500">پرداختی ثبت نشده است.</p>
                  )}
                  {data.payments.map((p) => (
                    <div key={p._id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="leading-tight">
                        <p className="text-xs font-bold text-slate-800">{p.paymentNumber} — {p.payer}</p>
                        <p className="text-[10px] text-slate-500">{formatJalali(p.paymentDate)}</p>
                      </div>
                      <span className="text-xs font-extrabold tabular-nums text-emerald-700">
                        {formatMoney(p.amountRial, unit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-[10px] text-slate-400">
                این صورت‌حساب در تاریخ {formatJalali(Date.now())} از سامانه مدیریت مجتمع شهریار استخراج شده است — مبالغ به واحد «تومان».
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
