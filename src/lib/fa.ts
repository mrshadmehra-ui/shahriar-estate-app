const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert latin digits to Persian digits. */
export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Format a raw number with Persian thousand separators and digits. */
export function faNumber(n: number): string {
  return toFa(n.toLocaleString("en-US"));
}

/** Format a price in تومان with Persian digits: ۲,۸۵۰,۰۰۰,۰۰۰ تومان */
export function faPrice(n: number): string {
  return `${faNumber(n)} تومان`;
}

export const PHONE_DISPLAY = "۰۹۱۲ ۰۸۵ ۸۰۹۵";
export const PHONE_TEL = "tel:09120858095";
export const OFFICE_ADDRESS = "شهریار، روبروی شهرک اداری، مجتمع اداری تجاری شهریار";
export const WORKING_HOURS = "شنبه تا پنجشنبه: ۹ تا ۲۱ — جمعه: ۱۶ تا ۲۱";