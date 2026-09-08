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

export type Transaction = "فروش" | "اجاره";
export type Category = "مسکونی" | "اداری" | "تجاری" | "صنعتی";

export interface PropertySpec {
  icon: LucideIcon;
  label: string;
}

export interface Property {
  id: string;
  title: string;
  location: string;
  area: string;
  category: Category;
  transaction: Transaction;
  image: string;
  gallery: string[];
  specs: PropertySpec[];
  amenities: string[];
  description: string;
  price?: string;
  pricePerMeter?: string;
  priceValue: number; // total price (sale) or monthly rent (lease), in Toman
}

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

const INTERIORS = [
  u("photo-1600585154340-be6161a56a0c"),
  u("photo-1600607687939-ce8a6c25118c"),
  u("photo-1522708323590-d24dbb6b0267"),
  u("photo-1493809842364-78817add7ffb"),
  u("photo-1502672260266-1c1ef2d93688"),
];

const HOUSES = [
  u("photo-1512917774080-9991f1c4c750"),
  u("photo-1600596542815-ffad4c1539a9"),
  u("photo-1580587771525-78b9dba3b914"),
  u("photo-1600585154340-be6161a56a0c"),
  u("photo-1600607687939-ce8a6c25118c"),
];

const INDUSTRIAL = [
  u("photo-1586528116311-ad8dd3c8310d"),
  u("photo-1553413077-190dd305871c"),
  u("photo-1504328345606-18bbc8c9d7d1"),
  u("photo-1581091226825-a6a2a5aee158"),
  u("photo-1581092160562-40aa08e78837"),
];

const OFFICES = [
  u("photo-1497366216548-37526070297c"),
  u("photo-1497366811353-6870744d04b2"),
  u("photo-1524758631624-e2822e304c36"),
  u("photo-1486406146926-c627a92ad1ab"),
  u("photo-1460317442991-0ec209397118"),
];

const SHOPS = [
  u("photo-1441986300917-64674bd600d8"),
  u("photo-1472851290380-c39aceb5aae4"),
  u("photo-1555529669-e69e7aa0ba9a"),
  u("photo-1567401893414-76b7b1e5a7a5"),
  u("photo-1534452203293-494d7ddbf7e0"),
];

export const IMAGES = {
  hero: u("photo-1487958449943-2429e8be8625"),
  interiors: INTERIORS,
  houses: HOUSES,
  industrial: INDUSTRIAL,
  offices: OFFICES,
  shops: SHOPS,
};

