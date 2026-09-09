import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarRange, Lock, Plus, Unlock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
import { currentJalaliYear, formatJalali, jalaliToGregorian } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { Badge, ConfirmDialog, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { FISCAL_STATUS_LABELS, FISCAL_STATUS_TONES } from "./labels";

export function FiscalSection() {
  const periods = useQuery(api.accounting.fiscal.listFiscalPeriods);
  const openPeriod = useMutation(api.accounting.fiscal.openFiscalPeriod);
  const closePeriod = useMutation(api.accounting.fiscal.closeFiscalPeriod);
  const lockPeriod = useMutation(api.accounting.fiscal.lockFiscalPeriod);

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState<Id<"fiscalPeriods"> | null>(null);
  const [locking, setLocking] = useState<Id<"fiscalPeriods"> | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(`سال مالی ${toFa(currentJalaliYear() + 1)}`);
  const [year, setYear] = useState(String(currentJalaliYear() + 1));

  const submit = async () => {
    const y = Number(year);
    if (!name.trim() || !y) {
      toast.error("نام و سال دوره مالی را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      // Jalali year starts on 1 Farvardin and ends on 29/30 Esfand
      const startDate = jalaliToGregorian(y, 1, 1).getTime();
      const endDate = jalaliToGregorian(y + 1, 1, 1).getTime() - 1;
      await openPeriod({ name: name.trim(), year: y, startDate, endDate });
      toast.success("دوره مالی جدید باز شد");
      setOpen(false);
      setName(`سال مالی ${toFa(y + 1)}`);
    } catch (e) {
      toast.error((e as Error).message ?? "باز کردن دوره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const submitClose = async () => {
    if (!closing) return;
    setSaving(true);
    try {
      await closePeriod({ fiscalPeriodId: closing });
      toast.success("دوره مالی بسته شد — تراکنش‌های جدید در این بازه قفل شدند");
      setClosing(null);
    } catch (e) {
      toast.error((e as Error).message ?? "بستن دوره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const submitLock = async () => {
    if (!locking) return;
    setSaving(true);
    try {
      await lockPeriod({ fiscalPeriodId: locking });
      toast.success("دوره مالی قفل شد");
      setLocking(null);
    } catch (e) {
      toast.error((e as Error).message ?? "قفل دوره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="دوره‌های مالی"
        description="بستن دوره مالی، تراکنش‌های جدید در آن بازه را متوقف می‌کند؛ اصلاحات فقط از طریق سند معکوس ممکن است."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            دوره مالی جدید
          </Button>
        }
      />

      <Panel>
        {periods === undefined ? (
          <LoadingRow />
        ) : periods.length === 0 ? (
          <EmptyState
            title="دوره مالی باز نشده است"
            description="با «دوره مالی جدید» سال مالی جاری را تعریف کنید."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {periods.map((p) => (
              <div key={p._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarRange className="size-5" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-extrabold text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatJalali(p.startDate)} تا {formatJalali(p.endDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={FISCAL_STATUS_TONES[p.status]}>{FISCAL_STATUS_LABELS[p.status]}</Badge>
                  {p.status === "OPEN" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-bold"
                      onClick={() => setClosing(p._id)}
                    >
                      <Lock className="size-3.5" />
                      بستن دوره
                    </Button>
                  )}
                  {p.status === "CLOSED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-bold"
                      onClick={() => setLocking(p._id)}
                    >
                      <Unlock className="size-3.5" />
                      قفل نهایی
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">باز کردن دوره مالی جدید</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              یک دوره مالی در هر زمان باید «باز» باشد؛ برای باز کردن دوره جدید، دوره قبلی را ببندید.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">نام دوره</Label>
              <Input dir="rtl" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سال (شمسی)</Label>
              <Input dir="ltr" className="text-end" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "در حال باز کردن…" : "باز کردن دوره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={closing !== null}
        onOpenChange={(o) => !o && setClosing(null)}
        title="بستن دوره مالی"
        description="پس از بستن، امکان ثبت تراکنش جدید در این بازه وجود ندارد و اصلاح فقط با سند معکوس انجام می‌شود. ادامه می‌دهید؟"
        confirmLabel="بستن دوره مالی"
        pending={saving}
        onConfirm={submitClose}
      />

      <ConfirmDialog
        open={locking !== null}
        onOpenChange={(o) => !o && setLocking(null)}
        title="قفل نهایی دوره مالی"
        description="دوره به‌صورت قطعی قفل می‌شود. این عمل فقط توسط مدیر ارشد قابل انجام است. ادامه می‌دهید؟"
        confirmLabel="قفل نهایی"
        pending={saving}
        onConfirm={submitLock}
      />
    </div>
  );
}