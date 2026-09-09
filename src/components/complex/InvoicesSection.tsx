import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { FileText, Plus, XCircle } from "lucide-react";
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
import { formatMoney } from "@/lib/money";
import { toFa } from "@/lib/fa";
import { useMoneyPref } from "./money-context";
import { MoneyInput } from "./MoneyInput";
import { Badge, ConfirmDialog, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES } from "./labels";

const DUE_OPTIONS = [
  { label: "۷ روز", days: 7 },
  { label: "۱۵ روز", days: 15 },
  { label: "۳۰ روز", days: 30 },
  { label: "۴۵ روز", days: 45 },
  { label: "۶۰ روز", days: 60 },
];

export function InvoicesSection() {
  const { unit } = useMoneyPref();
  const invoices = useQuery(api.accounting.invoices.listInvoices, {});
  const units = useQuery(api.accounting.charges.listUnitsForCharges);
  const coa = useQuery(api.accounting.accounts.listChartOfAccounts);
  const issueFromCharges = useMutation(api.accounting.invoices.issueFromCharges);
  const createManual = useMutation(api.accounting.invoices.createManualInvoice);
  const voidInvoice = useMutation(api.accounting.invoices.voidInvoice);

  const [issueOpen, setIssueOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [voiding, setVoiding] = useState<Id<"invoices"> | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [saving, setSaving] = useState(false);

  // issue-from-charges form
  const [issueUnit, setIssueUnit] = useState<string>("");
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set());
  const [dueDays, setDueDays] = useState("15");
  const [issueDesc, setIssueDesc] = useState("");

  // manual invoice form
  const [manualUnit, setManualUnit] = useState<string>("");
  const [manualDue, setManualDue] = useState("15");
  const [manualDesc, setManualDesc] = useState("");
  const [items, setItems] = useState<{ description: string; amountRial: number; categoryCode: string }[]>([
    { description: "", amountRial: 0, categoryCode: "3-01" },
  ]);

  const pendingCharges = useQuery(
    api.accounting.invoices.listPendingCharges,
    issueUnit ? { unitId: issueUnit as Id<"units"> } : "skip",
  );

  const incomeAccounts = useMemo(() => (coa ?? []).filter((a) => a.type === "income"), [coa]);

  const toggleCharge = (id: string) => {
    setSelectedCharges((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTotal = useMemo(
    () => (pendingCharges ?? []).filter((c) => selectedCharges.has(c._id)).reduce((s, c) => s + c.amountRial, 0),
    [pendingCharges, selectedCharges],
  );

  const submitIssue = async () => {
    if (!issueUnit || selectedCharges.size === 0) {
      toast.error("واحد و حداقل یک شارژ را انتخاب کنید");
      return;
    }
    setSaving(true);
    try {
      await issueFromCharges({
        unitId: issueUnit as Id<"units">,
        chargeIds: [...selectedCharges] as Id<"charges">[],
        dueDate: Date.now() + (Number(dueDays) || 15) * 24 * 60 * 60 * 1000,
        description: issueDesc.trim() || undefined,
      });
      toast.success("فاکتور صادر شد");
      setIssueOpen(false);
      setIssueUnit("");
      setSelectedCharges(new Set());
      setIssueDesc("");
    } catch (e) {
      toast.error((e as Error).message ?? "صدور فاکتور ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const submitManual = async () => {
    if (!manualUnit) {
      toast.error("واحد را انتخاب کنید");
      return;
    }
    const validItems = items
      .map((it) => ({ ...it, description: it.description.trim() }))
      .filter((it) => it.description && it.amountRial > 0);
    if (validItems.length === 0) {
      toast.error("حداقل یک ردیف با شرح و مبلغ وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await createManual({
        unitId: manualUnit as Id<"units">,
        items: validItems,
        dueDate: Date.now() + (Number(manualDue) || 15) * 24 * 60 * 60 * 1000,
        description: manualDesc.trim() || undefined,
      });
      toast.success("فاکتور دستی صادر شد");
      setManualOpen(false);
      setManualUnit("");
      setManualDesc("");
      setItems([{ description: "", amountRial: 0, categoryCode: "3-01" }]);
    } catch (e) {
      toast.error((e as Error).message ?? "صدور فاکتور ناموفق بود");
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
      await voidInvoice({ invoiceId: voiding, reason: voidReason.trim() });
      toast.success("فاکتور باطل شد — شارژها آزاد شدند");
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
        title="فاکتورها"
        description="صدور فاکتور از شارژهای در انتظار یا ردیف‌های دستی، و پیگیری وضعیت پرداخت."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
              <FileText className="size-4" />
              فاکتور دستی
            </Button>
            <Button size="sm" onClick={() => setIssueOpen(true)}>
              <Plus className="size-4" />
              صدور از شارژها
            </Button>
          </div>
        }
      />

      <Panel>
        {invoices === undefined ? (
          <LoadingRow />
        ) : invoices.length === 0 ? (
          <EmptyState
            title="فاکتوری صادر نشده است"
            description="از «صدور از شارژها» فاکتور واحدها را صادر کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-extrabold text-foreground">شماره فاکتور</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">واحد</TableHead>
                  <TableHead className="hidden text-xs font-extrabold text-foreground lg:table-cell">سررسید</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">مبلغ</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">مانده</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">وضعیت</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv._id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-bold">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">واحد {inv.unit?.unitNumber ?? "—"}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{formatJalali(inv.dueDate)}</TableCell>
                    <TableCell className="text-end text-xs font-extrabold tabular-nums">{formatMoney(inv.totalRial, unit)}</TableCell>
                    <TableCell className="text-end text-xs font-bold tabular-nums text-rose-600">
                      {inv.remainingRial > 0 ? formatMoney(inv.remainingRial, unit) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge tone={INVOICE_STATUS_TONES[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      {(inv.status === "ISSUED" || inv.status === "DRAFT") && inv.paidRial === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="باطل‌کردن فاکتور"
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => setVoiding(inv._id)}
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

      {/* issue from charges */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="glass max-w-lg border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">صدور فاکتور از شارژها</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              شارژهای در انتظار واحد انتخاب‌شده را به یک فاکتور تبدیل کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">واحد</Label>
              <Select
                value={issueUnit || undefined}
                onValueChange={(v) => {
                  setIssueUnit(v);
                  setSelectedCharges(new Set());
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

            <div className="rounded-xl border border-border/70">
              <div className="border-b border-border/70 px-3 py-2 text-[11px] font-bold text-muted-foreground">
                شارژهای در انتظار {issueUnit ? `— جمع انتخاب‌شده: ${formatMoney(selectedTotal, unit)}` : ""}
              </div>
              {pendingCharges === undefined ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">ابتدا واحد را انتخاب کنید…</p>
              ) : pendingCharges.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">شارژ در انتظاری برای این واحد نیست.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {pendingCharges.map((c) => (
                    <label
                      key={c._id}
                      className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={selectedCharges.has(c._id)}
                          onCheckedChange={() => toggleCharge(c._id)}
                        />
                        <div className="leading-tight">
                          <p className="text-xs font-bold">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {toFa(c.periodYear)}/{c.periodMonth ? toFa(String(c.periodMonth).padStart(2, "0")) : "—"} — {c.categoryCode}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold tabular-nums">{formatMoney(c.amountRial, unit)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">سررسید</Label>
                <Select value={dueDays} onValueChange={setDueDays}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DUE_OPTIONS.map((d) => (
                      <SelectItem key={d.days} value={String(d.days)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">توضیحات</Label>
                <Input dir="rtl" value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} className="text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>انصراف</Button>
            <Button onClick={submitIssue} disabled={saving || selectedCharges.size === 0}>
              {saving ? "در حال صدور…" : "صدور فاکتور"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* manual invoice */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="glass max-h-[85vh] max-w-lg overflow-y-auto border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">فاکتور دستی</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              برای هزینه‌های اختصاصی مانند سهم تعمیر آسانسور، ردیف دستی ثبت کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">واحد</Label>
              <Select value={manualUnit || undefined} onValueChange={setManualUnit}>
                <SelectTrigger><SelectValue placeholder="انتخاب واحد…" /></SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u._id} value={u._id}>واحد {u.unitNumber} — {u.ownerName ?? u.tenantName ?? u.usage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border/70">
              <div className="border-b border-border/70 px-3 py-2 text-[11px] font-bold text-muted-foreground">
                ردیف‌های فاکتور
              </div>
              <div className="divide-y divide-border/60 px-3 py-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_auto] items-end gap-2 py-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground">شرح</Label>
                      <Input
                        dir="rtl"
                        className="h-9 text-xs"
                        value={it.description}
                        placeholder="مثلاً: سهم تعمیر آسانسور"
                        onChange={(e) =>
                          setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground">مبلغ</Label>
                      <MoneyInput
                        compact
                        hint={false}
                        valueRial={it.amountRial}
                        onChange={(r) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, amountRial: r } : x)))}
                        unit={unit}
                        onUnitChange={() => {}}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg text-destructive hover:bg-destructive/10"
                      disabled={items.length === 1}
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <XCircle className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 text-xs font-bold"
                  onClick={() => setItems((prev) => [...prev, { description: "", amountRial: 0, categoryCode: "3-01" }])}
                >
                  <Plus className="size-3.5" />
                  افزودن ردیف
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سرفصل درآمد ردیف‌ها</Label>
              <Select
                value={items[0]?.categoryCode ?? "3-01"}
                onValueChange={(code) =>
                  setItems((prev) => prev.map((x) => ({ ...x, categoryCode: code })))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {incomeAccounts.map((a) => (
                    <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">سررسید</Label>
                <Select value={manualDue} onValueChange={setManualDue}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DUE_OPTIONS.map((d) => (
                      <SelectItem key={d.days} value={String(d.days)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">توضیحات</Label>
                <Input dir="rtl" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} className="text-xs" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
              <span className="text-xs font-bold text-muted-foreground">جمع فاکتور</span>
              <span className="text-sm font-extrabold tabular-nums text-foreground">
                {formatMoney(items.reduce((s, it) => s + it.amountRial, 0), unit)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>انصراف</Button>
            <Button onClick={submitManual} disabled={saving}>
              {saving ? "در حال صدور…" : "صدور فاکتور"}
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
        title="باطل‌کردن فاکتور"
        description={
          <div className="space-y-2">
            <p>شارژهای فاکتور به حالت در انتظار بازمی‌گردند و سندهای آن معکوس می‌شوند.</p>
            <Input
              dir="rtl"
              placeholder="علت باطل‌کردن (الزامی)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="text-xs"
            />
          </div>
        }
        confirmLabel="باطل‌کردن فاکتور"
        pending={saving}
        onConfirm={submitVoid}
      />
    </div>
  );
}