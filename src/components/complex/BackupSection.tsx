import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { AlertTriangle, DatabaseBackup, Download, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatJalali } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { ConfirmDialog, Panel, SectionHeader } from "./ui";

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

  // restore
  const uploadUrl = useAction(api.backup.generateRestoreUploadUrl);
  const restore = useAction(api.backup.restoreBackup);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);

  const totals = useMemo(() => {
    if (!backup) return 0;
    return TABLE_LABELS.reduce((sum, [key]) => {
      const rows = (backup.data as Record<string, unknown>)[key];
      return sum + (Array.isArray(rows) ? rows.length : 0);
    }, 0);
  }, [backup]);

  const doRestore = async () => {
    if (!restoreFile) return;
    if (confirmText.trim() !== "بازیابی") {
      toast.error("برای تأیید، عبارت «بازیابی» را تایپ کنید");
      return;
    }
    setRestoring(true);
    try {
      const url = await uploadUrl();
      const res = await fetch(url, { method: "PUT", body: restoreFile });
      if (!res.ok) throw new Error("آپلود فایل پشتیبان ناموفق بود");
      const text = await res.text();
      let storageId = text;
      try {
        const j = JSON.parse(text);
        if (j && typeof j.storageId === "string") storageId = j.storageId;
      } catch {
        // response body was the plain storage id
      }
      const result = await restore({ storageId: storageId as Id<"_storage"> });
      toast.success("بازیابی انجام شد", {
        description: `${toFa(result.total)} رکورد از فایل پشتیبان بازیابی شد.`,
      });
      setRestoreFile(null);
      setConfirmText("");
      setRestoreOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? "بازیابی ناموفق بود");
    } finally {
      setRestoring(false);
    }
  };

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

      {/* restore */}
      <Panel>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <UploadCloud className="size-4 text-amber-600" />
            بازیابی از فایل پشتیبان
          </h3>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-6 text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              بازیابی، همه داده‌های فعلی مجتمع و حسابداری (ساختمان‌ها، واحدها، شارژها، فاکتورها، پرداخت‌ها، دفتر کل و گزارش عملیات) را حذف و با محتوای فایل پشتیبان جایگزین می‌کند. حساب‌های کاربری و آگهی‌های قبلی دست‌نخورده می‌مانند. این عملیات قابل بازگشت نیست — قبل از آن یک پشتیبان جدید بگیرید.
            </span>
          </div>
          {restoreFile === null ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center transition hover:border-primary/50 hover:bg-muted/30">
              <UploadCloud className="size-8 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">انتخاب فایل پشتیبان (JSON)</span>
              <span className="text-[10px] text-muted-foreground">فایلی که از همین بخش دانلود کرده‌اید (shahriar-backup-*.json)</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-bold text-foreground" dir="ltr">{restoreFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(restoreFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setRestoreFile(null)} disabled={restoring}>
                  حذف فایل
                </Button>
              </div>
              <Button
                variant="destructive"
                className="mt-4 w-full gap-2"
                onClick={() => setRestoreOpen(true)}
                disabled={restoring}
              >
                <UploadCloud className="size-4" />
                شروع بازیابی
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <h3 className="border-b border-border/70 px-4 py-3 text-sm font-extrabold text-foreground">نکات امنیتی پشتیبان</h3>
        <ul className="space-y-1.5 px-4 py-3 text-[11px] leading-6 text-muted-foreground">
          <li>• پشتیبان فقط برای مدیر ارشد قابل تهیه است و شامل رمز عبور یا توکن هیچ‌کس نمی‌شود.</li>
          <li>• فایل را در فضای امن (نه داخل همین سامانه) نگه دارید و قبل از بازنویسی نسخه قبلی، نسخه‌های قدیمی را نگه دارید.</li>
          <li>• پس از دانلود، مطمئن شوید فایل باز و خوانا است (قابل باز شدن با هر ویرایشگر JSON).</li>
        </ul>
      </Panel>

      {/* restore confirmation (two-step) */}
      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={(o) => {
          if (!o) setRestoreOpen(false);
        }}
        title="بازیابی از فایل پشتیبان"
        description={
          <div className="space-y-2">
            <p className="text-xs leading-6 text-muted-foreground">
              همه داده‌های فعلی مجتمع و حسابداری حذف و با محتوای فایل «{restoreFile?.name ?? ""}» جایگزین می‌شود.
            </p>
            <p className="text-xs font-bold text-foreground">برای تأیید نهایی، عبارت «بازیابی» را تایپ کنید:</p>
            <Input
              dir="rtl"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="بازیابی"
              className="text-xs"
            />
          </div>
        }
        confirmLabel="بازیابی داده‌ها"
        pending={restoring}
        onConfirm={doRestore}
      />
    </div>
  );
}