export const properties: Property[] = [
  {
    id: "p1",
    title: "آپارتمان ۸۵ متری - فاز ۱ اندیشه",
    location: "اندیشه، فاز ۱، خیابان گلستان",
    area: "اندیشه",
    category: "مسکونی",
    transaction: "فروش",
    image: INTERIORS[2],
    gallery: [...INTERIORS],
    specs: [
      { icon: Ruler, label: "۸۵ متر" },
      { icon: BedDouble, label: "۲ خواب" },
      { icon: Car, label: "۲ پارکینگ" },
      { icon: Building, label: "طبقه ۳" },
    ],
    amenities: [
      "آسانسور",
      "پکیج",
      "کمد دیواری",
      "درب ضد سرقت",
      "آیفون تصویری",
      "پارکینگ",
      "انباری",
      "لابی",
    ],
    description:
      "آپارتمان نوساز با طراحی مدرن و نورگیری عالی، واقع در بهترین موقعیت فاز ۱ اندیشه، نزدیک به مراکز خرید، مدارس و حمل و نقل عمومی. سند تک برگ و آماده انتقال.",
    price: "۲,۸۵۰,۰۰۰,۰۰۰ تومان",
    pricePerMeter: "۳۳,۵۲۹,۰۰۰ تومان",
    priceValue: 2_850_000_000,
  },
  {
    id: "p2",
    title: "آپارتمان ۹۰ متری - فاز ۲ اندیشه",
    location: "اندیشه، فاز ۲، بلوار اصلی",
    area: "اندیشه",
    category: "مسکونی",
    transaction: "اجاره",
    image: INTERIORS[3],
    gallery: [...INTERIORS],
    specs: [
      { icon: Ruler, label: "۹۰ متر" },
      { icon: BedDouble, label: "۲ خواب" },
      { icon: Car, label: "۱ پارکینگ" },
      { icon: Building, label: "طبقه ۲" },
    ],
    amenities: [
      "آسانسور",
      "کمد دیواری",
      "درب ضد سرقت",
      "آیفون تصویری",
      "پارکینگ",
      "لابی",
    ],
    description:
      "آپارتمان با چشم‌انداز عالی و نزدیک به پارک و مراکز خرید، مناسب خانواده. قابل رهن و اجاره کامل با شرایط توافقی.",
    price: "۲۸,۰۰۰,۰۰۰ تومان ماهانه",
    priceValue: 28_000_000,
  },
  {
    id: "p3",
    title: "ویلا ۲۵۰ متری - باغستان",
    location: "باغستان، خیابان گلستان، کوچه سوم",
    area: "باغستان",
    category: "مسکونی",
    transaction: "فروش",
    image: HOUSES[0],
    gallery: [...HOUSES],
    specs: [
      { icon: Ruler, label: "۲۵۰ متر" },
      { icon: BedDouble, label: "۴ خواب" },
      { icon: Car, label: "۲ پارکینگ" },
      { icon: Layers, label: "حیاط ۳۰۰ متری" },
    ],
    amenities: [
      "روف گاردن",
      "کمد دیواری",
      "آیفون تصویری",
      "پارکینگ",
      "انباری",
      "سونا",
    ],
    description:
      "ویلای نوساز با حیاط وسیع و نورگیر، مناسب زندگی خانوادگی و آرامش کامل، با دسترسی سریع به بزرگراه شهریار-تهران.",
    price: "۱۲,۵۰۰,۰۰۰,۰۰۰ تومان",
    pricePerMeter: "۵۰,۰۰۰,۰۰۰ تومان",
    priceValue: 12_500_000_000,
  },
  {
    id: "p4",
    title: "دفتر اداری ۶۰ متری - مجتمع شهریار",
    location: "شهریار، روبروی شهرک اداری، مجتمع اداری تجاری شهریار",
    area: "مرکز شهریار",
    category: "اداری",
    transaction: "اجاره",
    image: OFFICES[0],
    gallery: [...OFFICES],
    specs: [
      { icon: Ruler, label: "۶۰ متر" },
      { icon: Building, label: "طبقه ۳" },
      { icon: FileText, label: "سند ششدانگ" },
      { icon: Layers, label: "لابی مدرن" },
    ],
    amenities: [
      "آسانسور",
      "سیستم سرمایش و گرمایش",
      "لابی",
      "نگهبانی",
      "پارکینگ",
      "درب ضد سرقت",
    ],
    description:
      "دفتر اداری در بهترین موقعیت تجاری شهریار، روبروی شهرک اداری. مناسب شرکت‌ها و دفاتر کار با دسترسی عالی به حمل و نقل عمومی.",
    price: "۹,۵۰۰,۰۰۰ تومان ماهانه",
    priceValue: 9_500_000,
  },
  {
    id: "p5",
    title: "مغازه ۴۵ متری - بازار مرکزی",
    location: "شهریار، بازار مرکزی، راسته اصلی",
    area: "مرکز شهریار",
    category: "تجاری",
    transaction: "فروش",
    image: SHOPS[0],
    gallery: [...SHOPS],
    specs: [
      { icon: Ruler, label: "۴۵ متر" },
      { icon: Zap, label: "برق ۳ فاز" },
      { icon: FileText, label: "سند تک برگ" },
      { icon: Store, label: "موقعیت عالی" },
    ],
    amenities: [
      "ویترین",
      "انباری",
      "سرویس بهداشتی",
      "برق ۳ فاز",
      "درب کرکره‌ای",
      "تهویه",
    ],
    description:
      "مغازه تجاری در شلوغ‌ترین نقطه بازار مرکزی شهریار، با پتانسیل درآمدی بالا و سند تک برگ. مناسب سرمایه‌گذاری بلندمدت.",
    price: "۴,۲۰۰,۰۰۰,۰۰۰ تومان",
    pricePerMeter: "۹۳,۳۳۳,۰۰۰ تومان",
    priceValue: 4_200_000_000,
  },
  {
    id: "p6",
    title: "سوله ۱۲۰۰ متری - شهرک صنعتی",
    location: "شهرک صنعتی شهریار، خیابان صنعت",
    area: "شهرک صنعتی",
    category: "صنعتی",
    transaction: "فروش",
    image: INDUSTRIAL[0],
    gallery: [...INDUSTRIAL],
    specs: [
      { icon: Ruler, label: "۱,۲۰۰ متر" },
      { icon: FileText, label: "سند تک برگ" },
      { icon: Zap, label: "برق ۳ فاز" },
    ],
    amenities: [
      "برق ۳ فاز",
      "دفتر اداری",
      "سوله استاندارد",
      "محوطه آسفالت",
      "درب ریلی",
      "آب صنعتی",
    ],
    description:
      "سوله صنعتی با اسکلت فلزی استاندارد و سند تک برگ، مناسب کارگاه، کارخانه و انبار. دسترسی آسان به جاده اصلی شهرک صنعتی شهریار.",
    price: "۲۸,۰۰۰,۰۰۰,۰۰۰ تومان",
    pricePerMeter: "۲۳,۳۳۳,۰۰۰ تومان",
    priceValue: 28_000_000_000,
  },
  {
    id: "p7",
    title: "سوله ۸۰۰ متری - شهرک صنعتی",
    location: "شهرک صنعتی شهریار، فاز ۲",
    area: "شهرک صنعتی",
    category: "صنعتی",
    transaction: "اجاره",
    image: INDUSTRIAL[1],
    gallery: [...INDUSTRIAL],
    specs: [
      { icon: Ruler, label: "۸۰۰ متر" },
      { icon: FileText, label: "سند رسمی" },
      { icon: Zap, label: "برق ۳ فاز" },
    ],
    amenities: [
      "برق ۳ فاز",
      "سوله استاندارد",
      "محوطه مناسب",
      "درب ریلی",
      "آب صنعتی",
      "نگهبانی",
    ],
    description:
      "سوله مناسب خط تولید و انبارداری با ارتفاع مفید ۸ متر، واقع در فاز ۲ شهرک صنعتی شهریار با زیرساخت کامل.",
    price: "۸۵,۰۰۰,۰۰۰ تومان ماهانه",
    priceValue: 85_000_000,
  },
];

export const CATEGORY_META: Record<
  Category,
  { icon: LucideIcon; blurb: string }
> = {
  مسکونی: { icon: Home, blurb: "آپارتمان، ویلا، باغ" },
  اداری: { icon: Building2, blurb: "دفتر، ساختمان اداری" },
  تجاری: { icon: Store, blurb: "مغازه، پاساژ، مجتمع" },
  صنعتی: { icon: Factory, blurb: "سوله، کارگاه، کارخانه" },
};

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