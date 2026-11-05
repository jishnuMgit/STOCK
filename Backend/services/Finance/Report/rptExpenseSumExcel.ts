// services/Finance/Report/rptExpenseSumExcel.ts
// The Expense Summary report as an Excel file - the same layout as the printed report (the old rptExpenseSumRpt), A4
// portrait: Account ID / Account Name / Opening / Current / Closing, and a Total row.
import ExcelJS from "exceljs";
import { addReportTitle, applyReportFont, thin } from "../../../utils/reportStyle.js";

import type { ExpenseSumLine, ExpenseSumMonthLine } from "./rptExpenseSumService.js";

export type ExpenseSumReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" (one branch) and "Cost Center : ID - Name" (one cost center), as chosen; "" when both are all
  txtBranch: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  lines: ExpenseSumLine[];
  totals: { txtOpening: number; txtCurrent: number; txtClosing: number };
};

// the old report: #,#.00 with the negative in brackets
const AMOUNT_FORMAT = "#,##0.00;(#,##0.00);0.00";

// the old report's colours by account level: 1 red, 2 green, 3 blue, the rest black
const LEVEL_COLOR: Record<number, string> = { 1: "FFFF0000", 2: "FF008000", 3: "FF0000FF" };

export const buildExpenseSumWorkbook = async (report: ExpenseSumReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Expense Summary", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [{ width: 14 }, { width: 46 }, { width: 16 }, { width: 16 }, { width: 18 }];

  // ---- company / heading / branch + report info (rows 1-3): the same on every report ----
  addReportTitle(ws, report, report.txtBranch, 5, 2);

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Account ID", "Account Name", "Opening", "Current", "Closing"];

  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= 3 ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  // ---- one row per account ----
  for (const line of report.lines) {
    const row = ws.addRow([
      line.lkpAccountID,
      line.txtAccountName,
      line.txtOpening,
      line.txtCurrent,
      line.txtClosing,
    ]);

    const color = LEVEL_COLOR[line.txtAccountLevel];

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.alignment = { horizontal: col >= 3 ? "right" : "left" };
      if (color) cell.font = { color: { argb: color } };
      if (col >= 3) cell.numFmt = AMOUNT_FORMAT;
    });
  }

  // ---- the Total row ----
  const total = ws.addRow([
    "Total :",
    "",
    report.totals.txtOpening,
    report.totals.txtCurrent,
    report.totals.txtClosing,
  ]);

  ws.mergeCells(total.number, 1, total.number, 2);

  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.border = thin;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "right" };
    if (col >= 3) cell.numFmt = AMOUNT_FORMAT;
  });

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};

/* =========================================================
   THE MONTHLY REPORT ("Up to Month") as an Excel file, as the old one: a sheet for January to June, and a sheet for
   July to December (with the January to June total as its Opening) when the month is after June - the old
   rptExpenseSumJanToJunRpt and rptExpenseSumJulToDecRpt, A4 landscape
========================================================= */

export type ExpenseSumMonthReport = {
  txtCoName: string;
  // the heading of the January to June page: "Expense Summary Up to June - 2026", or "... Up to March - 2026" when the
  // month is not after June (then it is the only page)
  txtHeading: string;
  // the heading of the July to December page ("" when the month is not after June: no second page)
  txtHeadingJulToDec: string;
  txtBranch: string;
  txtReportInfo: string;
  lines: ExpenseSumMonthLine[];
  totals: { txtMonths: number[]; txtJanToJun: number; txtJanToDec: number };
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// one sheet of the monthly report: Account ID / Account Name / [Opening] / six months / Total
const addMonthSheet = (
  wb: ExcelJS.Workbook,
  name: string,
  heading: string,
  report: ExpenseSumMonthReport,
  secondHalf: boolean
) => {
  const ws = wb.addWorksheet(name, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const firstMonth = secondHalf ? 6 : 0; // the index of Jul / Jan

  // Jul-Dec: Account ID, Account Name, Opening (= January to June), Jul..Dec, Total (= the whole year)
  // Jan-Jun: Account ID, Account Name, Jan..Jun, Total (= January to June)
  const labels = [
    "Account ID",
    "Account Name",
    ...(secondHalf ? ["Opening"] : []),
    ...MONTH_LABELS.slice(firstMonth, firstMonth + 6),
    "Total",
  ];
  const firstNumberColumn = 3;

  ws.columns = labels.map((_, i) => ({ width: i === 0 ? 14 : i === 1 ? 40 : 14 }));

  addReportTitle(
    ws,
    // the user / date line is printed once: on the first sheet only
    { txtCoName: report.txtCoName, txtHeading: heading, txtReportInfo: secondHalf ? "" : report.txtReportInfo },
    report.txtBranch,
    labels.length,
    3
  );

  const head = ws.getRow(4);
  head.values = labels;
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= firstNumberColumn ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  const numbers = (months: number[], janToJun: number, janToDec: number) => [
    ...(secondHalf ? [janToJun] : []),
    ...months.slice(firstMonth, firstMonth + 6),
    secondHalf ? janToDec : janToJun,
  ];

  for (const line of report.lines) {
    const row = ws.addRow([
      line.lkpAccountID,
      line.txtAccountName,
      ...numbers(line.txtMonths, line.txtJanToJun, line.txtJanToDec),
    ]);

    const color = LEVEL_COLOR[line.txtAccountLevel];

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.alignment = { horizontal: col >= firstNumberColumn ? "right" : "left" };
      if (color) cell.font = { color: { argb: color } };
      if (col >= firstNumberColumn) cell.numFmt = AMOUNT_FORMAT;
    });
  }

  const t = report.totals;
  const total = ws.addRow(["Total :", "", ...numbers(t.txtMonths, t.txtJanToJun, t.txtJanToDec)]);

  ws.mergeCells(total.number, 1, total.number, 2);

  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.border = thin;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "right" };
    if (col >= firstNumberColumn) cell.numFmt = AMOUNT_FORMAT;
  });

  applyReportFont(ws);
};

export const buildExpenseSumMonthWorkbook = async (report: ExpenseSumMonthReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();

  addMonthSheet(wb, "Jan - Jun", report.txtHeading, report, false);

  if (report.txtHeadingJulToDec !== "") {
    addMonthSheet(wb, "Jul - Dec", report.txtHeadingJulToDec, report, true);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
};
