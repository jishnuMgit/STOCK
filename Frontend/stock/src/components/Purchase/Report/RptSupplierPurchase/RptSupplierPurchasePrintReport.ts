// RptSupplierPurchasePrintReport.ts
// The printed Supplier Purchase report - two layouts, chosen by the report the server sends (rdgDetOrSum):
//
//   Summary  (the old rptSupplierPurchaseRpt), A4 portrait:
//       Supplier : 70000   supplier1          <- a block per supplier
//       Date / Type / Document No. / Amount_FC / Amount, one line per document
//       Total :                               <- the Amount_FC and the Amount of the supplier
//
//   Detailed (the old rptPIprint / rptPRprint), A4 landscape: a block per document
//       Branch / Entry No. / Date, Supplier / P. Invoice No. (or P. Entry No.) / Supplier Amt.,
//       Currency / P.O. No. / Currency Rate
//       Sl. # / Item ID / Item Name / Unit / Qty. / U Price (FC) / Tot. Price(FC) / Unit Price / Unit Cost /
//       Total Cost - one line per item, then Total :, Disc. Amt.(FC), Disc. Amt. and the Note
//
//   Plain: no fill on the heading rows or the Total rows, thin light lines. "Page x of y" is top right of every
//   page; the company, the heading and the report info repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../../common/printHtml";

// ---- what the server sends (names = the server's response keys) ----

export type SupplierPurchaseLine = {
  txtDate: string;
  txtDocType: string;
  txtDocNo: string;
  txtAmountFC: number;
  txtAmount: number;
};

export type SupplierPurchaseSupplier = {
  lkpSupplierID: string;
  txtSupplierName: string;
  lines: SupplierPurchaseLine[];
  totals: { txtAmountFC: number; txtAmount: number };
};

export type SupplierPurchaseDetailLine = {
  txtSlNo: number;
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
  txtQty: number;
  txtUnitPriceFC: number;
  txtTotalPriceFC: number;
  txtUnitPrice: number;
  txtUnitCost: number;
  txtTotalCost: number;
};

export type SupplierPurchaseDocument = {
  lkpBranch: string;
  txtBranchName: string;
  txtDocNo: string;
  txtDate: string;
  lkpSupplierID: string;
  txtSupplierName: string;
  txtPINo: string;
  txtPONo: string;
  txtCurrency: string;
  txtCurrencyRate: number;
  txtSupplierAmt: number;
  txtDiscAmtFC: number;
  txtDiscAmt: number;
  txtNote: string;
  lines: SupplierPurchaseDetailLine[];
  totals: { txtQty: number; txtTotalPriceFC: number; txtTotalCost: number };
};

type ReportCommon = {
  txtCoName: string;
  txtHeading: string;
  txtReportInfo: string;
};

// rdgDetOrSum 1 = Summary
export type SummaryReport = ReportCommon & {
  rdgDetOrSum: 1;
  txtBranch: string;
  suppliers: SupplierPurchaseSupplier[];
};

// rdgDetOrSum 0 = Detailed
export type DetailedReport = ReportCommon & {
  rdgDetOrSum: 0;
  rdgDocType: "PI" | "PR";
  txtPINoLabel: string;
  documents: SupplierPurchaseDocument[];
};

export type PrintReport = SummaryReport | DetailedReport;

// ---- the number formats of the old report ----

