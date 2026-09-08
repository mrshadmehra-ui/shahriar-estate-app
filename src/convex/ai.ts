"use node";

import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * AI features backed by SambaNova Cloud (OpenAI-compatible chat completions).
 * The key lives server-side: set SAMBANOVA_API_KEY (and optionally AI_MODEL)
 * in the project's Keys / environment variables.
 */

const API_KEY = process.env.SAMBANOVA_API_KEY;
const MODEL = process.env.AI_MODEL ?? "Meta-Llama-3.3-70B-Instruct";
const BASE_URL = "https://api.sambanova.ai/v1";

const CATEGORIES = ["مسکونی", "اداری", "تجاری", "صنعتی"] as const;
const TRANSACTIONS = ["فروش", "اجاره"] as const;
const AREAS = ["اندیشه", "باغستان", "مرکز شهریار", "شهرک صنعتی"] as const;
const SPEC_ICONS = [
  "ruler",
  "bed",
  "car",
  "building",
  "layers",
  "file",
  "zap",
  "store",
] as const;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chat(messages: ChatMessage[], temperature = 0.2): Promise<string> {
  if (!API_KEY) {
    throw new ConvexError(
      "کلید هوش مصنوعی تنظیم نشده است. لطفا SAMBANOVA_API_KEY را در بخش Keys پروژه وارد کنید.",
    );
  }
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new ConvexError(`سرویس هوش مصنوعی خطا داد (${response.status}). لطفا دوباره تلاش کنید.`);
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new ConvexError("پاسخی از سرویس هوش مصنوعی دریافت نشد.");
  }
  return content;
}

/** Try to parse model output as JSON even if it is wrapped in code fences. */
function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
  }
  throw new ConvexError("خروجی هوش مصنوعی قابل پردازش نبود. دوباره تلاش کنید.");
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/* ------------------------------------------------------------------ */
/* 1) Speech / free text → structured listing                          */
/* ------------------------------------------------------------------ */

type ExtractedListing = {
  title: string;
  location: string;
  area: string;
  category: (typeof CATEGORIES)[number];
  transaction: (typeof TRANSACTIONS)[number];
  image: string;
  gallery: string[];
  specs: { icon: string; label: string }[];
  amenities: string[];
  description: string;
  price?: string;
  pricePerMeter?: string;
  priceValue: number | null;
};

export const extractListing = action({
  args: { text: v.string() },
  handler: async (ctx, args): Promise<ExtractedListing> => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (user === null) {
      throw new ConvexError("برای ثبت فایل با هوش مصنوعی باید وارد حساب خود شوید.");
    }

    const content = await chat([
      {
        role: "system",
        content: `تو دستیار املاک شهریار هستی. متن آزاد فارسی مشاور را به اطلاعات ساختاریافته یک فایل ملک تبدیل کن.
خروجی باید فقط یک JSON معتبر بدون هیچ متن اضافه‌ای باشد با این ساختار:
{
  "title": "عنوان کوتاه فایل",
  "location": "آدرس کامل",
  "area": "یکی از: ${AREAS.join("، ")}",
  "category": "یکی از: ${CATEGORIES.join("، ")}",
  "transaction": "یکی از: ${TRANSACTIONS.join("، ")}",
  "description": "توضیحات ملک به فارسی",
  "price": "متن قیمت نمایشی با تومان یا null",
  "priceValue": "قیمت کل (فروش) یا اجاره ماهانه (اجاره) به تومان به صورت عدد یا null",
  "pricePerMeter": "قیمت هر متر یا null",
  "specs": [{"icon": "یکی از: ${SPEC_ICONS.join("، ")}", "label": "مثال: ۸۵ متر، ۲ خواب، ۲ پارکینگ، طبقه ۳، برق ۳ فاز"}],
  "amenities": ["آسانسور", "پکیج", ...]
}
اگر اطلاعاتی در متن نیامده بود مقدار آن را null یا آرایه خالی بگذار. عناوین را کوتاه و واضح بنویس.`,
      },
      { role: "user", content: args.text },
    ]);

    const raw = parseJsonLoose(content) as Record<string, unknown>;
    const category = CATEGORIES.includes(raw.category as never)
      ? (raw.category as (typeof CATEGORIES)[number])
      : "مسکونی";
    const transaction = TRANSACTIONS.includes(raw.transaction as never)
      ? (raw.transaction as (typeof TRANSACTIONS)[number])
      : "فروش";
    const area = AREAS.includes(raw.area as never)
      ? (raw.area as string)
      : "مرکز شهریار";
    const priceValue = Number(raw.priceValue);

    const specs = Array.isArray(raw.specs)
      ? raw.specs
          .map((spec) => ({
            icon:
              SPEC_ICONS.includes(spec?.icon as never)
                ? (spec.icon as string)
                : "ruler",
            label: text(spec?.label),
          }))
          .filter((spec) => spec.label)
          .slice(0, 6)
      : [];
    const amenities = Array.isArray(raw.amenities)
      ? raw.amenities.map((item) => text(item)).filter(Boolean).slice(0, 20)
      : [];

    return {
      title: text(raw.title) || "فایل جدید",
      location: text(raw.location),
      area,
      category,
      transaction,
      image: "",
      gallery: [],
      specs,
      amenities,
      description: text(raw.description),
      price: text(raw.price) || undefined,
      pricePerMeter: text(raw.pricePerMeter) || undefined,
      priceValue:
        Number.isFinite(priceValue) && priceValue > 0 ? priceValue : null,
    };
  },
});

