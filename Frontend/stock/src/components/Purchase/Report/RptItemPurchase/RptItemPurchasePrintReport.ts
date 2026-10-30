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
import { reportPrintCss } from "../../../common/reportStyle";

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
<style>${reportPrintCss({ orientation: "portrait", marginLeft: "18mm", groupSelector: "td.group" })}
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
