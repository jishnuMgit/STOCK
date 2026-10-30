// services/Finance/Transaction/beginningBalanceExcel.ts
// The Beginning Balance report as an Excel file (same columns as the printed report:
// Account ID, Account Name, C.C. ID, Debit, Credit - coloured by account level, a
// Total row at the end).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";
import { REPORT_FONT_SIZE, applyReportFont, font, thin } from "../../../utils/reportStyle.js";

import type { BeginningBalancePrintLine } from "./beginningBalanceService.js";

export type BeginningBalanceExcelReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  lines: BeginningBalancePrintLine[];
};

// the level of the accounts the report is made for (the old strInputAccountLevel)
const INPUT_ACCOUNT_LEVEL = 4;

const HEAD_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFEFF3FA" },
};
// the old Detail_BeforePrint: level 1 red, 2 green, 3 blue, the accounts black
const levelColor = (level: number | null) =>
  Number(level) === 1
    ? { argb: "FFFF0000" }
    : Number(level) === 2
      ? { argb: "FF008000" }
      : Number(level) === 3
        ? { argb: "FF0000FF" }
        : { argb: "FF000000" };

// the old {0:#,#.00;(#,#.00);0.00} - a negative total in brackets
const TOTAL_FORMAT = "#,##0.00;(#,##0.00);0.00";
const AMOUNT_FORMAT = "#,##0.00";

export const buildBeginningBalanceWorkbook = async (
  report: BeginningBalanceExcelReport,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Beginning Balance", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:4",
    },
  });

  ws.columns = [
    { width: 16 }, // Account ID
    { width: 50 }, // Account Name
    { width: 12 }, // C.C. ID
    { width: 18 }, // Debit
    { width: 18 }, // Credit
  ];

  // ---- company / heading (rows 1-2) ----
  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = report.coName;
  ws.getCell("A1").font = font(REPORT_FONT_SIZE.company, true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = font(REPORT_FONT_SIZE.heading);
  ws.getCell("A2").alignment = { horizontal: "center" };

  // ---- branch (left) and report info (right) - row 3 ----
  ws.mergeCells("A3:C3");
  ws.getCell("A3").value = report.branch;
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells("D3:E3");
  ws.getCell("D3").value = report.reportInfo;
  ws.getCell("D3").font = font(REPORT_FONT_SIZE.small);
  ws.getCell("D3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Account ID", "Account Name", "C.C. ID", "Debit", "Credit"];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.fill = HEAD_FILL;
    cell.border = thin;
    cell.alignment = { horizontal: col >= 4 ? "right" : "left" };
  });

  // ---- the accounts (the name keeps its leading spaces = the level indent) ----
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of report.lines) {
    const debit = Number(line.fdebit);
    const credit = Number(line.fcredit);

    // the totals add up only the rows of the input level, so a group is not
    // counted twice
    if (Number(line.faccountlevel) === INPUT_ACCOUNT_LEVEL) {
      totalDebit += debit;
      totalCredit += credit;
    }

    const row = ws.addRow([
      line.faccountid,
      line.faccountname ?? "",
      String(line.fccid ?? "").trim(),
      debit,
      credit,
    ]);
    const color = levelColor(line.faccountlevel);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { color };
      cell.alignment = { horizontal: col >= 4 ? "right" : "left" };
      if (col >= 4) cell.numFmt = AMOUNT_FORMAT;
    });
  }

  // ---- the shaded Total row ----
  const total = ws.addRow(["Total", "", "", totalDebit, totalCredit]);
  ws.mergeCells(total.number, 1, total.number, 3);
  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.border = thin;
    cell.fill = HEAD_FILL;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "right" };
    if (col >= 4) cell.numFmt = TOTAL_FORMAT;
  });

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