/* ------------------------------------------------------------------ */
/* 2) Applicant needs ↔ property matching                              */
/* ------------------------------------------------------------------ */

export const matchNeeds = action({
  args: {
    transaction: v.optional(v.string()),
    category: v.optional(v.string()),
    area: v.optional(v.string()),
    budgetValue: v.optional(v.number()), // max budget in Toman
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.runQuery(api.properties.list);

    const needs: Record<string, unknown> = {};
    if (args.transaction) needs.transaction = args.transaction;
    if (args.category) needs.category = args.category;
    if (args.area) needs.area = args.area;
    if (args.budgetValue !== undefined) needs.budgetToman = args.budgetValue;
    if (args.description?.trim()) needs.description = args.description.trim();

    if (properties.length === 0 || Object.keys(needs).length === 0) {
      return { matches: [] };
    }

    const propertySummaries = properties.map((p) => ({
      id: p._id,
      title: p.title,
      location: p.location,
      area: p.area,
      category: p.category,
      transaction: p.transaction,
      priceValue: p.priceValue,
      specs: p.specs.map((s) => s.label),
      description: p.description,
    }));

    const content = await chat([
      {
        role: "system",
        content: `تو موتور تطبیق هوشمند املاک شهریار هستی. نیازهای متقاضی را با فایل‌های ملکی مقایسه کن و بهترین تطبیق‌ها را انتخاب کن.
معیارها: نوع معامله (فروش/اجاره)، دسته‌بندی، منطقه، بودجه، متراژ و امکانات.
خروجی فقط یک JSON معتبر بدون متن اضافه: {"matches": [{"id": "شناسه فایل", "score": "امتیاز ۰ تا ۱۰۰", "reason": "دلیل کوتاه به فارسی"}]}
حداکثر ۵ مورد، مرتب‌شده از بالاترین امتیاز. اگر فایل مناسبی نبود آرایه خالی برگردان.`,
      },
      {
        role: "user",
        content: JSON.stringify({ needs, properties: propertySummaries }),
      },
    ]);

    const raw = parseJsonLoose(content) as { matches?: unknown };
    const matches = Array.isArray(raw.matches)
      ? raw.matches
          .map((m) => ({
            id: text(m?.id),
            score: Math.max(0, Math.min(100, Number(m?.score) || 0)),
            reason: text(m?.reason),
          }))
          .filter((m) => m.id && m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      : [];

    return { matches };
  },
});