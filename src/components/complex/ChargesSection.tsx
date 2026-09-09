import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarCog, FileWarning, Pencil, Plus, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
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
import { currentJalaliMonth, currentJalaliYear, jalaliMonthKey } from "@/lib/jalali";
import { formatMoney } from "@/lib/money";
import { toFa } from "@/lib/fa";
import { useMoneyPref } from "./money-context";
import { MoneyInput } from "./MoneyInput";
import { Badge, ConfirmDialog, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";
import { CHARGE_STATUS_LABELS, CHARGE_STATUS_TONES, CHARGE_TYPE_LABELS } from "./labels";

const CHARGE_TYPES = ["monthly", "fixed", "area", "parking", "special", "general", "penalty", "discount"] as const;

export function ChargesSection() {
  const { unit, setUnit } = useMoneyPref();
  const rules = useQuery(api.accounting.charges.listChargeRules);
  const charges = useQuery(api.accounting.charges.listCharges, {});
  const units = useQuery(api.accounting.charges.listUnitsForCharges);
  const coa = useQuery(api.accounting.accounts.listChartOfAccounts);
  const createRule = useMutation(api.accounting.charges.createChargeRule);
  const updateRule = useMutation(api.accounting.charges.updateChargeRule);
  const createCharge = useMutation(api.accounting.charges.createCharge);
  const generate = useMutation(api.accounting.charges.generateMonthlyCharges);
  const voidCharge = useMutation(api.accounting.charges.voidCharge);

  const [ruleOpen, setRuleOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [voiding, setVoiding] = useState<Id<"charges"> | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [saving, setSaving] = useState(false);

  // edit rule
  const [editingRule, setEditingRule] = useState<Doc<"chargeRules"> | null>(null);
  const [erName, setErName] = useState("");
  const [erCategory, setErCategory] = useState("3-01");
  const [erBase, setErBase] = useState(0);
  const [erRate, setErRate] = useState(0);
  const [erParking, setErParking] = useState(0);
  const [erDesc, setErDesc] = useState("");
  const [erActive, setErActive] = useState("true");

  // rule form
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<string>("monthly");
  const [ruleCategory, setRuleCategory] = useState("3-01");
  const [ruleBase, setRuleBase] = useState(0);
  const [ruleRate, setRuleRate] = useState(0);
  const [ruleParking, setRuleParking] = useState(0);
  const [ruleUsage, setRuleUsage] = useState<string>("");

  // manual charge form
  const [chUnit, setChUnit] = useState<string>("");
  const [chTitle, setChTitle] = useState("");
  const [chType, setChType] = useState<string>("monthly");
  const [chYear, setChYear] = useState(String(currentJalaliYear()));
  const [chMonth, setChMonth] = useState(String(currentJalaliMonth()));
  const [chCategory, setChCategory] = useState("3-01");
  const [chAmount, setChAmount] = useState(0);
  const [chDesc, setChDesc] = useState("");

  // generate form
  const [genYear, setGenYear] = useState(String(currentJalaliYear()));
  const [genMonth, setGenMonth] = useState(String(currentJalaliMonth()));

  const incomeAccounts = useMemo(
    () => (coa ?? []).filter((a) => a.type === "income"),
    [coa],
  );

  const resetRuleForm = () => {
    setRuleName("");
    setRuleType("monthly");
    setRuleCategory("3-01");
    setRuleBase(0);
    setRuleRate(0);
    setRuleParking(0);
    setRuleUsage("");
  };
  const resetChargeForm = () => {
    setChUnit("");
    setChTitle("");
    setChType("monthly");
    setChYear(String(currentJalaliYear()));
    setChMonth(String(currentJalaliMonth()));
    setChCategory("3-01");
    setChAmount(0);
    setChDesc("");
  };

  const submitRule = async () => {
    if (!ruleName.trim()) {
      toast.error("نام قانون را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await createRule({
        name: ruleName.trim(),
        chargeType: ruleType as (typeof CHARGE_TYPES)[number],
        categoryCode: ruleCategory,
        baseRial: ruleBase,
        ratePerM2Rial: ruleRate,
        parkingRateRial: ruleParking,
        appliesToUsage: ruleUsage ? (ruleUsage as "تجاری" | "اداری" | "مسکونی") : undefined,
      });
      toast.success("قانون شارژ ثبت شد");
      setRuleOpen(false);
      resetRuleForm();
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت قانون ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const openEditRule = (r: Doc<"chargeRules">) => {
    setEditingRule(r);
    setErName(r.name);
    setErCategory(r.categoryCode);
    setErBase(r.baseRial);
    setErRate(r.ratePerM2Rial);
    setErParking(r.parkingRateRial);
    setErDesc(r.description ?? "");
    setErActive(r.isActive ? "true" : "false");
  };

  const submitEditRule = async () => {
    if (!editingRule || !erName.trim()) {
      toast.error("نام قانون را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await updateRule({
        ruleId: editingRule._id,
        name: erName.trim(),
        categoryCode: erCategory,
        baseRial: erBase,
        ratePerM2Rial: erRate,
        parkingRateRial: erParking,
        description: erDesc.trim() || undefined,
        isActive: erActive === "true",
      });
      toast.success("قانون شارژ به‌روزرسانی شد");
      setEditingRule(null);
    } catch (e) {
      toast.error((e as Error).message ?? "به‌روزرسانی ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const submitCharge = async () => {
    if (!chUnit || !chTitle.trim() || chAmount <= 0) {
      toast.error("واحد، عنوان و مبلغ شارژ را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await createCharge({
        unitId: chUnit as Id<"units">,
        title: chTitle.trim(),
        chargeType: chType as (typeof CHARGE_TYPES)[number],
        periodYear: Number(chYear) || currentJalaliYear(),
        periodMonth: chMonth ? Number(chMonth) : undefined,
        amountRial: chAmount,
        categoryCode: chCategory,
        description: chDesc.trim() || undefined,
      });
      toast.success("شارژ ثبت و در دفتر کل منعکس شد");
      setChargeOpen(false);
      resetChargeForm();
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت شارژ ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const submitGenerate = async () => {
    setSaving(true);
    try {
      const res = await generate({
        periodYear: Number(genYear) || currentJalaliYear(),
        periodMonth: Number(genMonth) || currentJalaliMonth(),
      });
      toast.success(`تولید شارژ انجام شد`, {
        description: `${toFa(res.created)} شارژ جدید ایجاد و ${toFa(res.skipped)} مورد تکراری نادیده گرفته شد.`,
      });
      setGenOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? "تولید شارژ ناموفق بود");
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
      await voidCharge({ chargeId: voiding, reason: voidReason.trim() });
      toast.success("شارژ باطل شد — سند معکوس در دفتر کل ثبت شد");
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
        title="شارژها"
        description={`تولید خودکار شارژ ماهانه، قوانین شارژ و ثبت شارژ دستی — دوره جاری: ${jalaliMonthKey(Date.now())}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRuleOpen(true)}>
              <Plus className="size-4" />
              قانون شارژ
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGenOpen(true)}>
              <Sparkles className="size-4" />
              تولید شارژ ماهانه
            </Button>
            <Button size="sm" onClick={() => setChargeOpen(true)}>
              <Plus className="size-4" />
              شارژ دستی
            </Button>
          </div>
        }
      />

      {/* rules */}
      <Panel>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <CalendarCog className="size-4 text-primary" />
            قوانین شارژ
          </h3>
          <Badge tone="bg-muted text-muted-foreground">{(rules ?? []).length} قانون</Badge>
        </div>
        <div className="divide-y divide-border/60">
          {(rules ?? []).length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              قانونی ثبت نشده است — اولین قانون شارژ را بسازید.
            </p>
          )}
          {(rules ?? []).map((r) => (
            <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-bold text-foreground">
                  {r.name}
                  <span className="ms-2 text-[11px] font-medium text-muted-foreground">{CHARGE_TYPE_LABELS[r.chargeType]}</span>
                  {!r.isActive && <Badge tone="bg-slate-100 text-slate-500" className="ms-2">غیرفعال</Badge>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {r.baseRial > 0 && `${formatMoney(r.baseRial, unit)} ثابت`}
                  {r.ratePerM2Rial > 0 && `${r.baseRial > 0 ? " + " : ""}${formatMoney(r.ratePerM2Rial, unit)}/متر`}
                  {r.parkingRateRial > 0 && `${(r.baseRial > 0 || r.ratePerM2Rial > 0) ? " + " : ""}${formatMoney(r.parkingRateRial, unit)}/پارکینگ`}
                  {r.appliesToUsage ? ` — فقط ${r.appliesToUsage}` : ""}
                  {r.description ? ` — ${r.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge tone="bg-sky-100 text-sky-700">{r.categoryCode}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="ویرایش قانون"
                  className="size-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => openEditRule(r)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* charges list */}
      <Panel>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <FileWarning className="size-4 text-primary" />
            شارژهای ثبت‌شده
          </h3>
        </div>
        {charges === undefined ? (
          <LoadingRow />
        ) : charges.length === 0 ? (
          <EmptyState
            title="شارژی ثبت نشده است"
            description="با «تولید شارژ ماهانه» برای همه واحدها یا «شارژ دستی» برای یک واحد، شارژ ثبت کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-extrabold text-foreground">واحد</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">عنوان / دوره</TableHead>
                  <TableHead className="hidden text-xs font-extrabold text-foreground md:table-cell">نوع</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">مبلغ</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">وضعیت</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => (
                  <TableRow key={c._id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-bold">واحد {c.unit?.unitNumber ?? "—"}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {toFa(c.periodYear)}/{c.periodMonth ? toFa(String(c.periodMonth).padStart(2, "0")) : "—"}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge tone="bg-muted text-muted-foreground">{CHARGE_TYPE_LABELS[c.chargeType]}</Badge>
                    </TableCell>
                    <TableCell className="text-end text-xs font-extrabold tabular-nums">
                      {formatMoney(c.amountRial, unit)}
                    </TableCell>
                    <TableCell>
                      <Badge tone={CHARGE_STATUS_TONES[c.status]}>{CHARGE_STATUS_LABELS[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      {c.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="باطل‌کردن شارژ"
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => setVoiding(c._id)}
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

      {/* rule dialog */}
      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent className="glass max-w-lg border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">قانون شارژ جدید</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              ترکیبی از مبلغ ثابت، نرخ متراژ و نرخ پارکینگ را تعریف کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">نام قانون</Label>
              <Input dir="rtl" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="مثلاً: شارژ ماهانه واحدها" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نوع شارژ</Label>
              <Select value={ruleType} onValueChange={setRuleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHARGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{CHARGE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سرفصل درآمد</Label>
              <Select value={ruleCategory} onValueChange={setRuleCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {incomeAccounts.map((a) => (
                    <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">مبلغ ثابت</Label>
              <MoneyInput compact valueRial={ruleBase} onChange={setRuleBase} unit={unit} onUnitChange={setUnit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نرخ هر متر مربع</Label>
              <MoneyInput compact valueRial={ruleRate} onChange={setRuleRate} unit={unit} onUnitChange={setUnit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نرخ هر پارکینگ</Label>
              <MoneyInput compact valueRial={ruleParking} onChange={setRuleParking} unit={unit} onUnitChange={setUnit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">فقط برای کاربری</Label>
              <Select value={ruleUsage || undefined} onValueChange={(v) => setRuleUsage(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="همه کاربری‌ها" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه کاربری‌ها</SelectItem>
                  <SelectItem value="تجاری">تجاری</SelectItem>
                  <SelectItem value="اداری">اداری</SelectItem>
                  <SelectItem value="مسکونی">مسکونی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleOpen(false)}>انصراف</Button>
            <Button onClick={submitRule} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت قانون"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit rule dialog */}
      <Dialog open={editingRule !== null} onOpenChange={(o) => !o && setEditingRule(null)}>
        <DialogContent className="glass max-w-lg border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش قانون شارژ</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تغییرات فقط روی شارژهای آینده اثر می‌گذارد؛ شارژهای قبلی دست‌نخورده می‌مانند.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">نام قانون</Label>
              <Input dir="rtl" value={erName} onChange={(e) => setErName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سرفصل درآمد</Label>
              <Select value={erCategory} onValueChange={setErCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {incomeAccounts.map((a) => (
                    <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">وضعیت</Label>
              <Select value={erActive} onValueChange={setErActive}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">فعال</SelectItem>
                  <SelectItem value="false">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">مبلغ ثابت</Label>
              <MoneyInput compact valueRial={erBase} onChange={setErBase} unit={unit} onUnitChange={setUnit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نرخ هر متر مربع</Label>
              <MoneyInput compact valueRial={erRate} onChange={setErRate} unit={unit} onUnitChange={setUnit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نرخ هر پارکینگ</Label>
              <MoneyInput compact valueRial={erParking} onChange={setErParking} unit={unit} onUnitChange={setUnit} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">توضیحات</Label>
              <Textarea dir="rtl" value={erDesc} onChange={(e) => setErDesc(e.target.value)} className="min-h-16 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>انصراف</Button>
            <Button onClick={submitEditRule} disabled={saving}>
              {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* manual charge dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="glass max-w-lg border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ثبت شارژ دستی</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              شارژ مستقیم برای یک واحد — سند حسابداری آن به‌صورت خودکار ثبت می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">واحد</Label>
              <Select value={chUnit || undefined} onValueChange={setChUnit}>
                <SelectTrigger><SelectValue placeholder="انتخاب واحد…" /></SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      واحد {u.unitNumber} — {u.ownerName ?? u.tenantName ?? u.usage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">عنوان شارژ</Label>
              <Input dir="rtl" value={chTitle} onChange={(e) => setChTitle(e.target.value)} placeholder="مثلاً: شارژ مهر ۱۴۰۵" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نوع</Label>
              <Select value={chType} onValueChange={setChType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHARGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{CHARGE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سرفصل درآمد</Label>
              <Select value={chCategory} onValueChange={setChCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {incomeAccounts.map((a) => (
                    <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سال (شمسی)</Label>
              <Input dir="ltr" className="text-end" value={chYear} onChange={(e) => setChYear(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">ماه</Label>
              <Select value={chMonth} onValueChange={setChMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{toFa(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <MoneyInput label="مبلغ شارژ" valueRial={chAmount} onChange={setChAmount} unit={unit} onUnitChange={setUnit} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">توضیحات</Label>
              <Textarea dir="rtl" value={chDesc} onChange={(e) => setChDesc(e.target.value)} className="min-h-16 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>انصراف</Button>
            <Button onClick={submitCharge} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت شارژ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* generate monthly dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">تولید شارژ ماهانه</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              برای همه واحدهای فعال بر اساس قوانین فعال، شارژ ساخته می‌شود. اجرای دوباره شارژ تکراری ایجاد نمی‌کند.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سال (شمسی)</Label>
              <Input dir="ltr" className="text-end" value={genYear} onChange={(e) => setGenYear(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">ماه</Label>
              <Select value={genMonth} onValueChange={setGenMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{toFa(m)} — {["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"][m - 1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>انصراف</Button>
            <Button onClick={submitGenerate} disabled={saving} className="gap-1.5">
              <Sparkles className="size-4" />
              {saving ? "در حال تولید…" : "تولید شارژ"}
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
        title="باطل‌کردن شارژ"
        description={
          <div className="space-y-2">
            <p>آیا از باطل‌کردن این شارژ مطمئن هستید؟ سند معکوس در دفتر کل ثبت می‌شود.</p>
            <Input
              dir="rtl"
              placeholder="علت باطل‌کردن (الزامی)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="text-xs"
            />
          </div>
        }
        confirmLabel="باطل‌کردن شارژ"
        pending={saving}
        onConfirm={submitVoid}
      />
    </div>
  );
}