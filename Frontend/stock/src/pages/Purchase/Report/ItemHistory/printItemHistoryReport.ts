// printItemHistoryReport.ts
// The printed page (port of rptItemHistoryRpt): A4 portrait, company name,
// heading, branch, then per item a header block (item, supplier, last sale /
// purchase, stock ...), the transactions (Date, Type, Document No., Account ID,
// Qty. In, Qty. Out, Unit Cost, Unit Price) and a "Total :" row.
// Opens the browser print dialog from a hidden iframe (no pop-up to block).

export type HistoryRow = {
  date: string | null; // YYYY-MM-DD
  docType: string;
  docNo: string;
  accountId: string;
  qtyIn: number | null;
  qtyOut: number | null;
  unitCost: number | null;
  unitPrice: number | null;
};

export type HistoryGroup = {
  itemId: string;
  itemName: string;
  supplier: string;
  lastSaleDate: string | null;
  lastPurDate: string | null;
  lastSaleUnitPrice: number | null;
  lastPurUnitPriceFC: number | null;
  lastPurUnitPrice: number | null;
  lastPurUnitCost: number | null;
  stock: number | null;
  rows: HistoryRow[];
};

export type PrintReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  groups: HistoryGroup[];
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// text placed inside a CSS string ("...") in the print stylesheet
const cssStr = (v: unknown) =>
  String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\3C ")
    .replace(/[\r\n]+/g, " ");

// ---- VB number / date formats ----
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "YYYY-MM-DD" -> dd-MMM-yyyy / dd-MMM-yy ; empty stays empty
const dmy = (iso: string | null, longYear: boolean) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return "";
  const year = longYear ? m[1] : m[1].slice(2);
  return `${m[3]}-${MONTHS[Number(m[2]) - 1]}-${year}`;
};

const fixed = (v: number | null, decimals: number) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

const whole = (v: number | null) =>
  v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

// {0} (no format): the number as it is
const raw = (v: number | null) => (v == null ? "" : String(v));

// header block: label | : | value   (VB XrTable1, six rows)
const COLS_ITEM = "25.74% 1.18% 22.06% 51.03%";
const COLS_PAIR = "25.74% 1.18% 35.59% 18.38% 1.18% 17.94%";

const cell = (v: string) => `<div>${esc(v)}</div>`;
const colon = `<div class="c">:</div>`;

const headerBlock = (g: HistoryGroup) => `
<div class="info">
  <div class="g" style="grid-template-columns:${COLS_ITEM}">
    ${cell("Item")}${colon}${cell(g.itemId)}${cell(g.itemName)}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Supplier")}${colon}${cell(g.supplier)}
    ${cell("Last Sale Date")}${colon}${cell(dmy(g.lastSaleDate, true))}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Date")}${colon}${cell(dmy(g.lastPurDate, true))}
    ${cell("Last Sale Unit Price")}${colon}${cell(fixed(g.lastSaleUnitPrice, 2))}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Unit Price (FC)")}${colon}${cell(fixed(g.lastPurUnitPriceFC, 4))}
    ${cell("Current Stock")}${colon}${cell(whole(g.stock))}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Unit Price")}${colon}${cell(fixed(g.lastPurUnitPrice, 2))}
    <div></div><div></div><div></div>
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Unit Cost")}${colon}${cell(fixed(g.lastPurUnitCost, 4))}
    <div></div><div></div><div></div>
  </div>
</div>`;

const groupHtml = (g: HistoryGroup) => {
  // VB group footer: Sum of Qty. In / Qty. Out (rounded to avoid 0.30000000000000004)
  const sum = (pick: (r: HistoryRow) => number | null) =>
    Number(g.rows.reduce((t, r) => t + (pick(r) ?? 0), 0).toFixed(4));

  return `
<tr class="hd"><td colspan="8" style="padding:0;border:0">${headerBlock(g)}</td></tr>
<tr class="lbl">
  <th>Date</th><th>Type</th><th>Document No.</th><th>Account ID</th>
  <th class="r">Qty. In</th><th class="r">Qty. Out</th>
  <th class="r">Unit Cost</th><th class="r">Unit Price</th>
</tr>
${g.rows
  .map(
    (r) => `<tr>
  <td>${esc(dmy(r.date, false))}</td>
  <td>${esc(r.docType)}</td>
  <td>${esc(r.docNo)}</td>
  <td>${esc(r.accountId)}</td>
  <td class="r">${esc(whole(r.qtyIn))}</td>
  <td class="r">${esc(raw(r.qtyOut))}</td>
  <td class="r">${esc(fixed(r.unitCost, 2))}</td>
  <td class="r">${esc(fixed(r.unitPrice, 2))}</td>
</tr>`,
  )
  .join("\n")}
<tr class="tot">
  <td colspan="4" class="r">Total :</td>
  <td class="r">${esc(raw(sum((r) => r.qtyIn)))}</td>
  <td class="r">${esc(raw(sum((r) => r.qtyOut)))}</td>
  <td></td><td></td>
</tr>`;
};

const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>
  @page {
    size: A4;
    margin: 12mm 10mm 14mm 12mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.reportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* company / heading repeat on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 22px; }
  .br   { font-size: 9pt;  text-align: left;   height: 20px; }
  th { background: #eff3fa; border: 1px solid #c7d1e4; height: 24px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  td { border: 1px solid #c7d1e4; border-top: 0; height: 24px; padding: 0 4px; }
  .r { text-align: right; }
  .tot td { border-top: 1px solid #c7d1e4; font-weight: bold; }
  .info { margin-bottom: 6px; }
  .info .g { display: grid; min-height: 20px; align-items: center; }
  .info .g > div { padding: 1px 4px; }
  .info .c { text-align: center; padding: 1px 0; }
</style>
</head>
<body>
<table class="main">
  <colgroup>
    <col style="width:11.6%" />  <!-- Date -->
    <col style="width:9.9%" />   <!-- Type -->
    <col style="width:13.4%" />  <!-- Document No. -->
    <col style="width:14.1%" />  <!-- Account ID -->
    <col style="width:10.4%" />  <!-- Qty. In -->
    <col style="width:9.9%" />   <!-- Qty. Out -->
    <col style="width:14.7%" />  <!-- Unit Cost -->
    <col style="width:16%" />    <!-- Unit Price -->
  </colgroup>
  <thead>
    <tr><td colspan="8" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="8" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="8" class="br"   style="border:0">${esc(r.branch)}</td></tr>
  </thead>
  <tbody>
    ${r.groups.map(groupHtml).join("\n")}
  </tbody>
</table>
</body>
</html>`;

export const printItemHistoryReport = (report: PrintReport): void => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("Could not open the print view");
  }

  doc.open();
  doc.write(buildHtml(report));
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup);

  // let the iframe lay out before printing
  setTimeout(() => {
    win.focus();
    win.print();
    // some browsers never fire afterprint: remove it anyway after a minute
    setTimeout(() => iframe.remove(), 60000);
  }, 250);
};
