// RptItemHistoryRpt.ts
// The printed Item History report (port of rptItemHistoryRpt): A4 portrait, company name,
// heading, branch, then per item a header block (item, supplier, last sale /
// purchase, stock ...), the transactions (Date, Type, Document No., Account ID,
// Qty. In, Qty. Out, Unit Cost, Unit Price) and a "Total :" row.
// The stock look (common/reportStyle.ts, STOCK_REPORT_CSS): the same design as the stock documents - "Page x of y" on a line of its
// own under the heading, the 11 px text, the light thin lines, "Printed : ..." at the bottom right (9 px). The company, the heading
// and the branch repeat at the top of every page.
// buildHtml is used by the print preview; printItemHistoryReport sends the
// report to the printer (browser print dialog, hidden iframe - no pop-up).
// The formatters are shared with the PDF file.
import { branchLineHtml, esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

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
// a value: in bold, as the values of the stock documents
const vcell = (v: string) => `<div><b>${esc(v)}</b></div>`;
// the value of the right-hand pair: bold and right aligned, so it ends at the right edge of the Unit Price column
const rcell = (v: string) => `<div class="rv"><b>${esc(v)}</b></div>`;
const colon = `<div class="c">:</div>`;

const headerBlock = (g: HistoryGroup) => `
<div class="hdr">
  <div class="g" style="grid-template-columns:${COLS_ITEM}">
    ${cell("Item")}${colon}${vcell(g.itemId)}${cell(g.itemName)}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Supplier")}${colon}${vcell(g.supplier)}
    ${cell("Last Sale Date")}${colon}${rcell(dmy(g.lastSaleDate, true))}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Date")}${colon}${vcell(dmy(g.lastPurDate, true))}
    ${cell("Last Sale Unit Price")}${colon}${rcell(fixed(g.lastSaleUnitPrice, 2))}
  </div>
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Unit Price")}${colon}${vcell(fixed(g.lastPurUnitPrice, 4))}
    ${cell("Current Stock")}${colon}${rcell(whole(g.stock))}
  </div>
  
  <div class="g" style="grid-template-columns:${COLS_PAIR}">
    ${cell("Last Purchase Unit Cost")}${colon}${vcell(fixed(g.lastPurUnitCost, 4))}
    <div></div><div></div><div></div>
  </div>
</div>`;

const groupHtml = (g: HistoryGroup) => {
  // VB group footer: Sum of Qty. In / Qty. Out (rounded to avoid 0.30000000000000004)
  const sum = (pick: (r: HistoryRow) => number | null) =>
    Number(g.rows.reduce((t, r) => t + (pick(r) ?? 0), 0).toFixed(4));

  return `
<tr class="hd"><td colspan="8">${headerBlock(g)}</td></tr>
<tr class="labels">
  <th>Date</th><th>Type</th><th>Document No.</th><th>Account ID</th>
  <th class="r">Qty. In</th><th class="r">Qty. Out</th>
  <th class="r">Unit Cost</th><th class="r">Unit Price</th>
</tr>
${g.rows
  .map(
    (r, index) => `<tr${index === 0 ? ' class="first"' : ""}>
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
  <td colspan="4" class="r"><b>Total :</b></td>
  <td class="r"><b>${esc(raw(sum((r) => r.qtyIn)))}</b></td>
  <td class="r"><b>${esc(raw(sum((r) => r.qtyOut)))}</b></td>
  <td></td><td></td>
</tr>`;
};

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${reportPrintCss({ reportInfo: r.reportInfo, look: "inter", stockLook: true, orientation: "portrait", marginLeft: "12mm", groupSelector: "td.group",
  extra: `
  th.r { text-align: right; }
  .hdr { margin-bottom: 6px; font-size: 11px; }
  .hdr .g { display: grid; min-height: 20px; align-items: center; }
  .hdr .g > div { padding: 1px 4px; }
  .hdr .c { text-align: center; padding: 1px 0; }
  .hdr .rv { text-align: right; }
  tr.hd td { padding: 0; border: 0; }
  tr.labels th { border-top: 1px solid #e2e8f2; }` })}
</style>
</head>
<body>
<table>
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
    <tr><td colspan="8" class="pagerow" style="border:0"></td></tr>
    <tr><td colspan="8" class="sub"  style="border:0">${branchLineHtml(r.branch)}</td></tr>
  </thead>
  <tbody>
    ${r.groups.map(groupHtml).join("\n")}
  </tbody>
</table>
</body>
</html>`;

export const printItemHistoryReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report)); // waits for the Inter font before the print dialog opens
