// StockTransferPrintReport.ts
// The printed page (the old rptSTprint): A4 landscape, company name, heading, then
// Branch / Transfer To / Entry No. / Date and the note, then Sl.# / Item ID / Item
// Name / Unit / Qty. / Unit Cost / Total Cost, and a Total row at the end. "Page x of
// y" top right and the report info bottom right of every page. (The old layout was
// not available, so the lines are an assumption.)
// Printed through components/common/printHtml (a hidden iframe).
import dayjs from "dayjs";

import { cssStr, esc, printHtmlDocument } from "../../common/printHtml";

// the heading (names = the server's response keys)
export type PrintHeader = {
  txtCoName: string;
  txtBranchName: string;
  txtToBranchName: string;
  txtDocNo: string;
  dtpDate: string | null;
  txtNote: string | null;
  // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  txtReportInfo: string;
};

// one line of the report
export type PrintLine = {
  txtSlNo: number;
  lkpItemID: string;
  lkpItemName: string | null;
  txtUnit: string | null;
  txtQty: string;
  txtUnitCost: string;
  txtTotalCost: string;
};

export type PrintReport = PrintHeader & { rows: PrintLine[] };

export const REPORT_HEADING = "Stock Transfer";

// Qty with 3 decimals, Unit Cost and Total Cost with 4 (the columns)
export const formatQty = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

export const formatCost = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

export const formatDate = (value: string | null) =>
  value ? dayjs(value).format("DD-MMM-YYYY") : "";

export const totalsOf = (rows: PrintLine[]) => ({
  qty: rows.reduce((sum, row) => sum + Number(row.txtQty), 0),
  cost: rows.reduce((sum, row) => sum + Number(row.txtTotalCost), 0),
});

const rowHtml = (row: PrintLine) => `<tr>
      <td>${esc(row.txtSlNo)}</td>
      <td>${esc(row.lkpItemID)}</td>
      <td>${esc(row.lkpItemName)}</td>
      <td>${esc(row.txtUnit)}</td>
      <td class="r">${formatQty(Number(row.txtQty))}</td>
      <td class="r">${formatCost(Number(row.txtUnitCost))}</td>
      <td class="r">${formatCost(Number(row.txtTotalCost))}</td>
    </tr>`;

export const buildHtml = (r: PrintReport) => {
  const totals = totalsOf(r.rows);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(REPORT_HEADING)}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12mm 10mm 14mm 15mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.txtReportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 24px; }
  .info { height: 22px; }
  .info div { display: flex; justify-content: space-between; gap: 16px; }
  th { border: 1px solid #c7d1e4; height: 24px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid #c7d1e4; border-top: 0; min-height: 22px; padding: 2px 4px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  tr.tot td { border-top: 1px solid #c7d1e4; }
</style>
</head>
<body>
<table>
  <colgroup>
    <col style="width:5%" /><col style="width:14%" /><col style="width:36%" />
    <col style="width:8%" /><col style="width:11%" /><col style="width:12%" />
    <col style="width:14%" />
  </colgroup>
  <thead>
    <tr><td colspan="7" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="7" class="head" style="border:0">${esc(REPORT_HEADING)}</td></tr>
    <tr><td colspan="7" class="info" style="border:0"><div>
      <span>Branch : <b>${esc(r.txtBranchName)}</b></span>
      <span>Transfer To : <b>${esc(r.txtToBranchName)}</b></span>
      <span>Entry No. : <b>${esc(r.txtDocNo)}</b></span>
      <span>Date : <b>${esc(formatDate(r.dtpDate))}</b></span>
    </div></td></tr>${
      r.txtNote
        ? `
    <tr><td colspan="7" class="info" style="border:0">Note : <b>${esc(r.txtNote)}</b></td></tr>`
        : ""
    }
    <tr>
      <th>Sl.#</th><th>Item ID</th><th>Item Name</th><th>Unit</th>
      <th class="r">Qty.</th><th class="r">Unit Cost</th><th class="r">Total Cost</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows.map(rowHtml).join("\n    ")}
    <tr class="tot">
      <td colspan="4"><b>Total :</b></td>
      <td class="r"><b>${formatQty(totals.qty)}</b></td>
      <td></td>
      <td class="r"><b>${formatCost(totals.cost)}</b></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

export const printStockTransferReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
