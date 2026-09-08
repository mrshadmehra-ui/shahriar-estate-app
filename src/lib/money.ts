/**
 * Money Service — the single source of truth for the Rial/Toman rule.
 *
 * GOLDEN RULE (project-wide):
 *   - The database and all internal calculations store amounts ONLY in RIAL,
 *     as INTEGER numbers (never floats).
 *   - Toman is purely a user input/display unit: 1 toman = 10 rials.
 *   - No page/component/query may convert rials to tomans on its own;
 *     always go through this module.
 */
import { toFa } from "./fa";

/** 1 toman = 10 rials */
export const RIALS_PER_TOMAN = 10;

/** How amounts are displayed to the user. Persisted in localStorage; DB never changes. */
export type MoneyUnit = "toman" | "rial";

export const MONEY_UNIT_LABELS: Record<MoneyUnit, string> = {
  toman: "تومان",
  rial: "ریال",
};

export function isMoneyUnit(value: string | null | undefined): value is MoneyUnit {
  return value === "toman" || value === "rial";
}

/* ---------- conversions ---------- */

/** toman -> rial (multiply by 10). The stored/internally used value. */
export function toRial(toman: number): number {
  return Math.round(toman) * RIALS_PER_TOMAN;
}

/** rial -> toman (divide by 10). For display/input only. */
export function toToman(rial: number): number {
  return rial / RIALS_PER_TOMAN;
}

/** Parse a user-entered number into an integer rial value.
 *  `unit` is the unit the user typed in. Returns 0 for empty, NaN for invalid. */
export function parseRialInput(raw: string | number, unit: MoneyUnit): number {
  if (typeof raw === "number") return unit === "toman" ? toRial(raw) : Math.round(raw);
  const cleaned = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[,\s\u200c]/g, "");
  if (cleaned === "" ) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return unit === "toman" ? Math.round(n) * RIALS_PER_TOMAN : Math.round(n);
}

/** Validate that a rial amount is a non-negative integer (DB rule). */
export function isValidRialAmount(rial: number): boolean {
  return Number.isFinite(rial) && Number.isInteger(rial) && rial >= 0;
}

/* ---------- formatting ---------- */

/** Format a rial amount as an integer with latin grouping: 1,234,567 */
export function groupRial(rial: number): string {
  return Math.round(rial).toLocaleString("en-US");
}

/** Display a rial amount in the requested unit: "۱٬۲۳۴٬۵۶۷ تومان" */
export function formatMoney(rial: number, unit: MoneyUnit): string {
  const value = unit === "toman" ? toToman(rial) : rial;
  return `${toFa(Math.round(value).toLocaleString("en-US"))} ${MONEY_UNIT_LABELS[unit]}`;
}

/** Short display (no unit label): "۱٬۲۳۴٬۵۶۷" */
export function formatMoneyValue(rial: number, unit: MoneyUnit): string {
  const value = unit === "toman" ? toToman(rial) : rial;
  return toFa(Math.round(value).toLocaleString("en-US"));
}

/** Compact form for cards: ۱۲۵ میلیون تومان */
export function formatMoneyCompact(rial: number, unit: MoneyUnit): string {
  const toman = toToman(rial);
  const abs = Math.abs(toman);
  const sign = toman < 0 ? "−" : "";
  const names: [number, string][] = [
    [1e9, "میلیارد"],
    [1e6, "میلیون"],
    [1e3, "هزار"],
  ];
  for (const [div, name] of names) {
    if (abs >= div) {
      const v = abs / div;
      const rounded = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
      return `${sign}${toFa(String(rounded).replace(/\.0$/, "").replace(".", "٫"))} ${name} ${MONEY_UNIT_LABELS[unit]}`;
    }
  }
  return `${sign}${toFa(Math.round(abs).toLocaleString("en-US"))} ${MONEY_UNIT_LABELS[unit]}`;
}

/** Number-to-words hint for tomans (used in payment/charge forms). */
const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];

function threeDigits(n: number): string {
  const parts: string[] = [];
  if (n >= 100) parts.push(HUNDREDS[Math.floor(n / 100)]);
  const rem = n % 100;
  if (rem >= 20) {
    const t = TENS[Math.floor(rem / 10)];
    const o = ONES[rem % 10];
    parts.push(o ? `${t} و ${o}` : t);
  } else if (rem >= 10) {
    parts.push(TEENS[rem - 10]);
  } else if (rem > 0) {
    parts.push(ONES[rem]);
  }
  return parts.join(" و ");
}

/** Convert a rial amount to a Persian words string in tomans: «یک میلیون و پانصد هزار تومان» */
export function numberToWordsRial(rial: number): string {
  const toman = Math.round(toToman(rial));
  if (toman === 0) return "صفر تومان";
  const groups: [number, string][] = [
    [1e9, "میلیارد"],
    [1e6, "میلیون"],
    [1e3, "هزار"],
  ];
  const parts: string[] = [];
  let rest = toman;
  for (const [div, name] of groups) {
    const g = Math.floor(rest / div);
    if (g > 0) {
      parts.push(`${threeDigits(g)} ${name}`);
      rest %= div;
    }
  }
  if (rest > 0) parts.push(threeDigits(rest));
  return `${parts.join(" و ")} تومان`;
}

/* ---------- backend-side integer guard ---------- */

/**
 * Normalize + validate an amount that arrived from a mutation argument.
 * Every financial mutation must pass incoming amounts through this.
 * Throws with a Persian message on invalid input.
 */
export function normalizeRialAmount(value: number, fieldName = "مبلغ"): number {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${fieldName} باید عدد صحیح (به ریال) باشد.`);
  }
  if (value < 0) {
    throw new Error(`${fieldName} نمی‌تواند منفی باشد.`);
  }
  return value;
}