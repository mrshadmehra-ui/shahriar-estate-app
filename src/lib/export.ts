/**
 * Export helpers — no external dependencies.
 *
 * - `downloadCsv`: UTF-8 BOM CSV (opens correctly in Excel, Persian-safe).
 *   Semicolon delimiter matches the common Iranian Excel locale.
 * - `printHtml`: opens a print window with an RTL A4 table (Save as PDF).
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
  const cell = (value: string | number, isNum: boolean) =>
    `<td${isNum ? ' class="num"' : ""}>${String(value ?? "")}</td>`;
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
  @page { size: A4; margin: 14mm; }
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