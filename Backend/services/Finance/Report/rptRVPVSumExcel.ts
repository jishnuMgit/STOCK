// services/Finance/Report/rptRVPVSumExcel.ts
// The Receipt / Payment Summary report as an Excel file - the same layout as the printed report (the old rptRVPVSumRpt),
// A4 portrait: Entry No. / Date / Cash/Bank Account Name / Received From/Paid To / Amount, and a Total row.
import ExcelJS from "exceljs";
import { addReportTitle, applyReportFont, thin } from "../../../utils/reportStyle.js";

import type { RVPVSumLine } from "./rptRVPVSumService.js";

export type RVPVSumReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" (one branch) or "Branch : X, Y" (selected branches); "" for All Branch
  txtBranch: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  lines: RVPVSumLine[];
  totals: { txtAmount: number };
};

// 2 decimals, a negative in brackets (the same as the other reports)
const AMOUNT_FORMAT = "#,##0.00;(#,##0.00);0.00";

export const buildRVPVSumWorkbook = async (report: RVPVSumReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Receipt Payment Summary", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [{ width: 16 }, { width: 14 }, { width: 34 }, { width: 40 }, { width: 16 }];

  // ---- company / heading / branch + report info (rows 1-3): the same on every report ----
  addReportTitle(ws, report, report.txtBranch, 5, 3);

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Entry No.", "Date", "Cash/Bank Account Name", "Received From/Paid To", "Amount"];

  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col === 5 ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  // ---- one row per voucher ----
  for (const line of report.lines) {
    const row = ws.addRow([
      line.txtDocNo,
      line.txtDate,
      line.txtAccountName,
      line.txtReceivedFromPaidTo,
      line.txtAmount,
    ]);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.alignment = { horizontal: col === 5 ? "right" : "left" };
      if (col === 5) cell.numFmt = AMOUNT_FORMAT;
    });
  }

  // ---- the Total row ----
  const total = ws.addRow(["Total :", "", "", "", report.totals.txtAmount]);

  ws.mergeCells(total.number, 1, total.number, 4);

  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.border = thin;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "right" };
    if (col === 5) cell.numFmt = AMOUNT_FORMAT;
  });

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