const fixed = (value: number, decimals: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const formatAmountFC = (value: number) => fixed(value, 4); // #,#0.0000
export const formatAmount = (value: number) => fixed(value, 2); // n2
export const formatQty = (value: number) => fixed(value, 0); // #,#0
export const formatPrice = (value: number) => fixed(value, 2); // #,#0.00
export const formatCost = (value: number) => fixed(value, 4); // #,#0.0000

// the colour of the lines
export const LINE_COLOR = "#c7d1e4";

// the column weights, as the old reports
export const SUMMARY_WEIGHTS = [0.26, 0.15, 0.19, 0.205, 0.195]; // Date | Type | Document No. | Amount_FC | Amount

// Sl. # | Item ID | Item Name | Unit | Qty. | U Price (FC) | Tot. Price(FC) | Unit Price | Unit Cost | Total Cost
export const DETAIL_WEIGHTS = [0.04, 0.13, 0.24, 0.05, 0.07, 0.09, 0.1, 0.08, 0.09, 0.11];

export const DETAIL_LABELS = [
  "Sl. #",
  "Item ID",
  "Item Name",
  "Unit",
  "Qty.",
  "U Price (FC)",
  "Tot. Price(FC)",
  "Unit Price",
  "Unit Cost",
  "Total Cost",
];

// the first numeric column of the Detailed layout (Qty.)
export const DETAIL_FIRST_NUMBER = 4;

/* ---------------------------------------------------------
   Summary
--------------------------------------------------------- */

const supplierHtml = (s: SupplierPurchaseSupplier) => `<tr><td colspan="5" class="group">Supplier&nbsp; : &nbsp;<b>${esc(s.lkpSupplierID)}</b>&nbsp;&nbsp;${esc(s.txtSupplierName)}</td></tr>
    ${s.lines
      .map(
        (l, index) => `<tr${index === 0 ? ' class="first"' : ""}>
      <td>${esc(l.txtDate)}</td>
      <td>${esc(l.txtDocType)}</td>
      <td>${esc(l.txtDocNo)}</td>
      <td class="r">${formatAmountFC(l.txtAmountFC)}</td>
      <td class="r">${formatAmount(l.txtAmount)}</td>
    </tr>`
      )
      .join("\n    ")}
    <tr class="tot">
      <td colspan="3" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatAmountFC(s.totals.txtAmountFC)}</b></td>
      <td class="r"><b>${formatAmount(s.totals.txtAmount)}</b></td>
    </tr>`;

const summaryHtml = (r: SummaryReport) => `<table>
  <colgroup>
    ${SUMMARY_WEIGHTS.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="5" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="5" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="5" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr>
      <th>Date</th><th>Type</th><th>Document No.</th>
      <th class="r">Amount_FC</th><th class="r">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${r.suppliers.map(supplierHtml).join("\n    ")}
  </tbody>
</table>`;

/* ---------------------------------------------------------
   Detailed
--------------------------------------------------------- */

const detailLineHtml = (l: SupplierPurchaseDetailLine) => `<tr>
      <td>${l.txtSlNo}</td>
      <td>${esc(l.lkpItemID)}</td>
      <td>${esc(l.txtItemName)}</td>
      <td class="u">${esc(l.txtUnit)}</td>
      <td class="r">${formatQty(l.txtQty)}</td>
      <td class="r">${formatCost(l.txtUnitPriceFC)}</td>
      <td class="r">${formatCost(l.txtTotalPriceFC)}</td>
      <td class="r">${formatPrice(l.txtUnitPrice)}</td>
      <td class="r">${formatCost(l.txtUnitCost)}</td>
      <td class="r">${formatCost(l.txtTotalCost)}</td>
    </tr>`;

const documentHtml = (d: SupplierPurchaseDocument, piLabel: string) => `<tr class="gap"><td colspan="10"></td></tr>
    <tr class="info">
      <td colspan="3">Branch : <b>${esc(d.txtBranchName)}</b></td>
      <td colspan="4">Entry No. : <b>${esc(d.txtDocNo)}</b></td>
      <td colspan="3">Date : <b>${esc(d.txtDate)}</b></td>
    </tr>
    <tr class="info">
      <td colspan="3">Supplier : <b>${esc(d.lkpSupplierID)}</b> ${esc(d.txtSupplierName)}</td>
      <td colspan="4">${esc(piLabel)} : <b>${esc(d.txtPINo)}</b></td>
      <td colspan="3">Supplier Amt. : <b>${formatAmount(d.txtSupplierAmt)}</b></td>
    </tr>
    <tr class="info">
      <td colspan="3">Currency : <b>${esc(d.txtCurrency)}</b></td>
      <td colspan="4">P.O. No. : <b>${esc(d.txtPONo)}</b></td>
      <td colspan="3">Currency Rate : <b>${d.txtCurrencyRate}</b></td>
    </tr>
    <tr class="labels">
      ${DETAIL_LABELS.map((label, i) => `<th class="${i >= DETAIL_FIRST_NUMBER ? "r" : ""}">${esc(label)}</th>`).join("")}
    </tr>
    ${d.lines.map(detailLineHtml).join("\n    ")}
    <tr class="tot">
      <td colspan="4" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatQty(d.totals.txtQty)}</b></td>
      <td></td>
      <td class="r"><b>${formatCost(d.totals.txtTotalPriceFC)}</b></td>
      <td></td>
      <td></td>
      <td class="r"><b>${formatCost(d.totals.txtTotalCost)}</b></td>
    </tr>
    <tr class="foot">
      <td colspan="4">Disc. Amt.(FC) : <b>${formatCost(d.txtDiscAmtFC)}</b></td>
      <td colspan="6">Disc. Amt. : <b>${formatPrice(d.txtDiscAmt)}</b></td>
    </tr>
    <tr class="foot">
      <td colspan="10">Note : ${esc(d.txtNote)}</td>
    </tr>`;

const detailedHtml = (r: DetailedReport) => `<table>
  <colgroup>
    ${DETAIL_WEIGHTS.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="10" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="10" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="10" class="sub"  style="border:0"><div><span></span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
  </thead>
  <tbody>
    ${r.documents.map((d) => documentHtml(d, r.txtPINoLabel)).join("\n    ")}
  </tbody>
</table>`;

/* ---------------------------------------------------------
   The page
--------------------------------------------------------- */

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Supplier Purchase</title>
<style>
  @page {
    size: ${r.rdgDetOrSum === 1 ? "A4 portrait" : "A4 landscape"};
    margin: 12.7mm 10mm 12.7mm ${r.rdgDetOrSum === 1 ? "20mm" : "12mm"};
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
  td.u, td.r { white-space: nowrap; }                /* a number or a unit is never split over two lines */
  td.group { border: 0; height: 30px; padding-top: 8px; font-size: 10.5pt; }
  tr.tot td, tr.first td { border-top: 1px solid ${LINE_COLOR}; }
  tr.gap td { border: 0; height: 14px; }
  tr.info td { border: 0; height: 20px; }
  tr.labels th { border: 1px solid ${LINE_COLOR}; }
  tr.foot td { border: 0; height: 20px; }
</style>
</head>
<body>
${r.rdgDetOrSum === 1 ? summaryHtml(r) : detailedHtml(r)}
</body>
</html>`;

export const printSupplierPurchaseReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
