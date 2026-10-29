// RptStockAgeingPrintReport.ts
// The printed Stock Ageing report (the old rptStAgeingRpt) - how old the stock on hand is.
//
//   A4 landscape, a flat list in the order of the Item ID (no group headings, no totals):
//       Item ID / Item Name / Item Group / Unit / Stock / Unit Cost / the five age columns ("0-30 Days" ...)
//   An item is one row: its stock is added up over all the branches asked for (as the old report did).
//   The Stock and the age columns show whole numbers (the old #,#0), the Unit Cost 4 decimals.
//   Plain: no fill on the heading row, thin light lines.
//   "Page x of y" is top right of every page; the company, the heading, the branch and the report
//   info repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../../common/printHtml";

// ---- what the server sends (names = the server's response keys) ----

export type StockAgeingLine = {
  lkpItemID: string;
  txtItemName: string;
  txtItemGroupName: string;
  txtUnit: string;
  txtStock: number;
  txtUnitCost: number;
  txtAge: number[];
};

export type PrintReport = {
  txtCoName: string;
  txtHeading: string;
  txtBranch: string;
  txtReportInfo: string;
  txtAgeLabels: string[];
  lines: StockAgeingLine[];
};

// the Stock and the age columns: whole numbers with the thousands separator (the old #,#0)
export const formatQty = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

// the Unit Cost: 4 decimals (the old #,#0.0000)
export const formatCost = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

// the colour of the lines
export const LINE_COLOR = "#c7d1e4";

// the column weights, as the old report: Item ID | Item Name | Item Group | Unit | Stock | Unit Cost |
// the five age columns
// (a little different from the old report so a number like 12,333,344 and the unit fit on one line)
export const COLUMN_WEIGHTS = [0.12, 0.165, 0.08, 0.05, 0.09, 0.085, 0.082, 0.082, 0.082, 0.082, 0.082];

export const COLUMN_COUNT = COLUMN_WEIGHTS.length;

// the first column that is a number (Stock), and the first age column
export const FIRST_NUMBER_COLUMN = 4;
export const FIRST_AGE_COLUMN = 6;

const lineHtml = (l: StockAgeingLine) => `<tr>
      <td>${esc(l.lkpItemID)}</td>
      <td>${esc(l.txtItemName)}</td>
      <td>${esc(l.txtItemGroupName)}</td>
      <td class="u">${esc(l.txtUnit)}</td>
      <td class="r">${formatQty(l.txtStock)}</td>
      <td class="r">${formatCost(l.txtUnitCost)}</td>
      ${l.txtAge.map((v) => `<td class="r">${formatQty(v)}</td>`).join("")}
    </tr>`;

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Stock Ageing</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12.7mm 10mm 12.7mm 12mm;
    @top-right { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9.75pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* the heading repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 26px; }
  .head { font-size: 12pt; text-align: center; height: 26px; }
  .sub  { height: 24px; }
  .sub div { display: flex; justify-content: space-between; gap: 16px; }
  .sub .info { font-size: 8pt; }
  th { border: 1px solid ${LINE_COLOR}; height: 25px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  th.c { text-align: center; }
  td { border: 1px solid ${LINE_COLOR}; border-top: 0; height: 25px; padding: 0 4px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  td.r, td.u { white-space: nowrap; }                /* a number or a unit is never split over two lines */
</style>
</head>
<body>
<table>
  <colgroup>
    ${COLUMN_WEIGHTS.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="${COLUMN_COUNT}" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="${COLUMN_COUNT}" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="${COLUMN_COUNT}" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr>
      <th>Item ID</th><th>Item Name</th><th>Item Group</th><th>Unit</th>
      <th class="r">Stock</th><th class="r">Unit Cost</th>
      ${r.txtAgeLabels.map((label) => `<th class="c">${esc(label)}</th>`).join("")}
    </tr>
  </thead>
  <tbody>
    ${r.lines.map(lineHtml).join("\n    ")}
  </tbody>
</table>
</body>
</html>`;

export const printStockAgeingReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
