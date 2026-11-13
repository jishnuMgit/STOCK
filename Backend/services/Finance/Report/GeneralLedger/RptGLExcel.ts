// services/Finance/Report/RptGLExcel.ts
// The General Ledger as an Excel file (same columns, account groups and totals
// as the printed report). Needs:  npm i exceljs
import ExcelJS from "exceljs";
import { applyReportFont, levelFont, setPrintedFooter, thin } from "../../../../utils/reportStyle.js";
import type { GLAccount } from "./RptGLService.js";

export type GLReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  accounts: GLAccount[];
};

const AMOUNT = "#,##0.00";
const LAST_COL = "I";

export const buildGLWorkbook = async (report: GLReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("General Ledger", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:3",
    },
  });

  ws.columns = [
    { width: 12 }, // Date
    { width: 8 }, // Br. ID
    { width: 8 }, // Type
    { width: 14 }, // Doc. No.
    { width: 56 }, // Description
    { width: 10 }, // C.C ID
    { width: 16 }, // Debit
    { width: 16 }, // Credit
    { width: 20 }, // Balance
  ];

  // ---- company / heading / branch (rows 1-3) ----
  ws.mergeCells(`A1:${LAST_COL}1`);
  ws.getCell("A1").value = report.coName;
  ws.getCell("A1").font = levelFont("company", false, "inter");
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(`A2:${LAST_COL}2`);
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = levelFont("heading", false, "inter");
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells(`A3:${LAST_COL}3`);
  ws.getCell("A3").value = report.branch;
  ws.getCell("A3").font = levelFont("group", false, "inter");

  // the user and the time: bottom right of every printed page
  setPrintedFooter(ws, report.reportInfo, "inter");

  const labels = [
    "Date", "Br. ID", "Type", "Doc. No.", "Description",
    "C.C ID", "Debit", "Credit", "Balance",
  ];

  report.accounts.forEach((acc, index) => {
    // blank row between accounts; each account starts on a new printed page
    if (index > 0) {
      const gap = ws.addRow([]);
      gap.addPageBreak();
    } else {
      ws.addRow([]);
    }

    // ---- account (VB group header) ----
    const accRow = ws.addRow([`Account :  ${acc.accountId}   ${acc.accountName}`]);
    ws.mergeCells(`A${accRow.number}:${LAST_COL}${accRow.number}`);
    accRow.getCell(1).font = levelFont("group", true, "inter");

    // ---- column labels ----
    const head = ws.addRow(labels);
    head.eachCell((c, col) => {
      c.font = levelFont("columnHead", true, "inter");
      c.border = thin;
      c.alignment = { horizontal: col >= 7 ? "right" : "left" };
    });

    // ---- detail ----
    for (const r of acc.rows) {
      const row = ws.addRow([
        r.date, r.brId, r.docType, r.docNo, r.description,
        r.ccId, r.debit, r.credit, r.balance,
      ]);
      row.eachCell({ includeEmpty: true }, (c, col) => {
        c.border = thin;
        if (col === 7 || col === 8) {
          c.numFmt = AMOUNT;
          c.alignment = { horizontal: "right" };
        }
        if (col === 9) c.alignment = { horizontal: "right" };
      });
    }

    // ---- account total (VB group footer) ----
    const total = ws.addRow([
      "", "", "", "", "", "Total :", acc.totalDebit, acc.totalCredit, acc.balance,
    ]);
    total.eachCell({ includeEmpty: true }, (c, col) => {
      c.font = { bold: true };
      c.border = thin;
      if (col === 6) c.alignment = { horizontal: "right" };
      if (col === 7 || col === 8) {
        c.numFmt = AMOUNT;
        c.alignment = { horizontal: "right" };
      }
      if (col === 9) c.alignment = { horizontal: "right" };
    });
  });

  // the whole sheet in the report font (a cell keeps its own size and bold)
  applyReportFont(ws, "inter");

  return Buffer.from(await wb.xlsx.writeBuffer());
};