import type { LucideIcon } from "lucide-react";
import {
  Award,
  BedDouble,
  Building,
  Building2,
  Car,
  Factory,
  FileText,
  Headset,
  Home,
  Layers,
  MapPin,
  Ruler,
  ShieldCheck,
  Store,
  Zap,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

/** A property listing as stored in Convex. */
export type Property = Doc<"properties">;
export type Transaction = "فروش" | "اجاره";
export type Category = "مسکونی" | "اداری" | "تجاری" | "صنعتی";

/* ---------- Spec icons (keys are stored in Convex) ---------- */

export const SPEC_ICON_KEYS = [
  "ruler",
  "bed",
  "car",
  "building",
  "layers",
  "file",
  "zap",
  "store",
] as const;
export type SpecIconKey = (typeof SPEC_ICON_KEYS)[number];

export const SPEC_ICONS: Record<SpecIconKey, LucideIcon> = {
  ruler: Ruler,
  bed: BedDouble,
  car: Car,
  building: Building,
  layers: Layers,
  file: FileText,
  zap: Zap,
  store: Store,
};

/** Resolve a stored icon key (from Convex) to its Lucide icon component. */
export function specIcon(key: string): LucideIcon {
  return SPEC_ICONS[key as SpecIconKey] ?? Ruler;
}

export const SPEC_ICON_LABELS: Record<SpecIconKey, string> = {
  ruler: "متراژ",
  bed: "خواب",
  car: "پارکینگ",
  building: "طبقه",
  layers: "لایه‌ها",
  file: "سند",
  zap: "برق",
  store: "موقعیت",
};

/* ---------- Static site content ---------- */

export const CATEGORY_META: Record<
  Category,
  { icon: LucideIcon; blurb: string }
> = {
  مسکونی: { icon: Home, blurb: "آپارتمان، ویلا، باغ" },
  اداری: { icon: Building2, blurb: "دفتر، ساختمان اداری" },
  تجاری: { icon: Store, blurb: "مغازه، پاساژ، مجتمع" },
  صنعتی: { icon: Factory, blurb: "سوله، کارگاه، کارخانه" },
};

export const CATEGORIES: Category[] = ["مسکونی", "اداری", "تجاری", "صنعتی"];

export const WHY_US = [
  {
    icon: Award,
    title: "تجربه و تخصص",
    description: "سال‌ها تجربه در بازار املاک شهریار با مشاوره تخصصی و دقیق",
  },
  {
    icon: ShieldCheck,
    title: "ملک‌های معتبر",
    description: "بررسی و تایید حقوقی تمامی فایل‌ها قبل از انتشار",
  },
  {
    icon: MapPin,
    title: "دسترسی آسان",
    description: "موقعیت مکانی عالی و دسترسی سریع به تمام مناطق شهریار",
  },
  {
    icon: Headset,
    title: "پشتیبانی همراه شما",
    description: "پشتیبانی و مشاوره در تمام مراحل خرید، فروش و اجاره",
  },
] as const;

export const AREAS = ["اندیشه", "باغستان", "مرکز شهریار", "شهرک صنعتی"] as const;

export const REQUEST_TYPES = [
  "خرید ملک",
  "فروش ملک",
  "اجاره ملک",
  "مشاوره سرمایه‌گذاری",
  "ارزیابی ملک",
  "سایر",
] as const;

export const AMENITIES_POOL = [
  "آسانسور",
  "پکیج",
  "کمد دیواری",
  "درب ضد سرقت",
  "آیفون",
  "آیفون تصویری",
  "پارکینگ",
  "لابی",
  "نگهبانی",
  "انباری",
  "شوفاژ",
  "کولر اسپلیت",
  "روف گاردن",
  "آنتن مرکزی",
  "شبکه داخلی",
  "سونا",
  "جکوزی",
  "سالن ورزش",
] as const;

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

export const IMAGES = {
  hero: u("photo-1487958449943-2429e8be8625"),
  fallback: u("photo-1486406146926-c627a92ad1ab"),
};