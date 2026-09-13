/**
 * Date Architecture:
 *   - Database stores standard Gregorian epoch milliseconds (UTC-based `Date`).
 *   - The UI shows Jalali (Shamsi) dates.
 *   - All conversion happens here, in one place. No other code converts dates.
 *
 * Implementation notes (verified against known anchors):
 *   - Gregorian <-> JDN uses the Meeus integer formulas.
 *   - JDN(2026-09-08) = 2461292 ; JDN(2021-03-21) = 2459295
 *   - 1 Farvardin 1400 = 2021-03-21 ; 1 Farvardin 1405 = 2026-03-21
 *   - Jalali day number: j2d = 1948319 + 365*(jy-1) + floor((jy-1)/33)*8
 *     + floor((mod(jy-1,33)+3)/4) + 31*(jm-1) - floor((jm-1)/7)*(jm-7) + jd
 */

const div = (a: number, b: number) => Math.floor(a / b);
const mod = (a: number, b: number) => a - Math.floor(a / b) * b;

/** Gregorian (y,m,d) -> integer Julian Day Number (Meeus). Months 1-based. */
function g2d(gy: number, gm: number, gd: number): number {
  const a = div(14 - gm, 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  return (
    gd +
    div(153 * m + 2, 5) +
    365 * y +
    div(y, 4) -
    div(y, 100) +
    div(y, 400) -
    32045
  );
}

/** Integer Julian Day Number -> Gregorian (y,m,d). Months 1-based. */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  const a = jdn + 32044;
  const b = div(4 * a + 3, 146097);
  const c = a - div(146097 * b, 4);
  const d = div(4 * c + 3, 1461);
  const e = c - div(1461 * d, 4);
  const m = div(5 * e + 2, 153);
  const gd = e - div(153 * m + 2, 5) + 1;
  const gm = m + 3 - 12 * div(m, 10);
  const gy = 100 * b + d - 4800 + div(m, 10);
  return { gy, gm, gd };
}

/** Jalali (jy,jm,jd) -> integer JDN. */
function j2d(jy: number, jm: number, jd: number): number {
  return (
    1948319 +
    365 * (jy - 1) +
    div(jy - 1, 33) * 8 +
    div(mod(jy - 1, 33) + 3, 4) +
    31 * (jm - 1) -
    div(jm - 1, 7) * (jm - 7) +
    jd
  );
}

/** Is a Jalali year leap? (366 days) */
function isLeapJalali(jy: number): boolean {
  return j2d(jy + 1, 1, 1) - j2d(jy, 1, 1) === 366;
}

/** Integer JDN -> Jalali (jy,jm,jd). */
function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  // Candidate year: the Gregorian year's Jalali equivalent.
  let jy = d2g(jdn).gy - 621;
  let start = j2d(jy, 1, 1);
  let next = j2d(jy + 1, 1, 1);
  if (jdn < start) {
    jy -= 1;
    start = j2d(jy, 1, 1);
    next = j2d(jy + 1, 1, 1);
  } else if (jdn >= next) {
    jy += 1;
    start = next;
    next = j2d(jy + 1, 1, 1);
  }
  const dayOfYear = jdn - start + 1; // 1-based
  const leap = isLeapJalali(jy);
  if (dayOfYear <= 186) {
    return { jy, jm: div(dayOfYear - 1, 31) + 1, jd: mod(dayOfYear - 1, 31) + 1 };
  }
  const rest = dayOfYear - 186;
  const lastMonthDays = leap ? 30 : 29;
  if (rest <= 11 * 30) {
    return { jy, jm: div(rest - 1, 30) + 7, jd: mod(rest - 1, 30) + 1 };
  }
  const inLast = rest - 330;
  if (inLast <= lastMonthDays) {
    return { jy, jm: 12, jd: inLast };
  }
  // defensive fallback (should never happen)
  return { jy, jm: 12, jd: lastMonthDays };
}

/** Gregorian (y,m,d) -> Jalali (jy,jm,jd). Input months are 1-based. */
export function toJalali(
  gy: number,
  gm: number,
  gd: number,
): { jy: number; jm: number; jd: number } {
  return d2j(g2d(gy, gm, gd));
}

/** Jalali (jy,jm,jd) -> Gregorian Date (local noon, avoids TZ off-by-one). */
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = d2g(j2d(jy, jm, jd));
  return new Date(gy, gm - 1, gd, 12, 0, 0, 0);
}

/* ---------- the functions the app actually uses ---------- */

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
}

/** Convert a JS Date (or epoch ms) to a Jalali calendar date object. */
export function toJalaliDate(input: number | Date): JalaliDate {
  const d = typeof input === "number" ? new Date(input) : input;
  const { jy, jm, jd } = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { year: jy, month: jm, day: jd, monthName: MONTHS[jm - 1] };
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const fa = (s: string | number) => String(s).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Format an epoch ms as "۱۴۰۵/۰۶/۱۷" (Jalali, Persian digits). */
export function formatJalali(ms: number, withTime = false): string {
  const { year, month, day } = toJalaliDate(ms);
  const base = `${fa(year)}/${fa(pad2(month))}/${fa(pad2(day))}`;
  if (!withTime) return base;
  const d = new Date(ms);
  return `${base} ${fa(pad2(d.getHours()))}:${fa(pad2(d.getMinutes()))}`;
}

/** Format as "۱۷ شهریور ۱۴۰۵". */
export function formatJalaliLong(ms: number): string {
  const { year, month, day, monthName } = toJalaliDate(ms);
  return `${fa(day)} ${monthName} ${fa(year)}`;
}

/** Current Jalali year (e.g. 1405). Used for document numbering. */
export function currentJalaliYear(): number {
  return toJalaliDate(Date.now()).year;
}

/** Build a Jalali year-month key like "۱۴۰۵/۰۶". */
export function jalaliMonthKey(ms: number): string {
  const { year, month } = toJalaliDate(ms);
  return `${fa(year)}/${fa(pad2(month))}`;
}

/** Current Jalali month (1-12). */
export function currentJalaliMonth(): number {
  return toJalaliDate(Date.now()).month;
}

/* ---------- reporting period helpers ---------- */

/** Epoch ms of the start (00:00 local) of the day a timestamp falls in. */
export function startOfJalaliDay(ms: number = Date.now()): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Epoch ms of the first day (00:00) of the Jalali month containing `ms`. */
export function startOfJalaliMonth(ms: number = Date.now()): number {
  const { year, month } = toJalaliDate(ms);
  return jalaliToGregorian(year, month, 1).getTime();
}

/** Epoch ms of 1 Farvardin (00:00) of the Jalali year containing `ms`. */
export function startOfJalaliYear(ms: number = Date.now()): number {
  const { year } = toJalaliDate(ms);
  return jalaliToGregorian(year, 1, 1).getTime();
}