// RptStockTransferPrint.ts
// The printed page (the old rptSTprint): A4 landscape, company name, heading, then
// Branch / Transfer To / Entry No. / Date and the note, then Line / Item ID / Item
// Name / Unit / Qty. / Unit Cost / Total Cost, and a Total row at the end. "Page x of
// y" top right and the report info bottom right of every page. (The old layout was
// not available, so the lines are an assumption.)
// Printed through components/common/printHtml (a hidden iframe).
import dayjs from "dayjs";

import { cssStr, esc, printHtmlDocument } from "../../common/printHtml";
import { documentPrintCss } from "../../common/reportStyle";

// the heading (names = the server's response keys)
export type PrintHeader = {
  txtCoName: string;
  txtBranchName: string;
  txtToBranchName: string;
  txtDocNo: string;
  dtpDate: string | null;
  txtNote: string | null;
  // "<user>  dd/mm/yyyy hh:mm" of the save - bottom right of every page, after "Created By :"
  txtSavedBy?: string;
  // "<user>  dd/mm/yyyy hh:mm" of the print (used when the document has no saved-by) - bottom right of every page
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

// Transfer To is on the second info line only. Its side: "left" (under Branch) or "right" (at the right end). One word to change -
// the preview, the printed page and the PDF all follow it.
export const TRANSFER_TO_SIDE: "left" | "right" = "left";

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
      <td class="c">${esc(row.txtSlNo)}</td>
      <td>${esc(row.lkpItemID)}</td>
      <td>${esc(row.lkpItemName)}</td>
      <td class="u">${esc(row.txtUnit)}</td>
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
<style>${documentPrintCss({
  look: "inter",
  orientation: "landscape",
  margin: "12mm 10mm 14mm 15mm",
  // the space left and right inside a cell: 5 px (the common one is 8 px)
  cellPaddingX: 0,
  // the bottom right of every page: "Created By : <user> <time of the save>" (the print's own user and time when none is saved)
  reportInfo: cssStr(r.txtSavedBy || r.txtReportInfo),
  infoLabel: r.txtSavedBy ? "Created By" : "Printed",
  // "Page x of y" and "Printed : ..." are 11 px
  smallSize: "11px",
  // the line under the heading (Branch, Entry No., Date, Transfer To): 11 px, except the Entry No. itself (JD-2600001): 14 px
  extra: `.info { font-size: 11px; height: 25px; } .info .entry b { font-size: 14px; } /* the height is the space between the Branch line and the table (the common one is 32 px) */
  th { font-size: 11px; } /* the column headings are 11 px, the same as the rows */
  tr.note td { padding: 10px 0 0 0; white-space: pre-wrap; } /* the "Note :" line after the Total row, at the left side - printed even when the note is empty */
  td.u { white-space: nowrap; padding: 0 4px; } /* a unit (NOS.) is never split over two lines, even in a narrow column */
  td.c { text-align: center; padding: 0 2px; } /* the line numbers are in the middle of their column, with only 2 px of space on each side */
  th:first-child { padding: 0 4px; text-align: center; } /* the Line heading: in the middle, 4 px on each side - the same space on both sides, like the numbers below it */
  /* the table lines of this print only: lighter (#e2e8f2) than the common #c7d1e4. They stay a whole 1 px: a fraction of a pixel is
     drawn thicker on some lines and thinner on others (the line between Line and Item ID), so every line must be the same */
  th { border-color: #e2e8f2; }
  td { border-color: #e2e8f2; }
  tr.tot td { border-top: 1px solid #e2e8f2; }
  tr.note td { border: 0; }
  .info, .pagerow, .co, .head { border: 0; }
  .pagerow { height: 20px; } /* the line of its own for "Page x of y", between "Stock Transfer" and the Branch line */`,
})}
</style>
</head>
<body>
<table>
  <colgroup>
    <col style="width:3%" /><col style="width:14%" /><col style="width:44.5%" />
    <col style="width:4%" /><col style="width:6%" /><col style="width:6%" />
    <col style="width:14%" />
  </colgroup>
  <thead>
    <tr><td colspan="7" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="7" class="head" style="border:0">${esc(REPORT_HEADING)}</td></tr>
    <tr><td colspan="7" class="pagerow" style="border:0"></td></tr>
    <tr><td colspan="7" class="info" style="border:0;height:20px"><div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:baseline">
      <!-- Branch at the left, Entry No. in the middle, Date at the right end - then Transfer To at the left, under Branch, in the next row -->
      <span>Branch : <b>${esc(r.txtBranchName)}</b></span>
      <span class="entry">Entry No. : <b>${esc(r.txtDocNo)}</b></span>
      <span style="text-align:right">Date : <b>${esc(formatDate(r.dtpDate))}</b></span>
    </div></td></tr>
    <tr><td colspan="7" class="info" style="border:0"><div style="display:block;text-align:${TRANSFER_TO_SIDE}">Transfer To : <b>${esc(r.txtToBranchName)}</b></div></td></tr>
    <tr>
      <th>Line</th><th>Item ID</th><th>Item Name</th><th>Unit</th>
      <th class="r">Qty.</th><th class="r">Unit Cost</th><th class="r">Total Cost</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows.map(rowHtml).join("\n    ")}
    <tr class="tot">
      <td colspan="4" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatQty(totals.qty)}</b></td>
      <td></td>
      <td class="r"><b>${formatCost(totals.cost)}</b></td>
    </tr>
    <tr class="note"><td colspan="7" style="border:0">Note : <b>${esc(r.txtNote)}</b></td></tr>
  </tbody>
</table>
</body>
</html>`;
};

export const printStockTransferReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
