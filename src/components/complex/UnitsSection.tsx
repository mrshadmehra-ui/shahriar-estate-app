import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Building2, MapPin, Pencil, Phone, Plus, ReceiptText } from "lucide-react";
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
import { faNumber } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Badge, EmptyState, LoadingRow, Panel, SectionHeader } from "./ui";

const USAGES = ["تجاری", "اداری", "مسکونی", "پارکینگ", "انباری"] as const;

type UnitDoc = Doc<"units">;

export function UnitsSection() {
  const buildings = useQuery(api.complex.listBuildings);
  const units = useQuery(api.complex.listUnits);
  const users = useQuery(api.complex.listUsersForLinking);
  const createBuilding = useMutation(api.complex.createBuilding);
  const updateBuilding = useMutation(api.complex.updateBuilding);
  const createUnit = useMutation(api.complex.createUnit);
  const updateUnit = useMutation(api.complex.updateUnit);

  const [buildingOpen, setBuildingOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [buildingFloors, setBuildingFloors] = useState("5");
  const [buildingAddress, setBuildingAddress] = useState("");
  const [buildingPhone, setBuildingPhone] = useState("");
  const [unitBuildingId, setUnitBuildingId] = useState<string>("");
  const [unitNumber, setUnitNumber] = useState("");
  const [unitFloor, setUnitFloor] = useState("1");
  const [unitArea, setUnitArea] = useState("40");
  const [unitUsage, setUnitUsage] = useState<string>("تجاری");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [tenantUserId, setTenantUserId] = useState("");
  const [parking, setParking] = useState("0");
  const [saving, setSaving] = useState(false);

  // edit states
  const [editingBuilding, setEditingBuilding] = useState<Doc<"buildings"> | null>(null);
  const [ebName, setEbName] = useState("");
  const [ebFloors, setEbFloors] = useState("1");
  const [ebAddress, setEbAddress] = useState("");
  const [ebPhone, setEbPhone] = useState("");
  const [ebDesc, setEbDesc] = useState("");

  const [editingUnit, setEditingUnit] = useState<UnitDoc | null>(null);
  const [euNumber, setEuNumber] = useState("");
  const [euFloor, setEuFloor] = useState("1");
  const [euArea, setEuArea] = useState("0");
  const [euUsage, setEuUsage] = useState<string>("تجاری");
  const [euOwnerName, setEuOwnerName] = useState("");
  const [euOwnerPhone, setEuOwnerPhone] = useState("");
  const [euOwnerUserId, setEuOwnerUserId] = useState("");
  const [euTenantName, setEuTenantName] = useState("");
  const [euTenantPhone, setEuTenantPhone] = useState("");
  const [euTenantUserId, setEuTenantUserId] = useState("");
  const [euParking, setEuParking] = useState("0");
  const [euStorage, setEuStorage] = useState("0");
  const [euNotes, setEuNotes] = useState("");
  const [euActive, setEuActive] = useState<string>("true");

  const stats = useMemo(() => {
    const list = units ?? [];
    return [
      { label: "واحدها", value: faNumber(list.length), icon: Building2, tone: "bg-sky-100 text-sky-700" },
      { label: "تجاری", value: faNumber(list.filter((u) => u.usage === "تجاری").length), icon: Building2, tone: "bg-amber-100 text-amber-700" },
      { label: "اداری", value: faNumber(list.filter((u) => u.usage === "اداری").length), icon: Building2, tone: "bg-indigo-100 text-indigo-700" },
      { label: "مسکونی", value: faNumber(list.filter((u) => u.usage === "مسکونی").length), icon: Building2, tone: "bg-emerald-100 text-emerald-700" },
    ];
  }, [units]);

  const submitBuilding = async () => {
    if (!buildingName.trim()) {
      toast.error("نام ساختمان را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await createBuilding({
        name: buildingName.trim(),
        floors: Number(buildingFloors) || 1,
        address: buildingAddress.trim() || undefined,
        phone: buildingPhone.trim() || undefined,
      });
      toast.success("ساختمان ثبت شد");
      setBuildingOpen(false);
      setBuildingName("");
      setBuildingFloors("5");
      setBuildingAddress("");
      setBuildingPhone("");
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت ساختمان ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const submitUnit = async () => {
    if (!unitBuildingId || !unitNumber.trim()) {
      toast.error("ساختمان و شماره واحد را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await createUnit({
        buildingId: unitBuildingId as Id<"buildings">,
        unitNumber: unitNumber.trim(),
        floor: Number(unitFloor) || 1,
        areaM2: Number(unitArea) || 0,
        usage: unitUsage as (typeof USAGES)[number],
        ownerName: ownerName.trim() || undefined,
        ownerPhone: ownerPhone.trim() || undefined,
        ownerUserId: ownerUserId ? (ownerUserId as Id<"users">) : null,
        tenantName: tenantName.trim() || undefined,
        tenantPhone: tenantPhone.trim() || undefined,
        tenantUserId: tenantUserId ? (tenantUserId as Id<"users">) : null,
        parkingSlots: Number(parking) || 0,
      });
      toast.success("واحد ثبت شد — حساب مالی آن به‌صورت خودکار ایجاد شد");
      setUnitOpen(false);
      setUnitNumber("");
      setOwnerName("");
      setOwnerPhone("");
      setOwnerUserId("");
      setTenantName("");
      setTenantPhone("");
      setTenantUserId("");
      setParking("0");
    } catch (e) {
      toast.error((e as Error).message ?? "ثبت واحد ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const openEditBuilding = (b: Doc<"buildings">) => {
    setEditingBuilding(b);
    setEbName(b.name);
    setEbFloors(String(b.floors));
    setEbAddress(b.address ?? "");
    setEbPhone(b.phone ?? "");
    setEbDesc(b.description ?? "");
  };

  const submitEditBuilding = async () => {
    if (!editingBuilding || !ebName.trim()) {
      toast.error("نام ساختمان را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await updateBuilding({
        buildingId: editingBuilding._id,
        name: ebName.trim(),
        floors: Number(ebFloors) || 1,
        address: ebAddress.trim() || undefined,
        phone: ebPhone.trim() || undefined,
        description: ebDesc.trim() || undefined,
      });
      toast.success("ساختمان به‌روزرسانی شد");
      setEditingBuilding(null);
    } catch (e) {
      toast.error((e as Error).message ?? "به‌روزرسانی ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const openEditUnit = (u: UnitDoc) => {
    setEditingUnit(u);
    setEuNumber(u.unitNumber);
    setEuFloor(String(u.floor));
    setEuArea(String(u.areaM2));
    setEuUsage(u.usage);
    setEuOwnerName(u.ownerName ?? "");
    setEuOwnerPhone(u.ownerPhone ?? "");
    setEuOwnerUserId(u.ownerUserId ?? "");
    setEuTenantName(u.tenantName ?? "");
    setEuTenantPhone(u.tenantPhone ?? "");
    setEuTenantUserId(u.tenantUserId ?? "");
    setEuParking(String(u.parkingSlots));
    setEuStorage(String(u.storageSlots));
    setEuNotes(u.notes ?? "");
    setEuActive(u.isActive ? "true" : "false");
  };

  const submitEditUnit = async () => {
    if (!editingUnit || !euNumber.trim()) {
      toast.error("شماره واحد را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await updateUnit({
        unitId: editingUnit._id,
        unitNumber: euNumber.trim(),
        floor: Number(euFloor) || 1,
        areaM2: Number(euArea) || 0,
        usage: euUsage as (typeof USAGES)[number],
        ownerName: euOwnerName.trim() || undefined,
        ownerPhone: euOwnerPhone.trim() || undefined,
        ownerUserId: euOwnerUserId ? (euOwnerUserId as Id<"users">) : null,
        tenantName: euTenantName.trim() || undefined,
        tenantPhone: euTenantPhone.trim() || undefined,
        tenantUserId: euTenantUserId ? (euTenantUserId as Id<"users">) : null,
        parkingSlots: Number(euParking) || 0,
        storageSlots: Number(euStorage) || 0,
        notes: euNotes.trim() || undefined,
        isActive: euActive === "true",
      });
      toast.success("واحد به‌روزرسانی شد");
      setEditingUnit(null);
    } catch (e) {
      toast.error((e as Error).message ?? "به‌روزرسانی ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const buildingNameOf = (id: Id<"buildings">) =>
    (buildings ?? []).find((b) => b._id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="واحدها و ساختمان‌ها"
        description="مدیریت ساختمان‌ها، واحدها، مالکین و مستأجرین — هر واحد دارای حساب مالی مستقل است."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setBuildingOpen(true)}>
              <Plus className="size-4" />
              ساختمان جدید
            </Button>
            <Button size="sm" onClick={() => setUnitOpen(true)}>
              <Plus className="size-4" />
              واحد جدید
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4">
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", s.tone)}>
              <s.icon className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-extrabold tabular-nums text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <MapPin className="size-4 text-primary" />
              ساختمان‌ها
            </h3>
          </div>
          <div className="divide-y divide-border/60">
            {(buildings ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">ساختمانی ثبت نشده است.</p>
            )}
            {(buildings ?? []).map((b) => (
              <div key={b._id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-bold text-foreground">{b.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {b.address ?? "بدون آدرس"} — {faNumber(b.floors)} طبقه
                    {b.phone ? ` — ${b.phone}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge tone="bg-muted text-muted-foreground">
                    {faNumber((units ?? []).filter((u) => u.buildingId === b._id).length)} واحد
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="ویرایش ساختمان"
                    className="size-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => openEditBuilding(b)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <Building2 className="size-4 text-primary" />
              فهرست واحدها
            </h3>
          </div>
          {units === undefined ? (
            <LoadingRow />
          ) : units.length === 0 ? (
            <EmptyState
              title="هنوز واحدی ثبت نشده است"
              description="با دکمه «واحد جدید» اولین واحد را ثبت کنید؛ حساب مالی آن به‌صورت خودکار ساخته می‌شود."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-extrabold text-foreground">واحد</TableHead>
                    <TableHead className="text-xs font-extrabold text-foreground">کاربری</TableHead>
                    <TableHead className="hidden text-xs font-extrabold text-foreground md:table-cell">مالک</TableHead>
                    <TableHead className="hidden text-xs font-extrabold text-foreground md:table-cell">مستأجر</TableHead>
                    <TableHead className="hidden text-xs font-extrabold text-foreground lg:table-cell">متراژ</TableHead>
                    <TableHead className="text-end text-xs font-extrabold text-foreground">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => (
                    <TableRow key={u._id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="leading-tight">
                          <p className="text-sm font-bold text-foreground">
                            واحد {u.unitNumber}
                            <span className="ms-2 text-[10px] font-medium text-muted-foreground">
                              {buildingNameOf(u.buildingId)} — طبقه {faNumber(u.floor)}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">{u.account?.accountNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge tone={cn("bg-sky-100 text-sky-700", u.usage === "تجاری" && "bg-amber-100 text-amber-700", u.usage === "مسکونی" && "bg-emerald-100 text-emerald-700")}>
                          {u.usage}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="leading-tight">
                          <p className="text-xs text-muted-foreground">{u.ownerName ?? "—"}</p>
                          {u.ownerPhone && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-foreground/70" dir="ltr">
                              <Phone className="size-3 text-primary/70" />
                              <span className="tabular-nums">{u.ownerPhone}</span>
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="leading-tight">
                          <p className="text-xs text-muted-foreground">{u.tenantName ?? "—"}</p>
                          {u.tenantPhone && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-foreground/70" dir="ltr">
                              <Phone className="size-3 text-primary/70" />
                              <span className="tabular-nums">{u.tenantPhone}</span>
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {faNumber(u.areaM2)} متر
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10"
                            onClick={() => {
                              const win = window.open(
                                `/statement/${u._id}`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                              // popup blocked (e.g. sandboxed preview) → same-tab fallback
                              if (!win) window.location.assign(`/statement/${u._id}`);
                            }}
                            title="صورت‌حساب در پنجره جدا باز می‌شود — بازه تاریخی انتخاب و چاپ کنید"
                          >
                            <ReceiptText className="size-3.5" />
                            صورت‌حساب
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="ویرایش واحد"
                            className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => openEditUnit(u)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>

      {/* building dialog */}
      <Dialog open={buildingOpen} onOpenChange={setBuildingOpen}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ثبت ساختمان جدید</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              ساختمان مجتمع را تعریف کنید تا واحدها زیر آن ثبت شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام ساختمان</Label>
              <Input dir="rtl" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} placeholder="مثلاً: مجتمع تجاری اداری شهریار" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">تعداد طبقات</Label>
                <Input dir="ltr" className="text-end" value={buildingFloors} onChange={(e) => setBuildingFloors(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">تلفن ساختمان</Label>
                <Input dir="ltr" className="text-end" value={buildingPhone} onChange={(e) => setBuildingPhone(e.target.value)} placeholder="021-…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">آدرس</Label>
              <Input dir="rtl" value={buildingAddress} onChange={(e) => setBuildingAddress(e.target.value)} placeholder="شهریار، …" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuildingOpen(false)}>انصراف</Button>
            <Button onClick={submitBuilding} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت ساختمان"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit building dialog */}
      <Dialog open={editingBuilding !== null} onOpenChange={(o) => !o && setEditingBuilding(null)}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش ساختمان</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">مشخصات ساختمان را به‌روزرسانی کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام ساختمان</Label>
              <Input dir="rtl" value={ebName} onChange={(e) => setEbName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">تعداد طبقات</Label>
                <Input dir="ltr" className="text-end" value={ebFloors} onChange={(e) => setEbFloors(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">تلفن</Label>
                <Input dir="ltr" className="text-end" value={ebPhone} onChange={(e) => setEbPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">آدرس</Label>
              <Input dir="rtl" value={ebAddress} onChange={(e) => setEbAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">توضیحات</Label>
              <Textarea dir="rtl" value={ebDesc} onChange={(e) => setEbDesc(e.target.value)} className="min-h-16 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBuilding(null)}>انصراف</Button>
            <Button onClick={submitEditBuilding} disabled={saving}>
              {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* unit dialog */}
      <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
        <DialogContent className="glass max-w-lg border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ثبت واحد جدید</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              با ثبت واحد، حساب مالی آن (FA-xxxxxx) به‌صورت خودکار ساخته می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">ساختمان</Label>
              <Select value={unitBuildingId || undefined} onValueChange={setUnitBuildingId}>
                <SelectTrigger><SelectValue placeholder="انتخاب ساختمان…" /></SelectTrigger>
                <SelectContent>
                  {(buildings ?? []).map((b) => (
                    <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">شماره واحد</Label>
              <Input dir="ltr" className="text-end" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="101" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">طبقه</Label>
              <Input dir="ltr" className="text-end" value={unitFloor} onChange={(e) => setUnitFloor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">کاربری</Label>
              <Select value={unitUsage} onValueChange={setUnitUsage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USAGES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">متراژ (متر مربع)</Label>
              <Input dir="ltr" className="text-end" value={unitArea} onChange={(e) => setUnitArea(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام مالک</Label>
              <Input dir="rtl" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تلفن مالک</Label>
              <Input dir="ltr" className="text-end" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="0912-…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام مستأجر</Label>
              <Input dir="rtl" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تلفن مستأجر</Label>
              <Input dir="ltr" className="text-end" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} placeholder="0912-…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">مالک (حساب کاربری ثبت‌شده)</Label>
              <Select value={ownerUserId || undefined} onValueChange={setOwnerUserId}>
                <SelectTrigger><SelectValue placeholder="بدون اتصال به حساب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون اتصال به حساب</SelectItem>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}{u.email ? ` — ${u.email}` : u.phone ? ` — ${u.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">مستأجر (حساب کاربری ثبت‌شده)</Label>
              <Select value={tenantUserId || undefined} onValueChange={setTenantUserId}>
                <SelectTrigger><SelectValue placeholder="بدون اتصال به حساب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون اتصال به حساب</SelectItem>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}{u.email ? ` — ${u.email}` : u.phone ? ` — ${u.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">پارکینگ</Label>
              <Input dir="ltr" className="text-end" value={parking} onChange={(e) => setParking(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitOpen(false)}>انصراف</Button>
            <Button onClick={submitUnit} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت واحد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit unit dialog */}
      <Dialog open={editingUnit !== null} onOpenChange={(o) => !o && setEditingUnit(null)}>
        <DialogContent className="glass max-w-lg border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش واحد {editingUnit ? editingUnit.unitNumber : ""}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              مشخصات واحد، مالک و مستأجر را به‌روزرسانی کنید — حساب مالی و سوابق دست‌نخورده می‌مانند.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">شماره واحد</Label>
              <Input dir="ltr" className="text-end" value={euNumber} onChange={(e) => setEuNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">طبقه</Label>
              <Input dir="ltr" className="text-end" value={euFloor} onChange={(e) => setEuFloor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">کاربری</Label>
              <Select value={euUsage} onValueChange={setEuUsage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USAGES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">متراژ (متر مربع)</Label>
              <Input dir="ltr" className="text-end" value={euArea} onChange={(e) => setEuArea(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام مالک</Label>
              <Input dir="rtl" value={euOwnerName} onChange={(e) => setEuOwnerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تلفن مالک</Label>
              <Input dir="ltr" className="text-end" value={euOwnerPhone} onChange={(e) => setEuOwnerPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام مستأجر</Label>
              <Input dir="rtl" value={euTenantName} onChange={(e) => setEuTenantName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تلفن مستأجر</Label>
              <Input dir="ltr" className="text-end" value={euTenantPhone} onChange={(e) => setEuTenantPhone(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">مالک (حساب کاربری)</Label>
              <Select value={euOwnerUserId || undefined} onValueChange={setEuOwnerUserId}>
                <SelectTrigger><SelectValue placeholder="بدون اتصال به حساب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون اتصال به حساب</SelectItem>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}{u.email ? ` — ${u.email}` : u.phone ? ` — ${u.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">مستأجر (حساب کاربری)</Label>
              <Select value={euTenantUserId || undefined} onValueChange={setEuTenantUserId}>
                <SelectTrigger><SelectValue placeholder="بدون اتصال به حساب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون اتصال به حساب</SelectItem>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}{u.email ? ` — ${u.email}` : u.phone ? ` — ${u.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">پارکینگ</Label>
              <Input dir="ltr" className="text-end" value={euParking} onChange={(e) => setEuParking(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">انباری</Label>
              <Input dir="ltr" className="text-end" value={euStorage} onChange={(e) => setEuStorage(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">وضعیت</Label>
              <Select value={euActive} onValueChange={setEuActive}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">فعال</SelectItem>
                  <SelectItem value="false">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">یادداشت</Label>
              <Textarea dir="rtl" value={euNotes} onChange={(e) => setEuNotes(e.target.value)} className="min-h-16 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUnit(null)}>انصراف</Button>
            <Button onClick={submitEditUnit} disabled={saving}>
              {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}