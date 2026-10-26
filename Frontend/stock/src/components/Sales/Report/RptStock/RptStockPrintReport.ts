// RptStockPrintReport.ts
// The printed Stock report (the old rptStockDetRpt and rptStockSumRpt).
//
//   Detailed - A4 portrait, by item: "Item : id name", then Date / Type / Document No. /
//              Txn.# / Unit Cost / Qty. In / Qty. Out / Balance (a running balance that starts
//              again for each item; the first row of an item is its opening stock, type OP),
//              and a Total row for the item (the In and Out and the final balance).
//   Summary  - A4 landscape, one row per item: Item ID / Item Name / Unit / Opening / Qty. In /
//              Qty. Out / Closing, and a Total row at the end.
//
// Plain: no fill on the heading row or the Total row, thin light lines (the same as the other prints).
// "Page x of y" is top right of every page; the company, the heading, the branch and the report
// info repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import dayjs from "dayjs";

import { esc, printHtmlDocument } from "../../../common/printHtml";

// ---- what the server sends (names = the server's response keys) ----

export type DetailLine = {
  txtDate: string | null;
  txtDocType: string;
  txtDocNo: string;
  txtTxnNo: string;
  txtUnitCost: number | null;
  txtQtyIn: number;
  txtQtyOut: number;
  txtBalance: number;
};

export type DetailItem = {
  lkpItemID: string;
  txtItemName: string;
  lines: DetailLine[];
  txtTotalIn: number;
  txtTotalOut: number;
  txtTotalBalance: number;
};

export type SummaryLine = {
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
  txtQtyOpening: number;
  txtQtyIn: number;
  txtQtyOut: number;
  txtQtyClosing: number;
};

export type SummaryTotals = {
  txtQtyOpening: number;
  txtQtyIn: number;
  txtQtyOut: number;
  txtQtyClosing: number;
};

export type PrintReport = {
  txtMode: "D" | "S";
  txtCoName: string;
  txtHeading: string;
  txtBranch: string;
  txtReportInfo: string;
  detail: DetailItem[];
  summary: { lines: SummaryLine[]; totals: SummaryTotals };
};

// quantities: a whole number shows without decimals (the old #,#0), a fraction up to 3
export const formatQty = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

// Unit Cost with 4 decimals (the old #,#0.0000); blank for the opening row
export const formatCost = (value: number | null) =>
  value === null
    ? ""
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });

// dd-MMM-yy (the old Date column)
export const formatDate = (value: string | null) =>
  value ? dayjs(value).format("DD-MMM-YY") : "";

// the colour of the lines of the two reports
export const COLORS = {
  D: { line: "#c7d1e4" },
  S: { line: "#c7d1e4" },
} as const;

/* =========================================================
   DETAILED
========================================================= */

const detailItemHtml = (item: DetailItem) => `<tr><td colspan="8" class="item">Item&nbsp; : &nbsp;<b>${esc(item.lkpItemID)}</b>&nbsp;&nbsp;${esc(item.txtItemName)}</td></tr>
    ${item.lines
      .map(
        (l) => `<tr>
      <td>${esc(formatDate(l.txtDate))}</td>
      <td>${esc(l.txtDocType)}</td>
      <td>${esc(l.txtDocNo)}</td>
      <td>${esc(l.txtTxnNo)}</td>
      <td class="r">${formatCost(l.txtUnitCost)}</td>
      <td class="r">${formatQty(l.txtQtyIn)}</td>
      <td class="r">${formatQty(l.txtQtyOut)}</td>
      <td class="r">${formatQty(l.txtBalance)}</td>
    </tr>`
      )
      .join("\n    ")}
    <tr class="tot">
      <td colspan="5" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatQty(item.txtTotalIn)}</b></td>
      <td class="r"><b>${formatQty(item.txtTotalOut)}</b></td>
      <td class="r"><b>${formatQty(item.txtTotalBalance)}</b></td>
    </tr>`;

const detailedHtml = (r: PrintReport) => `<table>
  <colgroup>
    <col style="width:13.6%" /><col style="width:7.2%" /><col style="width:13.3%" />
    <col style="width:10.7%" /><col style="width:12.1%" /><col style="width:14.5%" />
    <col style="width:14.4%" /><col style="width:14.2%" />
  </colgroup>
  <thead>
    <tr><td colspan="8" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="8" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="8" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr>
      <th>Date</th><th>Type</th><th>Document No.</th><th>Txn.#</th>
      <th class="r">Unit Cost</th><th class="r">Qty. In</th><th class="r">Qty. Out</th><th class="r">Balance</th>
    </tr>
  </thead>
  <tbody>
    ${r.detail.map(detailItemHtml).join("\n    ")}
  </tbody>
</table>`;

/* =========================================================
   SUMMARY
========================================================= */

const summaryHtml = (r: PrintReport) => {
  const t = r.summary.totals;

  return `<table>
  <colgroup>
    <col style="width:17.4%" /><col style="width:39.5%" /><col style="width:4.8%" />
    <col style="width:10.5%" /><col style="width:9.3%" /><col style="width:9.3%" />
    <col style="width:9.3%" />
  </colgroup>
  <thead>
    <tr><td colspan="7" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="7" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="7" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr>
      <th>Item ID</th><th>Item Name</th><th>Unit</th>
      <th class="r">Opening</th><th class="r">Qty. In</th><th class="r">Qty. Out</th><th class="r">Closing</th>
    </tr>
  </thead>
  <tbody>
    ${r.summary.lines
      .map(
        (l) => `<tr>
      <td>${esc(l.lkpItemID)}</td>
      <td>${esc(l.txtItemName)}</td>
      <td>${esc(l.txtUnit)}</td>
      <td class="r">${formatQty(l.txtQtyOpening)}</td>
      <td class="r">${formatQty(l.txtQtyIn)}</td>
      <td class="r">${formatQty(l.txtQtyOut)}</td>
      <td class="r">${formatQty(l.txtQtyClosing)}</td>
    </tr>`
      )
      .join("\n    ")}
    <tr class="tot">
      <td colspan="3" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatQty(t.txtQtyOpening)}</b></td>
      <td class="r"><b>${formatQty(t.txtQtyIn)}</b></td>
      <td class="r"><b>${formatQty(t.txtQtyOut)}</b></td>
      <td class="r"><b>${formatQty(t.txtQtyClosing)}</b></td>
    </tr>
  </tbody>
</table>`;
};

/* =========================================================
   THE PAGE
========================================================= */

export const buildHtml = (r: PrintReport) => {
  const detailed = r.txtMode === "D";
  const color = COLORS[r.txtMode];

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Stock</title>
<style>
  @page {
    size: A4 ${detailed ? "portrait" : "landscape"};
    margin: 12.7mm 10mm 12.7mm ${detailed ? "22.9mm" : "25.4mm"};
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
  th { border: 1px solid ${color.line}; height: 25px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid ${color.line}; border-top: 0; height: 25px; padding: 0 4px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  td.item { border: 0; height: 30px; padding-top: 8px; font-size: 10.5pt; }
  tr.tot td { border-top: 1px solid ${color.line}; }
</style>
</head>
<body>
${detailed ? detailedHtml(r) : summaryHtml(r)}
</body>
</html>`;
};

// the report info sits in the heading row of the table (it repeats on every page)
export const printStockReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
