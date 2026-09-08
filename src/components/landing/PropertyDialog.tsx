import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, MessageSquare, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Scene } from "./Scene";
import { cn } from "@/lib/utils";
import { faNumber, PHONE_TEL } from "@/lib/fa";
import { specIcon, type Property } from "@/lib/estate";

const badgeStyles = {
  فروش: "bg-emerald-500/95",
  اجاره: "bg-orange-500/95",
} as const;

interface PropertyDialogProps {
  property: Property | null;
  onOpenChange: (open: boolean) => void;
  onConsult: (property: Property) => void;
}

export function PropertyDialog({
  property,
  onOpenChange,
  onConsult,
}: PropertyDialogProps) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    setSlide(0);
  }, [property]);

  if (!property) return null;

  const gallery = property.gallery;
  const total = gallery.length;
  const visibleAmenities = property.amenities.slice(0, 6);
  const moreCount = property.amenities.length - visibleAmenities.length;

  const prev = () => setSlide((s) => (s - 1 + total) % total);
  const next = () => setSlide((s) => (s + 1) % total);

  return (
    <Dialog open={!!property} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="glass max-h-[92dvh] max-w-3xl gap-0 overflow-hidden rounded-[1.75rem] border-white/60 p-0 sm:rounded-[2rem]"
      >
        <DialogTitle className="sr-only">{property.title}</DialogTitle>

        {/* Gallery */}
        <div className="relative">
          <button
            onClick={() => onOpenChange(false)}
            aria-label="بستن"
            className="glass-soft absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full text-navy transition hover:bg-white/80"
          >
            <X className="size-4" />
          </button>
          <Scene
            key={slide}
            src={gallery[slide]}
            alt={property.title}
            className="h-60 sm:h-80"
            imgClassName="animate-in fade-in duration-300"
          />
          <span className="glass-soft absolute bottom-4 left-4 rounded-full px-3 py-1 text-[11px] font-bold text-navy">
            {faNumber(slide + 1)} / {faNumber(total)}
          </span>
          <button
            onClick={prev}
            aria-label="تصویر قبلی"
            className="glass-soft absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-navy transition hover:bg-white/80"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={next}
            aria-label="تصویر بعدی"
            className="glass-soft absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-navy transition hover:bg-white/80"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        <div className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-7">
          <div>
            <span
              className={cn(
                "mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
                badgeStyles[property.transaction],
              )}
            >
              {property.transaction}
            </span>
            <h3 className="text-lg font-extrabold leading-8 text-navy sm:text-xl">
              {property.title}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
              <MapPin className="size-4 shrink-0 text-gold-deep" />
              {property.location}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {property.specs.map((spec) => {
              const Icon = specIcon(spec.icon);
              return (
                <span
                  key={spec.label}
                  className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-navy"
                >
                  <Icon className="size-4 text-gold-deep" />
                  {spec.label}
                </span>
              );
            })}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-extrabold text-navy">
              توضیحات ملک
            </h4>
            <p className="text-sm leading-7 text-muted-foreground">
              {property.description}
            </p>
          </div>

          <div>
            <h4 className="mb-2.5 text-sm font-extrabold text-navy">امکانات</h4>
            <div className="flex flex-wrap gap-2">
              {visibleAmenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-sky-100/80 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-white/70"
                >
                  {amenity}
                </span>
              ))}
              {moreCount > 0 && (
                <span className="rounded-full bg-gold-soft px-3 py-1.5 text-xs font-semibold text-gold-deep">
                  +{faNumber(moreCount)} مورد دیگر
                </span>
              )}
            </div>
          </div>

          <div className="glass-soft flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
            <span className="text-xs font-medium text-muted-foreground">
              قیمت
            </span>
            <div className="text-start">
              <p className="text-sm font-extrabold text-navy sm:text-base">
                {property.price}
              </p>
              {property.pricePerMeter && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  هر متر: {property.pricePerMeter}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={() => onConsult(property)}
              className="h-12 rounded-xl border border-white/80 bg-white/60 text-sm font-bold text-primary shadow-sm transition hover:bg-white"
            >
              <MessageSquare className="size-4" />
              درخواست مشاوره
            </Button>
            <Button
              asChild
              className="gold-gradient h-12 rounded-xl text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105"
            >
              <a href={PHONE_TEL}>
                <Phone className="size-4" />
                تماس با دفتر
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}