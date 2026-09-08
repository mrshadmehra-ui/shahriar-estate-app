// Default listings inserted into the `properties` table the first time the
// seed mutation runs. Specs reference icon keys resolved on the frontend
// (see SPEC_ICONS in src/lib/estate.ts).
import type { Doc } from "./_generated/dataModel";

type SeedProperty = Omit<Doc<"properties">, "_id" | "_creationTime">;

export const DEFAULT_PROPERTIES: SeedProperty[] = [
  {
    title: "آپارتمان ۸۵ متری - فاز ۱ اندیشه",
    location: "اندیشه، فاز ۱، خیابان گلستان",
    area: "اندیشه",
    category: "مسکونی",
    transaction: "فروش",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80",
    ],
    specs: [
      { icon: "ruler", label: "۸۵ متر" },
      { icon: "bed", label: "۲ خواب" },
      { icon: "car", label: "۲ پارکینگ" },
      { icon: "building", label: "طبقه ۳" },
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
    title: "آپارتمان ۹۰ متری - فاز ۲ اندیشه",
    location: "اندیشه، فاز ۲، بلوار اصلی",
    area: "اندیشه",
    category: "مسکونی",
    transaction: "اجاره",
    image:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80",
    ],
    specs: [
      { icon: "ruler", label: "۹۰ متر" },
      { icon: "bed", label: "۲ خواب" },
      { icon: "car", label: "۱ پارکینگ" },
      { icon: "building", label: "طبقه ۲" },
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
    title: "ویلا ۲۵۰ متری - باغستان",
    location: "باغستان، خیابان گلستان، کوچه سوم",
    area: "باغستان",
    category: "مسکونی",
    transaction: "فروش",
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
    ],
    specs: [
      { icon: "ruler", label: "۲۵۰ متر" },
      { icon: "bed", label: "۴ خواب" },
      { icon: "car", label: "۲ پارکینگ" },
      { icon: "layers", label: "حیاط ۳۰۰ متری" },
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
    title: "دفتر اداری ۶۰ متری - مجتمع شهریار",
    location: "شهریار، روبروی شهرک اداری، مجتمع اداری تجاری شهریار",
    area: "مرکز شهریار",
    category: "اداری",
    transaction: "اجاره",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80",
    ],
    specs: [
      { icon: "ruler", label: "۶۰ متر" },
      { icon: "building", label: "طبقه ۳" },
      { icon: "file", label: "سند ششدانگ" },
      { icon: "layers", label: "لابی مدرن" },
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
    title: "مغازه ۴۵ متری - بازار مرکزی",
    location: "شهریار، بازار مرکزی، راسته اصلی",
    area: "مرکز شهریار",
    category: "تجاری",
    transaction: "فروش",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1472851290380-c39aceb5aae4?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=1400&q=80",
    ],
    specs: [
      { icon: "ruler", label: "۴۵ متر" },
      { icon: "zap", label: "برق ۳ فاز" },
      { icon: "file", label: "سند تک برگ" },
      { icon: "store", label: "موقعیت عالی" },
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
    title: "سوله ۱۲۰۰ متری - شهرک صنعتی",
    location: "شهرک صنعتی شهریار، خیابان صنعت",
    area: "شهرک صنعتی",
    category: "صنعتی",
    transaction: "فروش",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1400&q=80",
    ],
    specs: [
      { icon: "ruler", label: "۱,۲۰۰ متر" },
      { icon: "file", label: "سند تک برگ" },
      { icon: "zap", label: "برق ۳ فاز" },
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
    title: "سوله ۸۰۰ متری - شهرک صنعتی",
    location: "شهرک صنعتی شهریار، فاز ۲",
    area: "شهرک صنعتی",
    category: "صنعتی",
    transaction: "اجاره",
    image:
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1400&q=80",
    ],
    specs: [
      { icon: "ruler", label: "۸۰۰ متر" },
      { icon: "file", label: "سند رسمی" },
      { icon: "zap", label: "برق ۳ فاز" },
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