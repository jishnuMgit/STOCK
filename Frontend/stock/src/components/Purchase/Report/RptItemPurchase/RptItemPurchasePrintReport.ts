// RptItemPurchasePrintReport.ts
// The printed Item Purchase report (the old rptItemPurchaseRpt) - every purchase of an item, line by line.
//
//   A4 portrait, a block per item:
//       Item : 0001   o1item1                  <- the item
//       Date / Type / Document No. / P.I. No. / Qty. / Unit Price / Supplier, one line per purchase (PI) or return (PR)
//       Total :                                <- the Qty of the item (a return is minus)
//   Plain: no fill on the heading rows or the Total rows, thin light lines.
//   "Page x of y" is top right of every page; the company, the heading, the branch and the report info
//   repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../../common/printHtml";

// ---- what the server sends (names = the server's response keys) ----

export type ItemPurchaseLine = {
  txtDate: string;
  txtDocType: string;
  txtDocNo: string;
  txtPINo: string;
  txtQty: number;
  txtUnitPrice: number;
  txtSupplierName: string;
};

export type ItemPurchaseItem = {
  lkpItemID: string;
  txtItemName: string;
  lines: ItemPurchaseLine[];
  totals: { txtQty: number };
};

export type PrintReport = {
  txtCoName: string;
  txtHeading: string;
  txtBranch: string;
  txtReportInfo: string;
  items: ItemPurchaseItem[];
};

// the number formats of the old report: the Qty #,#0 (whole numbers), the Unit Price n2
const fixed = (value: number, decimals: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const formatQty = (value: number) => fixed(value, 0);
export const formatPrice = (value: number) => fixed(value, 2);

// the colour of the lines
export const LINE_COLOR = "#c7d1e4";

// the column weights, as the old report: Date | Type | Document No. | P.I. No. | Qty. | Unit Price | Supplier
export const COLUMN_WEIGHTS = [0.117, 0.063, 0.138, 0.152, 0.09, 0.126, 0.314];

export const COLUMN_COUNT = COLUMN_WEIGHTS.length;

// the first numeric column (Qty.)
export const FIRST_NUMBER_COLUMN = 4;

const itemHtml = (item: ItemPurchaseItem) => `<tr><td colspan="7" class="group">Item&nbsp; : &nbsp;<b>${esc(item.lkpItemID)}</b>&nbsp;&nbsp;${esc(item.txtItemName)}</td></tr>
    ${item.lines
      .map(
        (l, index) => `<tr${index === 0 ? ' class="first"' : ""}>
      <td>${esc(l.txtDate)}</td>
      <td>${esc(l.txtDocType)}</td>
      <td>${esc(l.txtDocNo)}</td>
      <td>${esc(l.txtPINo)}</td>
      <td class="r">${formatQty(l.txtQty)}</td>
      <td class="r">${formatPrice(l.txtUnitPrice)}</td>
      <td>${esc(l.txtSupplierName)}</td>
    </tr>`
      )
      .join("\n    ")}
    <tr class="tot">
      <td colspan="4" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatQty(item.totals.txtQty)}</b></td>
      <td></td>
      <td></td>
    </tr>`;

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Item Purchase</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12.7mm 10mm 12.7mm 18mm;
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
  td.r { white-space: nowrap; }                      /* a number is never split over two lines */
  td.group { border: 0; height: 30px; padding-top: 8px; font-size: 10.5pt; }
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
      <th>Date</th><th>Type</th><th>Document No.</th><th>P.I. No.</th>
      <th class="r">Qty.</th><th class="r">Unit Price</th><th>Supplier</th>
    </tr>
  </thead>
  <tbody>
    ${r.items.map(itemHtml).join("\n    ")}
  </tbody>
</table>
</body>
</html>`;

export const printItemPurchaseReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
