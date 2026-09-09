import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, XCircle } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatJalali } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { useMoneyPref } from "./money-context";
import { MoneyInput } from "./MoneyInput";
import { Badge, ConfirmDialog, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_TONES } from "./labels";

export function ExpensesSection() {
  const { unit, setUnit } = useMoneyPref();
  const expenses = useQuery(api.accounting.expenses.listExpenses, {});
  const categories = useQuery(api.accounting.expenses.listExpenseCategories);
  const treasury = useQuery(api.accounting.accounts.listTreasury);
  const createExpense = useMutation(api.accounting.expenses.createExpense);
  const voidExpense = useMutation(api.accounting.expenses.voidExpense);

  const [open, setOpen] = useState(false);
  const [voiding, setVoiding] = useState<Id<"expenses"> | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("4-01");
  const [amount, setAmount] = useState(0);
  const [vendor, setVendor] = useState("");
  const [desc, setDesc] = useState("");
  const [paidNow, setPaidNow] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [place, setPlace] = useState("");

  const cashAccounts = treasury?.cash ?? [];
  const bankAccounts = treasury?.banks ?? [];

  const resetForm = () => {
    setTitle("");
    setCategory("4-01");
    setAmount(0);
    setVendor("");
    setDesc("");
    setPaidNow(false);
    setPaidAmount(0);
    setPlace("");
  };

  const totalUnpaid = useMemo(
    () => (expenses ?? []).filter((e) => e.status !== "VOID").reduce((s, e) => s + e.remainingRial, 0),
    [expenses],
  );

  const submit = async () => {
    if (!title.trim() || amount <= 0) {
      toast.error("عنوان و مبلغ هزینه را وارد کنید");
      return;
    }
    if (paidNow && paidAmount > 0 && !place) {
      toast.error("برای پرداخت نقدی، صندوق یا بانک را انتخاب کنید");
      return;
    }
    setSaving(true);
    try {
      const res = await createExpense({
        title: title.trim(),
        categoryCode: category,
        amountRial: amount,
        vendor: vendor.trim() || undefined,
        description: desc.trim() || undefined,
        paidAmountRial: paidNow ? paidAmount : undefined,
        cashAccountId: place.startsWith("cash:") ? (place.slice(5) as Id<"cashAccounts">) : undefined,
        bankAccountId: place.startsWith("bank:") ? (place.slice(5) as Id<"bankAccounts">) : undefined,
      });
      toast.success("هزینه ثبت شد", { description: res.expenseNumber });
      setOpen(false);
      resetForm();
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت هزینه ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const submitVoid = async () => {
    if (!voiding || !voidReason.trim()) {
      toast.error("علت باطل‌کردن را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await voidExpense({ expenseId: voiding, reason: voidReason.trim() });
      toast.success("هزینه باطل شد — سند معکوس ثبت شد");
      setVoiding(null);
      setVoidReason("");
    } catch (e) {
      toast.error((e as Error).message ?? "باطل‌کردن ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="هزینه‌ها"
        description="ثبت هزینه‌های مجتمع (برق، آب، نگهبانی، تعمیرات و…) — هزینه‌های پرداخت‌نشده به‌صورت بدهی (پرداختنی) ثبت می‌شوند."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            ثبت هزینه
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
        <p className="text-xs font-bold text-muted-foreground">جمع بدهی‌های پرداخت‌نشده (پرداختنی به پیمانکاران)</p>
        <p className="text-base font-extrabold tabular-nums text-rose-600">{formatMoney(totalUnpaid, unit)}</p>
      </div>

      <Panel>
        {expenses === undefined ? (
          <LoadingRow />
        ) : expenses.length === 0 ? (
          <EmptyState
            title="هزینه‌ای ثبت نشده است"
            description="اولین هزینه مجتمع را با دکمه «ثبت هزینه» ثبت کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-extrabold text-foreground">شماره</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">عنوان</TableHead>
                  <TableHead className="hidden text-xs font-extrabold text-foreground lg:table-cell">پیمانکار</TableHead>
                  <TableHead className="hidden text-xs font-extrabold text-foreground lg:table-cell">تاریخ</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">مبلغ</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">مانده</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">وضعیت</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e._id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-bold">{e.expenseNumber}</TableCell>
                    <TableCell>
                      <p className="max-w-[180px] truncate text-xs font-medium">{e.title}</p>
                      <p className="text-[10px] text-muted-foreground">{e.categoryCode}</p>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{e.vendor ?? "—"}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{formatJalali(e.expenseDate)}</TableCell>
                    <TableCell className="text-end text-xs font-extrabold tabular-nums">{formatMoney(e.amountRial, unit)}</TableCell>
                    <TableCell className="text-end text-xs font-bold tabular-nums text-rose-600">
                      {e.remainingRial > 0 ? formatMoney(e.remainingRial, unit) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge tone={EXPENSE_STATUS_TONES[e.status]}>{EXPENSE_STATUS_LABELS[e.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      {e.paidRial === 0 && e.status !== "VOID" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="باطل‌کردن هزینه"
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => setVoiding(e._id)}
                        >
                          <XCircle className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      {/* create expense */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass max-w-lg border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ثبت هزینه</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              هزینه ثبت‌شده در دفتر کل منعکس می‌شود؛ اگر پرداخت نشود، به‌صورت بدهی (پرداختنی) باقی می‌ماند.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">عنوان هزینه</Label>
              <Input dir="rtl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: قبض برق مشاعات" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">دسته هزینه</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">پیمانکار / فروشنده</Label>
              <Input dir="rtl" value={vendor} onChange={(e) => setVendor(e.target.value)} className="text-xs" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <MoneyInput label="مبلغ هزینه" valueRial={amount} onChange={setAmount} unit={unit} onUnitChange={setUnit} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-foreground">پرداخت هم‌زمان</p>
                  <p className="text-[10px] text-muted-foreground">بخشی از هزینه همین حالا پرداخت شود</p>
                </div>
                <Switch checked={paidNow} onCheckedChange={setPaidNow} />
              </div>
            </div>
            {paidNow && (
              <>
                <div className="col-span-2 space-y-1.5">
                  <MoneyInput label="مبلغ پرداختی" valueRial={paidAmount} onChange={setPaidAmount} unit={unit} onUnitChange={setUnit} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold">پرداخت از</Label>
                  <Select value={place || undefined} onValueChange={setPlace}>
                    <SelectTrigger><SelectValue placeholder="صندوق یا بانک…" /></SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map((c) => (
                        <SelectItem key={`cash:${c._id}`} value={`cash:${c._id}`}>صندوق: {c.name}</SelectItem>
                      ))}
                      {bankAccounts.map((b) => (
                        <SelectItem key={`bank:${b._id}`} value={`bank:${b._id}`}>بانک: {b.bankName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">توضیحات</Label>
              <Textarea dir="rtl" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-14 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت هزینه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={voiding !== null}
        onOpenChange={(open) => {
          if (!open) {
            setVoiding(null);
            setVoidReason("");
          }
        }}
        title="باطل‌کردن هزینه"
        description={
          <div className="space-y-2">
            <p>سند هزینه معکوس و بدهی پرداختنی آن حذف می‌شود.</p>
            <Input
              dir="rtl"
              placeholder="علت باطل‌کردن (الزامی)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="text-xs"
            />
          </div>
        }
        confirmLabel="باطل‌کردن هزینه"
        pending={saving}
        onConfirm={submitVoid}
      />
    </div>
  );
}