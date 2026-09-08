import { useEffect, useState } from "react";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AREAS,
  CATEGORIES,
  IMAGES,
  SPEC_ICON_KEYS,
  SPEC_ICON_LABELS,
  type Category,
  type Property,
  type Transaction,
} from "@/lib/estate";
import { faPrice } from "@/lib/fa";

export interface PropertyInput {
  title: string;
  location: string;
  area: string;
  category: Category;
  transaction: Transaction;
  image: string;
  gallery: string[];
  specs: { icon: string; label: string }[];
  amenities: string[];
  description: string;
  price?: string;
  pricePerMeter?: string;
  priceValue: number;
}

interface FormState {
  title: string;
  location: string;
  area: string;
  category: Category;
  transaction: Transaction;
  image: string;
  galleryText: string;
  specs: { icon: string; label: string }[];
  amenitiesText: string;
  description: string;
  price: string;
  pricePerMeter: string;
  priceValue: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  location: "",
  area: AREAS[0],
  category: "مسکونی",
  transaction: "فروش",
  image: "",
  galleryText: "",
  specs: [{ icon: "ruler", label: "" }],
  amenitiesText: "",
  description: "",
  price: "",
  pricePerMeter: "",
  priceValue: "",
};

function splitList(value: string): string[] {
  return value
    .split(/\n|،|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Draft produced by the AI extractor (price may still be missing). */
export type AiDraft = Omit<PropertyInput, "priceValue"> & {
  priceValue: number | null;
};

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  /** Pre-filled data for a new listing (e.g. extracted by AI). */
  draft?: AiDraft | null;
  pending: boolean;
  onSave: (data: PropertyInput) => void;
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  property,
  draft,
  pending,
  onSave,
}: PropertyFormDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (property) {
      setForm({
        title: property.title,
        location: property.location,
        area: property.area,
        category: property.category,
        transaction: property.transaction,
        image: property.image,
        galleryText: property.gallery.join("\n"),
        specs: property.specs.length
          ? property.specs.map((s) => ({ icon: s.icon, label: s.label }))
          : [{ icon: "ruler", label: "" }],
        amenitiesText: property.amenities.join("، "),
        description: property.description,
        price: property.price ?? "",
        pricePerMeter: property.pricePerMeter ?? "",
        priceValue: property.priceValue ? String(property.priceValue) : "",
      });
    } else if (draft) {
      setForm({
        title: draft.title,
        location: draft.location,
        area: draft.area,
        category: draft.category,
        transaction: draft.transaction,
        image: draft.image,
        galleryText: draft.gallery.join("\n"),
        specs: draft.specs.length
          ? draft.specs.map((s) => ({ icon: s.icon, label: s.label }))
          : [{ icon: "ruler", label: "" }],
        amenitiesText: draft.amenities.join("، "),
        description: draft.description,
        price: draft.price ?? "",
        pricePerMeter: draft.pricePerMeter ?? "",
        priceValue: draft.priceValue ? String(draft.priceValue) : "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [open, property, draft]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateSpec = (index: number, patch: Partial<FormState["specs"][number]>) =>
    setForm((f) => ({
      ...f,
      specs: f.specs.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)),
    }));

  const removeSpec = (index: number) =>
    setForm((f) => ({
      ...f,
      specs: f.specs.filter((_, i) => i !== index),
    }));

  function handleSubmit() {
    setError(null);
    const priceValue = Number(form.priceValue);
    if (!form.title.trim()) return setError("عنوان فایل الزامی است.");
    if (!form.location.trim()) return setError("آدرس ملک الزامی است.");
    if (!form.priceValue || !Number.isFinite(priceValue) || priceValue <= 0) {
      return setError("قیمت (تومان) را به صورت عدد وارد کنید.");
    }

    const image = form.image.trim() || IMAGES.fallback;
    const gallery = splitList(form.galleryText);
    onSave({
      title: form.title.trim(),
      location: form.location.trim(),
      area: form.area,
      category: form.category,
      transaction: form.transaction,
      image,
      gallery: gallery.length ? gallery : [image],
      specs: form.specs
        .filter((spec) => spec.label.trim())
        .map((spec) => ({ icon: spec.icon, label: spec.label.trim() })),
      amenities: splitList(form.amenitiesText),
      description: form.description.trim(),
      price: form.price.trim() || faPrice(priceValue),
      pricePerMeter: form.pricePerMeter.trim() || undefined,
      priceValue,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[92dvh] max-w-2xl overflow-y-auto border-white/60 sm:rounded-[2rem]">
        <DialogHeader className="pe-10">
          <DialogTitle className="text-lg font-extrabold text-navy">
            {property ? "ویرایش فایل ملک" : "افزودن فایل جدید"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* basics */}
          <section className="space-y-3">
            <h3 className="text-xs font-extrabold text-gold-deep">اطلاعات اصلی</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-navy">عنوان فایل *</label>
                <Input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="مثال: آپارتمان ۸۵ متری - فاز ۱ اندیشه"
                  className="h-11 rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-navy">آدرس ملک *</label>
                <Input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="مثال: اندیشه، فاز ۱، خیابان گلستان"
                  className="h-11 rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy">نوع معامله *</label>
                <Select
                  value={form.transaction}
                  onValueChange={(value) => set("transaction", value as Transaction)}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                    <SelectItem value="فروش">فروش</SelectItem>
                    <SelectItem value="اجاره">اجاره</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy">دسته‌بندی *</label>
                <Select
                  value={form.category}
                  onValueChange={(value) => set("category", value as Category)}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-navy">منطقه *</label>
                <Select
                  value={form.area}
                  onValueChange={(value) => set("area", value)}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                    {AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* images */}
          <section className="space-y-3">
            <h3 className="text-xs font-extrabold text-gold-deep">تصاویر</h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy">لینک تصویر اصلی</label>
                <Input
                  dir="ltr"
                  value={form.image}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="https://..."
                  className="h-11 rounded-xl border-white/80 bg-white/60 text-end shadow-sm backdrop-blur-md"
                />
              </div>
              {form.image.trim() ? (
                <div className="relative h-11 w-24 overflow-hidden rounded-xl ring-1 ring-white/70 sm:w-28">
                  <img
                    src={form.image.trim()}
                    alt="پیش‌نمایش"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <ImageIcon className="absolute inset-0 m-auto size-4 text-muted-foreground" />
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-navy">
                گالری تصاویر (هر لینک در یک خط)
              </label>
              <Textarea
                dir="ltr"
                value={form.galleryText}
                onChange={(e) => set("galleryText", e.target.value)}
                placeholder={"https://...\nhttps://..."}
                rows={3}
                className="resize-none rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
              />
            </div>
          </section>

          {/* specs */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-gold-deep">مشخصات فایل</h3>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  set("specs", [...form.specs, { icon: "ruler", label: "" }])
                }
                className="h-8 rounded-full px-3 text-xs font-bold text-primary hover:bg-white/80"
              >
                <Plus className="size-3.5" />
                افزودن مشخصات
              </Button>
            </div>
            <div className="space-y-2">
              {form.specs.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={spec.icon}
                    onValueChange={(value) => updateSpec(index, { icon: value })}
                  >
                    <SelectTrigger className="h-10 w-32 rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                      {SPEC_ICON_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {SPEC_ICON_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={spec.label}
                    onChange={(e) => updateSpec(index, { label: e.target.value })}
                    placeholder="مثال: ۸۵ متر، ۲ خواب، برق ۳ فاز..."
                    className="h-10 flex-1 rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="حذف مشخصات"
                    disabled={form.specs.length === 1}
                    onClick={() => removeSpec(index)}
                    className="size-10 shrink-0 rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* description + amenities */}
          <section className="space-y-3">
            <h3 className="text-xs font-extrabold text-gold-deep">توضیحات و امکانات</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-navy">توضیحات ملک</label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="توضیحات کامل ملک..."
                rows={3}
                className="resize-none rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-navy">
                امکانات (با کاما جدا کنید)
              </label>
              <Textarea
                value={form.amenitiesText}
                onChange={(e) => set("amenitiesText", e.target.value)}
                placeholder="آسانسور، پکیج، کمد دیواری، پارکینگ..."
                rows={2}
                className="resize-none rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
              />
            </div>
          </section>

          {/* price */}
          <section className="space-y-3">
            <h3 className="text-xs font-extrabold text-gold-deep">قیمت</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy">
                  قیمت (تومان) *
                </label>
                <Input
                  dir="ltr"
                  type="number"
                  min={0}
                  value={form.priceValue}
                  onChange={(e) => set("priceValue", e.target.value)}
                  placeholder="2850000000"
                  className="h-11 rounded-xl border-white/80 bg-white/60 text-end shadow-sm backdrop-blur-md"
                />
                <p className="text-[10px] text-muted-foreground">
                  فروش: کل قیمت | اجاره: مبلغ ماهانه
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy">
                  متن قیمت نمایشی
                </label>
                <Input
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="۲,۸۵۰,۰۰۰,۰۰۰ تومان"
                  className="h-11 rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy">قیمت هر متر</label>
                <Input
                  value={form.pricePerMeter}
                  onChange={(e) => set("pricePerMeter", e.target.value)}
                  placeholder="۳۳,۵۲۹,۰۰۰ تومان"
                  className="h-11 rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              اگر «متن قیمت نمایشی» خالی باشد، قیمت به صورت خودکار از «قیمت (تومان)» ساخته می‌شود.
            </p>
          </section>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-white/70 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="h-11 rounded-xl px-5 text-sm font-bold text-muted-foreground hover:bg-white/80"
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="gold-gradient h-11 rounded-xl px-6 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105 disabled:opacity-70"
            >
              {pending ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : property ? (
                "ذخیره تغییرات"
              ) : (
                "افزودن فایل"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}