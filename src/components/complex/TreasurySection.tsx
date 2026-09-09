import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeftRight, Banknote, Landmark, PiggyBank, Plus } from "lucide-react";
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
import { formatJalali } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { useMoneyPref } from "./money-context";
import { MoneyInput } from "./MoneyInput";
import { EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";

type TreasuryKind = "CASH" | "BANK" | "FUND";

export function TreasurySection() {
  const { unit, setUnit } = useMoneyPref();
  const treasury = useQuery(api.accounting.accounts.listTreasury);
  const transfers = useQuery(api.accounting.transfers.listTransfers, {});
  const createCash = useMutation(api.accounting.accounts.createCashAccount);
  const createBank = useMutation(api.accounting.accounts.createBankAccount);
  const createFund = useMutation(api.accounting.accounts.createFund);
  const createTransfer = useMutation(api.accounting.transfers.createTransfer);

  const [open, setOpen] = useState<"CASH" | "BANK" | "FUND" | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // generic create form
  const [name, setName] = useState("");
  const [opening, setOpening] = useState(0);
  const [bankNumber, setBankNumber] = useState("");
  const [iban, setIban] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [desc, setDesc] = useState("");

  // transfer form
  const [fromType, setFromType] = useState<TreasuryKind>("CASH");
  const [fromId, setFromId] = useState("");
  const [toType, setToType] = useState<TreasuryKind>("BANK");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState(0);
  const [tDesc, setTDesc] = useState("");

  const cash = treasury?.cash ?? [];
  const banks = treasury?.banks ?? [];
  const funds = treasury?.funds ?? [];

  const accountsOf = (kind: TreasuryKind) =>
    kind === "CASH" ? cash : kind === "BANK" ? banks : funds;

  const labelOf = (kind: TreasuryKind, id: string) => {
    const item = accountsOf(kind).find((a) => a._id === id);
    if (!item) return "—";
    return "bankName" in item ? item.bankName : item.name;
  };

  const resetCreate = () => {
    setName("");
    setOpening(0);
    setBankNumber("");
    setIban("");
    setCardNumber("");
    setOwnerName("");
    setDesc("");
  };

  const submitCreate = async () => {
    if (!name.trim()) {
      toast.error("نام را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      if (open === "CASH") {
        await createCash({ name: name.trim(), description: desc.trim() || undefined, openingBalanceRial: opening });
        toast.success("صندوق ثبت شد");
      } else if (open === "BANK") {
        await createBank({
          bankName: name.trim(),
          accountNumber: bankNumber.trim(),
          iban: iban.trim() || undefined,
          cardNumber: cardNumber.trim() || undefined,
          ownerName: ownerName.trim() || undefined,
          openingBalanceRial: opening,
        });
        toast.success("حساب بانکی ثبت شد");
      } else {
        await createFund({ name: name.trim(), description: desc.trim() || undefined });
        toast.success("صندوق تخصصی ثبت شد");
      }
      setOpen(null);
      resetCreate();
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const submitTransfer = async () => {
    if (!fromId || !toId || amount <= 0) {
      toast.error("مبدأ، مقصد و مبلغ را وارد کنید");
      return;
    }
    if (fromType === toType && fromId === toId) {
      toast.error("حساب مبدأ و مقصد یکسان است");
      return;
    }
    setSaving(true);
    try {
      const res = await createTransfer({
        fromType,
        fromId,
        toType,
        toId,
        amountRial: amount,
        description: tDesc.trim() || undefined,
      });
      toast.success("انتقال وجه ثبت شد", { description: res.transferNumber });
      setTransferOpen(false);
      setFromId("");
      setToId("");
      setAmount(0);
      setTDesc("");
    } catch (e) {
      toast.error((e as Error).message ?? "انتقال وجه ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(
    () => ({
      cash: cash.reduce((s, c) => s + c.balanceRial, 0),
      bank: banks.reduce((s, b) => s + b.balanceRial, 0),
      fund: funds.reduce((s, f) => s + f.balanceRial, 0),
    }),
    [cash, banks, funds],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="صندوق، بانک و صندوق‌های تخصصی"
        description="مدیریت نقدینگی مجتمع و انتقال وجه بین حساب‌ها — هر انتقال در دفتر کل ثبت می‌شود."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="size-4" />
              انتقال وجه
            </Button>
            <Button size="sm" onClick={() => setOpen("CASH")}>
              <Plus className="size-4" />
              حساب جدید
            </Button>
          </div>
        }
      />

      {treasury === undefined ? (
        <LoadingRow />
      ) : (
        <div className="space-y-6">
          {/* balances */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Banknote className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="text-lg font-extrabold tabular-nums text-foreground">{formatMoney(totals.cash, unit)}</p>
                <p className="text-[11px] text-muted-foreground">موجودی صندوق‌ها</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Landmark className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="text-lg font-extrabold tabular-nums text-foreground">{formatMoney(totals.bank, unit)}</p>
                <p className="text-[11px] text-muted-foreground">موجودی بانک‌ها</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <PiggyBank className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="text-lg font-extrabold tabular-nums text-foreground">{formatMoney(totals.fund, unit)}</p>
                <p className="text-[11px] text-muted-foreground">صندوق‌های تخصصی</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* cash */}
            <Panel>
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                  <Banknote className="size-4 text-emerald-600" />
                  صندوق‌ها
                </h3>
              </div>
              <div className="divide-y divide-border/60">
                {cash.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">صندوقی ثبت نشده است.</p>}
                {cash.map((c) => (
                  <div key={c._id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{c.description ?? "—"}</p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums">{formatMoney(c.balanceRial, unit)}</span>
                  </div>
                ))}
                <button
                  className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-primary hover:bg-muted/40"
                  onClick={() => setOpen("CASH")}
                >
                  <Plus className="size-3.5" />
                  صندوق جدید
                </button>
              </div>
            </Panel>

            {/* banks */}
            <Panel>
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                  <Landmark className="size-4 text-sky-600" />
                  بانک‌ها
                </h3>
              </div>
              <div className="divide-y divide-border/60">
                {banks.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">حساب بانکی ثبت نشده است.</p>}
                {banks.map((b) => (
                  <div key={b._id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-bold text-foreground">{b.bankName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        شماره حساب: {b.accountNumber.slice(0, 4)}•••{b.accountNumber.slice(-4)}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums">{formatMoney(b.balanceRial, unit)}</span>
                  </div>
                ))}
                <button
                  className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-primary hover:bg-muted/40"
                  onClick={() => setOpen("BANK")}
                >
                  <Plus className="size-3.5" />
                  حساب بانکی جدید
                </button>
              </div>
            </Panel>

            {/* funds */}
            <Panel>
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                  <PiggyBank className="size-4 text-amber-600" />
                  صندوق‌های تخصصی
                </h3>
              </div>
              <div className="divide-y divide-border/60">
                {funds.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">صندوق تخصصی ثبت نشده است.</p>}
                {funds.map((f) => (
                  <div key={f._id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-bold text-foreground">{f.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{f.description ?? "—"}</p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums">{formatMoney(f.balanceRial, unit)}</span>
                  </div>
                ))}
                <button
                  className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-primary hover:bg-muted/40"
                  onClick={() => setOpen("FUND")}
                >
                  <Plus className="size-3.5" />
                  صندوق تخصصی جدید
                </button>
              </div>
            </Panel>
          </div>

          {/* transfers */}
          <Panel>
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                <ArrowLeftRight className="size-4 text-primary" />
                انتقال‌های وجه
              </h3>
            </div>
            {transfers === undefined ? (
              <LoadingRow />
            ) : transfers.length === 0 ? (
              <EmptyState title="انتقال وجهی ثبت نشده است" description="از دکمه «انتقال وجه» وجه بین صندوق و بانک جابه‌جا کنید." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-extrabold text-foreground">شماره</TableHead>
                      <TableHead className="text-xs font-extrabold text-foreground">از</TableHead>
                      <TableHead className="text-xs font-extrabold text-foreground">به</TableHead>
                      <TableHead className="text-end text-xs font-extrabold text-foreground">مبلغ</TableHead>
                      <TableHead className="hidden text-xs font-extrabold text-foreground lg:table-cell">تاریخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((t) => (
                      <TableRow key={t._id} className="hover:bg-muted/40">
                        <TableCell className="text-xs font-bold">{t.transferNumber}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.fromName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.toName}</TableCell>
                        <TableCell className="text-end text-xs font-extrabold tabular-nums">{formatMoney(t.amountRial, unit)}</TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{formatJalali(t.transferDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* create dialog */}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">
              {open === "CASH" ? "صندوق جدید" : open === "BANK" ? "حساب بانکی جدید" : "صندوق تخصصی جدید"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {open === "BANK"
                ? "شماره کارت به‌صورت ماسک‌شده نمایش داده می‌شود."
                : "مانده اولیه در دفتر کل به‌عنوان مانده افتتاحیه ثبت می‌شود."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{open === "BANK" ? "نام بانک" : "نام"}</Label>
              <Input
                dir="rtl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={open === "CASH" ? "مثلاً: صندوق اصلی" : open === "BANK" ? "مثلاً: بانک ملت" : "مثلاً: صندوق تعمیرات"}
              />
            </div>
            {open === "BANK" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">شماره حساب</Label>
                  <Input dir="ltr" className="text-end" value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">شبا</Label>
                    <Input dir="ltr" className="text-end text-xs" value={iban} onChange={(e) => setIban(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">شماره کارت</Label>
                    <Input dir="ltr" className="text-end text-xs" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">به نام</Label>
                  <Input dir="rtl" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </div>
              </>
            )}
            {open !== "FUND" && (
              <MoneyInput label="مانده اولیه" valueRial={opening} onChange={setOpening} unit={unit} onUnitChange={setUnit} />
            )}
            {open !== "BANK" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">توضیحات</Label>
                <Input dir="rtl" value={desc} onChange={(e) => setDesc(e.target.value)} className="text-xs" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>انصراف</Button>
            <Button onClick={submitCreate} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">انتقال وجه</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              جابه‌جایی وجه بین صندوق، بانک و صندوق‌های تخصصی — سند انتقال در دفتر کل ثبت می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">از نوع</Label>
                <Select value={fromType} onValueChange={(v) => { setFromType(v as TreasuryKind); setFromId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">صندوق</SelectItem>
                    <SelectItem value="BANK">بانک</SelectItem>
                    <SelectItem value="FUND">صندوق تخصصی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">از حساب</Label>
                <Select value={fromId || undefined} onValueChange={setFromId}>
                  <SelectTrigger><SelectValue placeholder="انتخاب…" /></SelectTrigger>
                  <SelectContent>
                    {accountsOf(fromType).map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {"bankName" in a ? a.bankName : a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">به نوع</Label>
                <Select value={toType} onValueChange={(v) => { setToType(v as TreasuryKind); setToId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">صندوق</SelectItem>
                    <SelectItem value="BANK">بانک</SelectItem>
                    <SelectItem value="FUND">صندوق تخصصی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">به حساب</Label>
                <Select value={toId || undefined} onValueChange={setToId}>
                  <SelectTrigger><SelectValue placeholder="انتخاب…" /></SelectTrigger>
                  <SelectContent>
                    {accountsOf(toType).map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {"bankName" in a ? a.bankName : a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <MoneyInput label="مبلغ انتقال" valueRial={amount} onChange={setAmount} unit={unit} onUnitChange={setUnit} />
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">شرح</Label>
              <Input dir="rtl" value={tDesc} onChange={(e) => setTDesc(e.target.value)} className="text-xs" placeholder="مثلاً: واریز به صندوق برای هزینه‌های روزانه" />
            </div>
            {fromId && (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                مبدأ: {labelOf(fromType, fromId)} ← مقصد: {toId ? labelOf(toType, toId) : "—"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>انصراف</Button>
            <Button onClick={submitTransfer} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت انتقال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}