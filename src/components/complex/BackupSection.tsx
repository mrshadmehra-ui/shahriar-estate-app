import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { DatabaseBackup, Download, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { formatJalali } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { Panel, SectionHeader } from "./ui";

const TABLE_LABELS: Array<[string, string]> = [
  ["buildings", "ساختمان‌ها"],
  ["units", "واحدها"],
  ["financialAccounts", "حساب‌های مالی"],
  ["chartOfAccounts", "سرفصل‌ها"],
  ["fiscalPeriods", "دوره‌های مالی"],
  ["chargeRules", "قوانین شارژ"],
  ["charges", "شارژها"],
  ["invoices", "فاکتورها"],
  ["invoiceItems", "ردیف فاکتور"],
  ["payments", "دریافت‌ها/پرداخت‌ها"],
  ["paymentAllocations", "تخصیص پرداخت‌ها"],
  ["expenses", "هزینه‌ها"],
  ["cashAccounts", "صندوق‌ها"],
  ["bankAccounts", "بانک‌ها"],
  ["funds", "صندوق‌های تخصصی"],
  ["transfers", "انتقالات"],
  ["refunds", "برگشت‌ها"],
  ["journal", "اسناد دفتر کل"],
  ["journalEntries", "ردیف‌های دفتر کل"],
  ["auditLog", "گزارش عملیات"],
  ["notifications", "اعلان‌ها"],
  ["counters", "شمارنده‌ها"],
  ["settings", "تنظیمات"],
  ["users", "کاربران"],
];

export function BackupSection() {
  const [enabled, setEnabled] = useState(false);
  const backup = useQuery(api.backup.exportBackup, enabled ? {} : "skip");
  const [downloading, setDownloading] = useState(false);

  const totals = useMemo(() => {
    if (!backup) return 0;
    return TABLE_LABELS.reduce((sum, [key]) => {
      const rows = (backup.data as Record<string, unknown>)[key];
      return sum + (Array.isArray(rows) ? rows.length : 0);
    }, 0);
  }, [backup]);

  const download = () => {
    if (!backup) return;
    setDownloading(true);
    try {
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date(backup.exportedAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      a.href = url;
      a.download = `shahriar-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="پشتیبان‌گیری از داده‌ها"
        description="خروجی کامل (JSON) از تمام داده‌های مجتمع — ساختمان‌ها، واحدها، حسابداری، دفتر کل و گزارش عملیات. فقط مدیر ارشد."
        action={
          !enabled ? (
            <Button size="sm" onClick={() => setEnabled(true)}>
              <DatabaseBackup className="size-4" />
              تهیه پشتیبان
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEnabled(false)}>
              <RefreshCw className="size-4" />
              به‌روزرسانی
            </Button>
          )
        }
      />

      <div className="rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ShieldCheck className="size-4 text-emerald-600" />
            وضعیت پشتیبان
          </h3>
        </div>
        {!enabled ? (
          <div className="p-6 text-center">
            <p className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <DatabaseBackup className="size-7" />
            </p>
            <p className="mt-3 text-sm font-bold text-foreground">هنوز پشتیبان‌گیری انجام نشده است</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-6 text-muted-foreground">
              با دکمه «تهیه پشتیبان» یک نسخه کامل از داده‌ها گرفته می‌شود و می‌توانید آن را به‌صورت فایل JSON دانلود کنید.
              فایل پشتیبان را در جای امن نگه دارید — شامل اطلاعات مالی و اطلاعات تماس مالکین/مستأجرین است.
            </p>
          </div>
        ) : backup === undefined ? (
          <div className="p-8 text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">در حال جمع‌آوری داده‌ها…</p>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums text-foreground">{toFa(totals)}</p>
                <p className="text-[11px] text-muted-foreground">کل رکوردها</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums text-foreground">{toFa(TABLE_LABELS.length)}</p>
                <p className="text-[11px] text-muted-foreground">جدول</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums text-foreground">{toFa((backup.data.journal as unknown[]).length)}</p>
                <p className="text-[11px] text-muted-foreground">سند دفتر کل</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-sm font-extrabold tabular-nums text-foreground">{formatJalali(backup.exportedAt, true)}</p>
                <p className="text-[11px] text-muted-foreground">زمان تهیه</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl border border-border/60 p-4 sm:grid-cols-3">
              {TABLE_LABELS.map(([key, label]) => {
                const rows = (backup.data as Record<string, unknown>)[key];
                const count = Array.isArray(rows) ? rows.length : 0;
                return (
                  <div key={key} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-bold tabular-nums text-foreground">{toFa(count)}</span>
                  </div>
                );
              })}
            </div>

            <Button className="mt-4 w-full gap-2" onClick={download} disabled={downloading}>
              <Download className="size-4" />
              {downloading ? "در حال آماده‌سازی…" : "دانلود فایل پشتیبان (JSON)"}
            </Button>
            <p className="mt-2 text-center text-[10px] leading-5 text-muted-foreground">
              فرمت: {`{ app, version, exportedAt, data: { … } }`} — مبالغ همه به ریال ذخیره شده‌اند. بازیابی (Restore) از همین فایل در مرحله بعد قابل افزودن است.
            </p>
          </div>
        )}
      </div>

      <Panel>
        <h3 className="border-b border-border/70 px-4 py-3 text-sm font-extrabold text-foreground">نکات امنیتی پشتیبان</h3>
        <ul className="space-y-1.5 px-4 py-3 text-[11px] leading-6 text-muted-foreground">
          <li>• پشتیبان فقط برای مدیر ارشد قابل تهیه است و شامل رمز عبور یا توکن هیچ‌کس نمی‌شود.</li>
          <li>• فایل را در فضای امن (نه داخل همین سامانه) نگه دارید و قبل از بازنویسی نسخه قبلی، نسخه‌های قدیمی را نگه دارید.</li>
          <li>• پس از دانلود، مطمئن شوید فایل باز و خوانا است (قابل باز شدن با هر ویرایشگر JSON).</li>
        </ul>
      </Panel>
    </div>
  );
}