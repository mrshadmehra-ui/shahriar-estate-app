import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownLeft, HandCoins, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatJalali } from "@/lib/jalali";
import { formatMoney, MONEY_UNIT_LABELS, parseRialInput } from "@/lib/money";
import { useMoneyPref } from "./money-context";
import { MoneyInput } from "./MoneyInput";
import { Badge, ConfirmDialog, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { METHOD_LABELS } from "./labels";

const METHODS = ["CASH", "BANK_TRANSFER", "CARD", "POS", "ONLINE", "CHEQUE", "OTHER"] as const;

export function PaymentsSection() {
  const { unit, setUnit } = useMoneyPref();
  const payments = useQuery(api.accounting.payments.listPayments, {});
  const units = useQuery(api.accounting.charges.listUnitsForCharges);
  const expenses = useQuery(api.accounting.expenses.listExpenses, {});
  const treasury = useQuery(api.accounting.accounts.listTreasury);
  const recordPayment = useMutation(api.accounting.payments.recordPayment);
  const recordExpensePayment = useMutation(api.accounting.payments.recordExpensePayment);
  const recordRefund = useMutation(api.accounting.payments.recordRefund);
  const voidPayment = useMutation(api.accounting.payments.voidPayment);

  const [payOpen, setPayOpen] = useState(false);
  const [expensePayOpen, setExpensePayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [voiding, setVoiding] = useState<Id<"payments"> | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [saving, setSaving] = useState(false);

  // unit payment form
  const [payUnit, setPayUnit] = useState<string>("");
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payPlace, setPayPlace] = useState<string>(""); // cash or bank
  const [payPayer, setPayPayer] = useState("");
  const [payTracking, setPayTracking] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [allocManual, setAllocManual] = useState(false);
  const [allocMap, setAllocMap] = useState<Record<string, number>>({});
  const [allocRaw, setAllocRaw] = useState<Record<string, string>>({});

  const openInvoices = useQuery(
    api.accounting.invoices.listInvoices,
    payUnit ? { unitId: payUnit as Id<"units"> } : "skip",
  );
  const unitOpenInvoices = useMemo(
    () =>
      (openInvoices ?? []).filter(
        (inv) =>
          inv.remainingRial > 0 &&
          inv.status !== "VOID" &&
          inv.status !== "CANCELLED" &&
          inv.status !== "PAID",
      ),
    [openInvoices],
  );

  const cashAccounts = treasury?.cash ?? [];
  const bankAccounts = treasury?.banks ?? [];

  const resetPayForm = () => {
    setPayUnit("");
    setPayAmount(0);
    setPayMethod("CASH");
    setPayPlace("");
    setPayPayer("");
    setPayTracking("");
    setPayReference("");
    setPayDesc("");
    setAllocManual(false);
    setAllocMap({});
    setAllocRaw({});
  };

  const submitPayment = async () => {
    if (!payUnit || payAmount <= 0) {
      toast.error("واحد و مبلغ پرداخت را وارد کنید");
      return;
    }
    if (!payPlace) {
      toast.error("صندوق یا حساب بانکی را انتخاب کنید");
      return;
    }
    setSaving(true);
    try {
      const allocations = allocManual
        ? unitOpenInvoices
            .filter((inv) => (allocMap[inv._id] ?? 0) > 0)
            .map((inv) => ({ invoiceId: inv._id, amountRial: allocMap[inv._id] }))
        : undefined;
      const res = await recordPayment({
        unitId: payUnit as Id<"units">,
        payer: payPayer.trim() || undefined,
        amountRial: payAmount,
        method: payMethod as (typeof METHODS)[number],
        trackingCode: payTracking.trim() || undefined,
        referenceNumber: payReference.trim() || undefined,
        description: payDesc.trim() || undefined,
        cashAccountId: payPlace.startsWith("cash:") ? (payPlace.slice(5) as Id<"cashAccounts">) : undefined,
        bankAccountId: payPlace.startsWith("bank:") ? (payPlace.slice(5) as Id<"bankAccounts">) : undefined,
        allocations: allocations && allocations.length > 0 ? allocations : undefined,
      });
      toast.success("دریافت ثبت شد", {
        description: `${res.paymentNumber} — ${res.creditRial > 0 ? `${formatMoney(res.creditRial, unit)} بستانکاری واحد` : "تسویه فاکتورها"}`,
      });
      setPayOpen(false);
      resetPayForm();
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت دریافت ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  // expense payment form
  const [expenseId, setExpenseId] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseMethod, setExpenseMethod] = useState<string>("BANK_TRANSFER");
  const [expensePlace, setExpensePlace] = useState<string>("");
  const [expenseRef, setExpenseRef] = useState("");

  const submitExpensePayment = async () => {
    if (!expenseId || expenseAmount <= 0) {
      toast.error("هزینه و مبلغ پرداخت را وارد کنید");
      return;
    }
    if (!expensePlace) {
      toast.error("صندوق یا حساب بانکی را انتخاب کنید");
      return;
    }
    setSaving(true);
    try {
      await recordExpensePayment({
        expenseId: expenseId as Id<"expenses">,
        amountRial: expenseAmount,
        method: expenseMethod as (typeof METHODS)[number],
        referenceNumber: expenseRef.trim() || undefined,
        cashAccountId: expensePlace.startsWith("cash:") ? (expensePlace.slice(5) as Id<"cashAccounts">) : undefined,
        bankAccountId: expensePlace.startsWith("bank:") ? (expensePlace.slice(5) as Id<"bankAccounts">) : undefined,
      });
      toast.success("پرداخت هزینه ثبت شد");
      setExpensePayOpen(false);
      setExpenseId("");
      setExpenseAmount(0);
      setExpensePlace("");
      setExpenseRef("");
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت پرداخت ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  // refund form
  const [refundUnit, setRefundUnit] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<string>("CASH");
  const [refundPlace, setRefundPlace] = useState<string>("");

  const submitRefund = async () => {
    if (!refundUnit || refundAmount <= 0 || !refundReason.trim()) {
      toast.error("واحد، مبلغ و علت برگشت را وارد کنید");
      return;
    }
    if (!refundPlace) {
      toast.error("صندوق یا حساب بانکی را انتخاب کنید");
      return;
    }
    setSaving(true);
    try {
      await recordRefund({
        unitId: refundUnit as Id<"units">,
        amountRial: refundAmount,
        reason: refundReason.trim(),
        method: refundMethod as (typeof METHODS)[number],
        cashAccountId: refundPlace.startsWith("cash:") ? (refundPlace.slice(5) as Id<"cashAccounts">) : undefined,
        bankAccountId: refundPlace.startsWith("bank:") ? (refundPlace.slice(5) as Id<"bankAccounts">) : undefined,
      });
      toast.success("برگشت وجه ثبت شد");
      setRefundOpen(false);
      setRefundUnit("");
      setRefundAmount(0);
      setRefundReason("");
      setRefundPlace("");
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت برگشت وجه ناموفق بود");
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
      await voidPayment({ paymentId: voiding, reason: voidReason.trim() });
      toast.success("پرداخت باطل شد — سند معکوس ثبت شد");
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
        title="دریافت‌ها و پرداخت‌ها"
        description="ثبت دریافت از واحدها با تخصیص به فاکتورها (تسویه جزئی، کامل و بستانکاری)، پرداخت هزینه‌ها و برگشت وجه."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setExpensePayOpen(true)}>
              <ArrowDownLeft className="size-4" />
              پرداخت هزینه
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRefundOpen(true)}>
              <RotateCcw className="size-4" />
              برگشت وجه
            </Button>
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <HandCoins className="size-4" />
              ثبت دریافت
            </Button>
          </div>
        }
      />

      <Panel>
        {payments === undefined ? (
          <LoadingRow />
        ) : payments.length === 0 ? (
          <EmptyState
            title="پرداختی ثبت نشده است"
            description="با «ثبت دریافت» اولین پرداخت واحد را ثبت کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-extrabold text-foreground">شماره</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">پرداخت‌کننده</TableHead>
                  <TableHead className="hidden text-xs font-extrabold text-foreground lg:table-cell">تاریخ</TableHead>
                  <TableHead className="hidden text-xs font-extrabold text-foreground lg:table-cell">روش</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">مبلغ</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">وضعیت</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p._id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-bold">{p.paymentNumber}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{p.payer}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.kind === "UNIT_PAYMENT" ? `واحد ${p.unit?.unitNumber ?? "—"}` : `هزینه: ${p.expense?.title ?? "—"}`}
                        {p.creditRial > 0 && <span className="ms-1 text-emerald-600">({formatMoney(p.creditRial, unit)} بستانکاری)</span>}
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{formatJalali(p.paymentDate)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge tone="bg-muted text-muted-foreground">{METHOD_LABELS[p.method]}</Badge>
                    </TableCell>
                    <TableCell className="text-end text-xs font-extrabold tabular-nums">
                      {formatMoney(p.amountRial, unit)}
                    </TableCell>
                    <TableCell>
                      <Badge tone={p.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 line-through"}>
                        {p.status === "COMPLETED" ? "تسویه‌شده" : "باطل‌شده"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      {p.status === "COMPLETED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="باطل‌کردن پرداخت"
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => setVoiding(p._id)}
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

      {/* record payment */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="glass max-h-[85vh] max-w-lg overflow-y-auto border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ثبت دریافت از واحد</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              مبلغ اضافه از بدهی به‌صورت خودکار «بستانکاری» واحد می‌شود و هرگز گم نمی‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">واحد</Label>
              <Select
                value={payUnit || undefined}
                onValueChange={(v) => {
                  setPayUnit(v);
                  setAllocMap({});
                }}
              >
                <SelectTrigger><SelectValue placeholder="انتخاب واحد…" /></SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u._id} value={u._id}>واحد {u.unitNumber} — {u.ownerName ?? u.tenantName ?? u.usage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MoneyInput label="مبلغ دریافت" valueRial={payAmount} onChange={setPayAmount} unit={unit} onUnitChange={setUnit} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">روش پرداخت</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">صندوق / بانک</Label>
                <Select value={payPlace || undefined} onValueChange={setPayPlace}>
                  <SelectTrigger><SelectValue placeholder="انتخاب…" /></SelectTrigger>
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
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">پرداخت‌کننده</Label>
                <Input dir="rtl" className="text-xs" value={payPayer} onChange={(e) => setPayPayer(e.target.value)} placeholder="نام مالک/مستأجر" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">کد پیگیری</Label>
                <Input dir="ltr" className="text-end text-xs" value={payTracking} onChange={(e) => setPayTracking(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">شماره مرجع</Label>
                <Input dir="ltr" className="text-end text-xs" value={payReference} onChange={(e) => setPayReference(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">توضیحات</Label>
                <Input dir="rtl" className="text-xs" value={payDesc} onChange={(e) => setPayDesc(e.target.value)} />
              </div>
            </div>

            {/* allocations */}
            <div className="rounded-xl border border-border/70">
              <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
                <span className="text-[11px] font-bold text-muted-foreground">تخصیص به فاکتورها</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <Checkbox checked={allocManual} onCheckedChange={(v) => setAllocManual(!!v)} />
                  تخصیص دستی
                </label>
              </div>
              {!payUnit ? (
                <p className="px-3 py-5 text-center text-xs text-muted-foreground">ابتدا واحد را انتخاب کنید.</p>
              ) : unitOpenInvoices.length === 0 ? (
                <p className="px-3 py-5 text-center text-xs text-muted-foreground">
                  فاکتور باز ندارد — پرداخت به‌صورت بستانکاری (پیش‌پرداخت) ثبت می‌شود.
                </p>
              ) : allocManual ? (
                <div className="divide-y divide-border/60">
                  {unitOpenInvoices.map((inv) => (
                    <div key={inv._id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="leading-tight">
                        <p className="text-xs font-bold">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-muted-foreground">مانده: {formatMoney(inv.remainingRial, unit)}</p>
                      </div>
                      <Input
                        dir="ltr"
                        className="h-8 w-32 text-end text-xs"
                        value={allocRaw[inv._id] ?? ""}
                        placeholder={`به ${MONEY_UNIT_LABELS[unit]}`}
                        onChange={(e) => {
                          setAllocRaw((prev) => ({ ...prev, [inv._id]: e.target.value }));
                          const parsed = parseRialInput(e.target.value, unit);
                          setAllocMap((prev) => ({
                            ...prev,
                            [inv._id]: Number.isNaN(parsed) ? 0 : parsed,
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-5 text-center text-xs text-muted-foreground">
                  تسویه خودکار بر اساس قدیمی‌ترین سررسید (FIFO) انجام می‌شود — مبلغ اضافه بستانکاری می‌شود.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>انصراف</Button>
            <Button onClick={submitPayment} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت دریافت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* expense payment */}
      <Dialog open={expensePayOpen} onOpenChange={setExpensePayOpen}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">پرداخت هزینه</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              پرداخت بدهی به پیمانکار یا فروشنده از صندوق یا بانک.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">هزینه</Label>
              <Select value={expenseId || undefined} onValueChange={setExpenseId}>
                <SelectTrigger><SelectValue placeholder="انتخاب هزینه…" /></SelectTrigger>
                <SelectContent>
                  {(expenses ?? [])
                    .filter((e) => e.remainingRial > 0 && e.status !== "VOID")
                    .map((e) => (
                      <SelectItem key={e._id} value={e._id}>
                        {e.expenseNumber} — {e.title} (مانده: {formatMoney(e.remainingRial, unit)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <MoneyInput label="مبلغ پرداخت" valueRial={expenseAmount} onChange={setExpenseAmount} unit={unit} onUnitChange={setUnit} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">روش</Label>
                <Select value={expenseMethod} onValueChange={setExpenseMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">صندوق / بانک</Label>
                <Select value={expensePlace || undefined} onValueChange={setExpensePlace}>
                  <SelectTrigger><SelectValue placeholder="انتخاب…" /></SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">شماره مرجع</Label>
              <Input dir="ltr" className="text-end text-xs" value={expenseRef} onChange={(e) => setExpenseRef(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpensePayOpen(false)}>انصراف</Button>
            <Button onClick={submitExpensePayment} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت پرداخت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* refund */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">برگشت وجه به واحد</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              فقط از محل بستانکاری (پیش‌پرداخت) واحد امکان‌پذیر است — نیازمند تایید مدیر ارشد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">واحد</Label>
              <Select value={refundUnit || undefined} onValueChange={setRefundUnit}>
                <SelectTrigger><SelectValue placeholder="انتخاب واحد…" /></SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u._id} value={u._id}>واحد {u.unitNumber} — {u.ownerName ?? u.tenantName ?? u.usage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <MoneyInput label="مبلغ برگشت" valueRial={refundAmount} onChange={setRefundAmount} unit={unit} onUnitChange={setUnit} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">روش برگشت</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">صندوق / بانک</Label>
                <Select value={refundPlace || undefined} onValueChange={setRefundPlace}>
                  <SelectTrigger><SelectValue placeholder="انتخاب…" /></SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">علت برگشت (الزامی)</Label>
              <Input dir="rtl" className="text-xs" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="مثلاً: استرداد اضافه‌پرداخت" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>انصراف</Button>
            <Button onClick={submitRefund} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت برگشت وجه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* void confirmation */}
      <ConfirmDialog
        open={voiding !== null}
        onOpenChange={(open) => {
          if (!open) {
            setVoiding(null);
            setVoidReason("");
          }
        }}
        title="باطل‌کردن پرداخت"
        description={
          <div className="space-y-2">
            <p>فاکتورها به حالت قبل بازمی‌گردند و سند معکوس در دفتر کل ثبت می‌شود.</p>
            <Input
              dir="rtl"
              placeholder="علت باطل‌کردن (الزامی)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="text-xs"
            />
          </div>
        }
        confirmLabel="باطل‌کردن پرداخت"
        pending={saving}
        onConfirm={submitVoid}
      />
    </div>
  );
}