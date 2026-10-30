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
import { reportPrintCss } from "../../../common/reportStyle";

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
<style>${reportPrintCss({ orientation: "landscape", marginLeft: "12mm", groupSelector: "td.group" })}
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
