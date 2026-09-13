/**
 * Export helpers — no external dependencies.
 *
 * - `downloadCsv`: UTF-8 BOM CSV (opens correctly in Excel, Persian-safe).
 *   Semicolon delimiter matches the common Iranian Excel locale.
 * - `printHtml`: opens a print window with an RTL table (Save as PDF).
 *   No fixed paper size: the page flows naturally so the user's printer
 *   driver decides the paper and the report spans as many pages as needed.
 */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Excel-compatible CSV download (UTF-8 BOM so Persian renders correctly). */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): void {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(";"),
    ...rows.map((r) => r.map(esc).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, filename);
}

const NUMERIC_RE = /^[\d۰-۹٬٫\s\-()]+$/;

const cell = (value: string | number, isNum: boolean) =>
  `<td${isNum ? ' class="num"' : ""}>${String(value ?? "")}</td>`;

export interface PrintSection {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

/**
 * Open ONE print window containing several report sections — the complete
 * export in a single paginated document (Save as PDF saves everything at
 * once). No fixed paper size: content reflows and spans as many pages as
 * needed; sections start on a fresh page.
 */
export function printSectionsHtml(mainTitle: string, subtitle: string, sections: PrintSection[]): void {
  const w = window.open("", "_blank", "width=980,height=760");
  if (!w) {
    alert("لطفاً اجازه پنجره‌های بازشونده (Pop-up) را بدهید.");
    return;
  }
  const sectionHtml = sections
    .map((s, idx) => {
      const head = s.columns.map((c) => `<th>${c}</th>`).join("");
      const body = s.rows
        .map((r) => `<tr>${r.map((v) => cell(v, NUMERIC_RE.test(String(v)))).join("")}</tr>`)
        .join("");
      return `
<section class="section${idx > 0 ? " break" : ""}">
  <h2>${s.title}</h2>
  ${s.subtitle ? `<div class="sub">${s.subtitle}</div>` : ""}
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</section>`;
    })
    .join("");
  w.document.write(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${mainTitle}</title>
<style>
  /* No fixed paper size — printer/paper choice in the print dialog decides;
     the layout reflows to any width and paginates freely across pages. */
  @page { margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Vazirmatn, Tahoma, "Segoe UI", sans-serif; color: #111; margin: 0; padding: 20px 24px; }
  h1 { font-size: 19px; margin: 0 0 4px; font-weight: 800; }
  h2 { font-size: 15px; margin: 0 0 10px; font-weight: 800; }
  .sub { font-size: 12px; color: #555; margin-bottom: 16px; line-height: 1.8; }
  .section { margin-bottom: 28px; }
  .section.break { page-break-before: always; break-before: page; }
  thead { display: table-header-group; }
  tr, td, th { page-break-inside: avoid; break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: right; vertical-align: top; }
  th { background: #f1f1f1; font-weight: 800; }
  td.num { text-align: left; direction: ltr; }
  .footer { margin-top: 18px; font-size: 10px; color: #666; text-align: center; line-height: 1.8; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>${mainTitle}</h1>
<div class="sub">${subtitle}</div>
${sectionHtml}
<div class="footer">این گزارش از سامانه مدیریت مجتمع تجاری اداری شهریار استخراج شده است.</div>
<script>
  window.onload = function () { setTimeout(function () { window.print(); }, 400); };
<\\/script>
</body>
</html>`);
  w.document.close();
}

/** Open a print window with a formatted RTL table (browser → Save as PDF). */
export function printHtml(
  title: string,
  subtitle: string,
  columns: string[],
  rows: Array<Array<string | number>>,
  footer = "این گزارش از سامانه مدیریت مجتمع تجاری اداری شهریار استخراج شده است.",
): void {
  const w = window.open("", "_blank", "width=920,height=720");
  if (!w) {
    alert("لطفاً اجازه پنجره‌های بازشونده (Pop-up) را بدهید.");
    return;
  }
  const body = rows
    .map((r) => `<tr>${r.map((v, i) => cell(v, NUMERIC_RE.test(String(v)))).join("")}</tr>`)
    .join("");
  const head = columns.map((c) => `<th>${c}</th>`).join("");
  w.document.write(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  /* No fixed paper size — the printer/paper choice in the print dialog decides;
     the layout reflows to any width and paginates freely across pages. */
  @page { margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Vazirmatn, Tahoma, "Segoe UI", sans-serif; color: #111; margin: 0; padding: 20px 24px; }
  h1 { font-size: 17px; margin: 0 0 4px; font-weight: 800; }
  .sub { font-size: 12px; color: #555; margin-bottom: 16px; line-height: 1.8; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: right; vertical-align: top; }
  th { background: #f1f1f1; font-weight: 800; }
  td.num { text-align: left; direction: ltr; }
  .total td { background: #f6f6f6; font-weight: 800; }
  .footer { margin-top: 14px; font-size: 10px; color: #666; text-align: center; line-height: 1.8; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="sub">${subtitle}</div>
<table>
<thead><tr>${head}</tr></thead>
<tbody>${body}</tbody>
</table>
<div class="footer">${footer}</div>
<script>
  window.onload = function () { setTimeout(function () { window.print(); }, 300); };
<\/script>
</body>
</html>`);
  w.document.close();
}