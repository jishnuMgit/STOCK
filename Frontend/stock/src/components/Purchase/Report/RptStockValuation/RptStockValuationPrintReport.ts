// RptStockValuationPrintReport.ts
// The printed Stock Valuation report (the old rptStockValuerpt).
//
//   A4 portrait: Item ID / Item Name / Item Group / Unit / Stock / Unit Cost / Stock Value, sorted by
//   item group, then item. With more than one branch the report has one section per branch:
//       Branch : Jeddah        <- the branch
//       ... its items ...
//       Total :                <- the Stock and the Stock Value of the branch
//       Branch : Meccah        <- the next branch ... and so on
//   A Grand Total row (the Stock and the Stock Value) closes the report.
//   Plain: no fill on the heading row or the Total rows, thin light lines.
//   "Page x of y" is top right of every page; the company, the heading, the branch and the report
//   info repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../../common/printHtml";

// ---- what the server sends (names = the server's response keys) ----

export type StockValuationLine = {
  lkpBranch: string;
  lkpItemID: string;
  txtItemName: string;
  lkpItemGroupID: string;
  txtItemGroupName: string;
  txtUnit: string;
  txtStock: number;
  txtUnitCost: number;
  txtStockValue: number;
};

export type StockValuationBranch = {
  lkpBranch: string;
  txtBranchName: string;
  lines: StockValuationLine[];
  totals: { txtStock: number; txtStockValue: number };
};

export type PrintReport = {
  txtCoName: string;
  txtHeading: string;
  txtBranch: string;
  txtReportInfo: string;
  branches: StockValuationBranch[];
  totals: { txtStock: number; txtStockValue: number };
};

// the Stock: a whole number shows without decimals (the old #,#0), a fraction up to 3
export const formatStock = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

// the Unit Cost and the Stock Value show 4 decimals (the old #,#0.0000 and n4)
export const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

// the colour of the lines
export const LINE_COLOR = "#c7d1e4";

// the branch sections (with their Total) only when the report holds more than one branch
export const hasBranchSections = (r: PrintReport) => r.branches.length > 1;

// the column weights: Item ID | Item Name | Item Group | Unit | Stock | Unit Cost | Stock Value
// (a wide Stock Value, so a value like 2,468,986,421.0000 stays on one line)
export const COLUMN_WEIGHTS = [0.15, 0.27, 0.15, 0.06, 0.09, 0.1, 0.18];

const branchHtml = (b: StockValuationBranch, sections: boolean) => `${
  sections
    ? `<tr><td colspan="7" class="branch">Branch&nbsp; : &nbsp;<b>${esc(b.txtBranchName)}</b></td></tr>`
    : ""
}
    ${b.lines
      .map(
        (l, index) => `<tr${sections && index === 0 ? ' class="first"' : ""}>
      <td>${esc(l.lkpItemID)}</td>
      <td>${esc(l.txtItemName)}</td>
      <td>${esc(l.txtItemGroupName)}</td>
      <td>${esc(l.txtUnit)}</td>
      <td class="r">${formatStock(l.txtStock)}</td>
      <td class="r">${formatAmount(l.txtUnitCost)}</td>
      <td class="r">${formatAmount(l.txtStockValue)}</td>
    </tr>`
      )
      .join("\n    ")}${
  sections
    ? `
    <tr class="tot">
      <td colspan="4" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatStock(b.totals.txtStock)}</b></td>
      <td></td>
      <td class="r"><b>${formatAmount(b.totals.txtStockValue)}</b></td>
    </tr>`
    : ""
}`;

export const buildHtml = (r: PrintReport) => {
  const t = r.totals;
  const sections = hasBranchSections(r);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Stock Valuation</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12.7mm 10mm 12.7mm 15mm;
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
  td { border: 1px solid ${LINE_COLOR}; border-top: 0; height: 25px; padding: 0 4px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  td.branch { border: 0; height: 30px; padding-top: 8px; font-size: 10.5pt; }
  tr.tot td, tr.first td { border-top: 1px solid ${LINE_COLOR}; }
</style>
</head>
<body>
<table>
  <colgroup>
    ${COLUMN_WEIGHTS.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="7" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="7" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="7" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr>
      <th>Item ID</th><th>Item Name</th><th>Item Group</th><th>Unit</th>
      <th class="r">Stock</th><th class="r">Unit Cost</th><th class="r">Stock Value</th>
    </tr>
  </thead>
  <tbody>
    ${r.branches.map((b) => branchHtml(b, sections)).join("\n    ")}
    <tr class="tot">
      <td colspan="4" class="r"><b>Grand Total :</b></td>
      <td class="r"><b>${formatStock(t.txtStock)}</b></td>
      <td></td>
      <td class="r"><b>${formatAmount(t.txtStockValue)}</b></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

export const printStockValuationReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
