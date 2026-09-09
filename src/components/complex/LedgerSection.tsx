import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BookOpenCheck, RefreshCw, ScrollText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatJalali } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { toFa } from "@/lib/fa";
import { useMoneyPref } from "./money-context";
import { Badge, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { JOURNAL_SOURCE_LABELS } from "./labels";

export function LedgerSection() {
  const { unit } = useMoneyPref();
  const ledger = useQuery(api.accounting.reports.ledger, { limit: 60 });
  const integrity = useQuery(api.accounting.reports.runIntegrityCheck);
  const rebuild = useMutation(api.accounting.reports.rebuildBalances);
  const [rebuilding, setRebuilding] = useState(false);

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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="دفتر کل"
        description="همه اسناد حسابداری با سند معکوس‌ها — منبع حقیقت سیستم، نه مانده‌های کش‌شده."
        action={
          <Button variant="outline" size="sm" onClick={doRebuild} disabled={rebuilding}>
            <RefreshCw className={`size-4 ${rebuilding ? "animate-spin" : ""}`} />
            بازسازی مانده‌ها
          </Button>
        }
      />

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
    </div>
  );
}