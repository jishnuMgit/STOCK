// RptItemMovementPrintReport.ts
// The printed Item Movement report (the old rptItemMovementrpt and rptItemNonMovingrpt), A4 portrait.
//
//   Fast / Slow Moving  Item ID / Item Name / Item Group Name / Moved Qty. / Moved Value / Stock, and a Total row
//   Non Moving          Item ID / Item Name / Item Group / Stock (no total)
//   Moved Qty. and Stock show whole numbers (the old #,#0), Moved Value 2 decimals (the old n2).
//   Plain: no fill on the heading row, thin light lines.
//   "Page x of y" is top right of every page; the company, the heading, the branch and the report
//   info repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

// ---- what the server sends (names = the server's response keys) ----

export type ItemMovementLine = {
  lkpItemID: string;
  txtItemName: string;
  txtItemGroupName: string;
  txtMovedQty: number;
  txtMovedValue: number;
  txtStock: number;
};

export type PrintReport = {
  txtCoName: string;
  txtHeading: string;
  txtBranch: string;
  txtReportInfo: string;
  // 0 Fast Moving, 1 Slow Moving, 2 Non Moving
  rdgItemMovement: 0 | 1 | 2;
  lines: ItemMovementLine[];
  totals: { txtMovedQty: number; txtMovedValue: number; txtStock: number };
};

// the quantities: whole numbers with the thousands separator (the old #,#0)
export const formatQty = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

// the Moved Value: 2 decimals (the old n2)
export const formatValue = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const isNonMoving = (r: PrintReport) => r.rdgItemMovement === 2;

// the column weights, as the old reports
//   Fast / Slow: Item ID | Item Name | Item Group Name | Moved Qty. | Moved Value | Stock
//   Non Moving : Item ID | Item Name | Item Group | Stock
export const MOVING_COLUMN_WEIGHTS = [0.19, 0.3, 0.17, 0.115, 0.13, 0.095];
export const NON_MOVING_COLUMN_WEIGHTS = [0.225, 0.42, 0.23, 0.125];

export const columnWeights = (r: PrintReport) =>
  isNonMoving(r) ? NON_MOVING_COLUMN_WEIGHTS : MOVING_COLUMN_WEIGHTS;

// the first column that is a number
export const FIRST_NUMBER_COLUMN = 3;

const movingLineHtml = (l: ItemMovementLine) => `<tr>
      <td>${esc(l.lkpItemID)}</td>
      <td>${esc(l.txtItemName)}</td>
      <td>${esc(l.txtItemGroupName)}</td>
      <td class="r">${formatQty(l.txtMovedQty)}</td>
      <td class="r">${formatValue(l.txtMovedValue)}</td>
      <td class="r">${formatQty(l.txtStock)}</td>
    </tr>`;

const nonMovingLineHtml = (l: ItemMovementLine) => `<tr>
      <td>${esc(l.lkpItemID)}</td>
      <td>${esc(l.txtItemName)}</td>
      <td>${esc(l.txtItemGroupName)}</td>
      <td class="r">${formatQty(l.txtStock)}</td>
    </tr>`;

export const buildHtml = (r: PrintReport) => {
  const nonMoving = isNonMoving(r);
  const weights = columnWeights(r);
  const t = r.totals;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Item Movement</title>
<style>${reportPrintCss({ orientation: "portrait", marginLeft: "15mm", groupSelector: "td.group" })}
</style>
</head>
<body>
<table>
  <colgroup>
    ${weights.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="${weights.length}" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="${weights.length}" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="${weights.length}" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr>${
      nonMoving
        ? `<th>Item ID</th><th>Item Name</th><th>Item Group</th><th class="r">Stock</th>`
        : `<th>Item ID</th><th>Item Name</th><th>Item Group Name</th><th class="r">Moved Qty.</th><th class="r">Moved Value</th><th class="r">Stock</th>`
    }</tr>
  </thead>
  <tbody>
    ${r.lines.map(nonMoving ? nonMovingLineHtml : movingLineHtml).join("\n    ")}${
      nonMoving
        ? ""
        : `
    <tr class="tot">
      <td colspan="3" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatQty(t.txtMovedQty)}</b></td>
      <td class="r"><b>${formatValue(t.txtMovedValue)}</b></td>
      <td class="r"><b>${formatQty(t.txtStock)}</b></td>
    </tr>`
    }
  </tbody>
</table>
</body>
</html>`;
};

export const printItemMovementReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
