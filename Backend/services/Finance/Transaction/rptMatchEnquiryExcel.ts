// services/Finance/Transaction/rptMatchEnquiryExcel.ts
// The Match Enquiry report as an Excel file - the same layout as the printed report (the old rptMatchEnquiryPrint),
// A4 portrait: Br. ID / Date / Type / Doc. No. / Description / Debit / Credit / Match Apply Date, one block for each
// account ("Account : id name", its lines, "Total :"), a page break after each block.
import ExcelJS from "exceljs";
import { addReportTitle, applyReportFont, font, thin, REPORT_FONT_SIZE } from "../../../utils/reportStyle.js";

import type { RptMatchEnquiryGroup } from "./rptMatchEnquiryService.js";

export type RptMatchEnquiryReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X"
  txtBranch: string;
  // "Document : BR JD-26000010"
  txtDocument: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  groups: RptMatchEnquiryGroup[];
};

// 2 decimals, a negative in brackets (the same as the other reports)
const AMOUNT_FORMAT = "#,##0.00;(#,##0.00);0.00";

const LABELS = ["Br. ID", "Date", "Type", "Doc. No.", "Description", "Debit", "Credit", "Match Apply Date"];

// the columns that are numbers
const isAmountColumn = (col: number) => col === 6 || col === 7;

export const buildRptMatchEnquiryWorkbook = async (report: RptMatchEnquiryReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Match Enquiry", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [{ width: 9 }, { width: 14 }, { width: 8 }, { width: 16 }, { width: 34 }, { width: 16 }, { width: 16 }, { width: 18 }];

  // ---- company / heading / branch + report info (rows 1-3): the same on every report ----
  addReportTitle(ws, report, report.txtBranch, 8, 5);

  // ---- the document (row 4) ----
  ws.mergeCells("A4:H4");
  ws.getCell("A4").value = report.txtDocument;
  ws.getCell("A4").font = font(REPORT_FONT_SIZE.body);
  ws.getCell("A4").alignment = { horizontal: "left" };

  // ---- column labels (row 5) ----
  const head = ws.getRow(5);
  head.values = LABELS;

  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: isAmountColumn(col) ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 5 }];
  ws.pageSetup.printTitlesRow = "1:5";

  // ---- one block for each account ----
  for (const group of report.groups) {
    // the account heading
    const heading = ws.addRow([`Account : ${group.lkpAccountID} ${group.txtAccountName}`.trimEnd()]);

    ws.mergeCells(heading.number, 1, heading.number, 8);
    heading.getCell(1).font = { bold: true };
    heading.getCell(1).alignment = { horizontal: "left" };

    // its lines
    for (const line of group.lines) {
      const row = ws.addRow([
        line.txtBrID,
        line.txtDate,
        line.txtDocType,
        line.txtDocNo,
        line.txtDescription,
        line.txtDebit,
        line.txtCredit,
        line.txtMatchApplyDate,
      ]);

      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = thin;
        cell.alignment = { horizontal: isAmountColumn(col) ? "right" : "left" };
        if (isAmountColumn(col)) cell.numFmt = AMOUNT_FORMAT;
      });
    }

    // its total
    const total = ws.addRow(["Total :", "", "", "", "", group.totals.txtDebit, group.totals.txtCredit, ""]);

    ws.mergeCells(total.number, 1, total.number, 5);

    total.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
      if (isAmountColumn(col)) cell.numFmt = AMOUNT_FORMAT;
    });

    // a page break after each account (the old group footer's PageBreak.AfterBand)
    total.addPageBreak();
  }

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
