// printItemHistoryReport.ts
// The printed page (port of rptItemHistoryRpt): A4 portrait, company name,
// heading, branch, then per item a header block (item, supplier, last sale /
// purchase, stock ...), the transactions (Date, Type, Document No., Account ID,
// Qty. In, Qty. Out, Unit Cost, Unit Price) and a "Total :" row.
// buildHtml is used by the print preview; printItemHistoryReport sends the
// report to the printer (browser print dialog, hidden iframe - no pop-up).
// The formatters are shared with the PDF file.

import { cssStr, printHtmlDocument } from "../../../../components/common/printHtml";
import { reportLook, REPORT_STYLE } from "../../../../components/common/reportStyle";

// the font and the sizes of the shared look (components/common/reportStyle.ts): the same in every report
const LOOK = reportLook("inter");

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
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page, "Printed : ..."
  groups: HistoryGroup[];
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ---- VB number / date formats ----
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "YYYY-MM-DD" -> dd-MMM-yyyy / dd-MMM-yy ; empty stays empty
export const dmy = (iso: string | null, longYear: boolean) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return "";
  const year = longYear ? m[1] : m[1].slice(2);
  return `${m[3]}-${MONTHS[Number(m[2]) - 1]}-${year}`;
};

export const fixed = (v: number | null, decimals: number) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

export const whole = (v: number | null) =>
  v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

// {0} (no format): the number as it is
export const raw = (v: number | null) => (v == null ? "" : String(v));

// header block: label | : | value   (VB XrTable1, six rows)
const COLS_ITEM = "25.74% 1.18% 22.06% 51.03%";
const COLS_PAIR = "25.74% 1.18% 44.38% 17.2% 1.0% 10.5%"; // the right-hand pair starts at the Unit Cost column (71.3%) and ends at the right edge of the Unit Price column

const cell = (v: string) => `<div>${esc(v)}</div>`;
// the value of the right-hand pair: right aligned, so it ends at the right edge of the Unit Price column
const rcell = (v: string) => `<div class="rv">${esc(v)}</div>`;
const colon = `<div class="c">:</div>`;

const headerBlock = (g: HistoryGroup) => `
<div class="info">
  <div class="g" style="grid-template-columns:${COLS_ITEM}">
    ${cell("Item")}${colon}${cell(g.itemId)}${cell(g.itemName)}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Supplier")}${colon}${cell(g.supplier)}
    ${cell("Last Sale Date")}${colon}${rcell(dmy(g.lastSaleDate, true))}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Date")}${colon}${cell(dmy(g.lastPurDate, true))}
    ${cell("Last Sale Unit Price")}${colon}${rcell(fixed(g.lastSaleUnitPrice, 2))}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Unit Price")}${colon}${cell(fixed(g.lastPurUnitPrice, 4))}
    ${cell("Current Stock")}${colon}${rcell(whole(g.stock))}
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

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${LOOK.css.importCss}
  @page {
    size: A4;
    margin: 12mm 10mm 14mm 12mm;
    @top-right    { content: "Page " counter(page) " / " counter(pages); font: ${LOOK.size.small}pt ${LOOK.css.family}; }
    @bottom-right { content: "Printed : ${cssStr(r.reportInfo)}"; font: ${LOOK.size.small}pt ${LOOK.css.family}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${LOOK.size.body}pt ${LOOK.css.family}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* company / heading repeat on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${LOOK.size.company}pt; text-align: center; height: ${REPORT_STYLE.html.companyHeight}px; vertical-align: top; }
  .head { font-size: ${LOOK.size.heading}pt; text-align: center; height: ${REPORT_STYLE.html.headingHeight}px; }
  .br   { font-size: ${LOOK.size.body}pt;  text-align: left;   height: ${REPORT_STYLE.html.subHeight + REPORT_STYLE.html.tableGap}px; vertical-align: top; }
  th { border: 1px solid ${REPORT_STYLE.lineColor}; height: ${REPORT_STYLE.html.rowHeight}px;
       padding: 0 ${REPORT_STYLE.html.cellPaddingX}px; font-size: ${LOOK.size.columnHead ?? LOOK.size.body}pt; font-weight: normal; text-align: left; }
  td { border: 1px solid ${REPORT_STYLE.lineColor}; border-top: 0; height: ${REPORT_STYLE.html.rowHeight}px; padding: 0 ${REPORT_STYLE.html.cellPaddingX}px; }
  .r { text-align: right; }
  .tot td { border-top: 1px solid ${REPORT_STYLE.lineColor}; font-weight: bold; }
  .info { margin-bottom: 6px; }
  .info .g { display: grid; min-height: 20px; align-items: center; }
  .info .g > div { padding: 1px 4px; }
  .info .c { text-align: center; padding: 1px 0; }
  .info .rv { text-align: right; }
</style>
</head>
<body>
<table class="main">
  <colgroup>
    <col style="width:11.6%" />  <!-- Date -->
    <col style="width:9.9%" />   <!-- Type -->
    <col style="width:17%" />    <!-- Document No. (its 14 px label fits) -->
    <col style="width:12.5%" />  <!-- Account ID -->
    <col style="width:10.4%" />  <!-- Qty. In -->
    <col style="width:9.9%" />   <!-- Qty. Out -->
    <col style="width:13.2%" />  <!-- Unit Cost -->
    <col style="width:15.5%" />  <!-- Unit Price -->
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

export const printItemHistoryReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report)); // waits for the Inter font before the print dialog opens
