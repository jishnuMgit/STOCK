// services/Finance/Report/RptReceivablesExcel.ts
// The Receivables as an Excel file (same columns and total as the printed
// report). Needs:  npm i exceljs
import ExcelJS from "exceljs";
import { applyReportFont, levelFont, setPrintedFooter, thin } from "../../../../utils/reportStyle.js";
import type { ReceivableRow } from "./RptReceivablesService.js";

export type ReceivablesReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  rows: ReceivableRow[];
  totalDebit: number;
  totalCredit: number;
};

const AMOUNT = "#,##0.00";

export const buildReceivablesWorkbook = async (
  report: ReceivablesReport,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Receivables", {
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
    { width: 18 }, // Debit
    { width: 18 }, // Credit
  ];

  // ---- company / heading / branch (rows 1-3) ----
  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = report.coName;
  ws.getCell("A1").font = levelFont("company", false, "inter");
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = levelFont("heading", false, "inter");
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = report.branch;
  ws.getCell("A3").font = levelFont("group", false, "inter");

  // the user and the time: bottom right of every printed page
  setPrintedFooter(ws, report.reportInfo, "inter");

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Account ID", "Account Name", "Debit", "Credit"];
  head.eachCell((c, col) => {
    c.font = levelFont("columnHead", true, "inter");
    c.border = thin;
    c.alignment = { horizontal: col >= 3 ? "right" : "left" };
  });

  // ---- detail ----
  for (const r of report.rows) {
    const row = ws.addRow([r.accountId, r.accountName, r.debit, r.credit]);
    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.border = thin;
      if (col >= 3) {
        c.numFmt = AMOUNT;
        c.alignment = { horizontal: "right" };
      }
    });
  }

  // ---- total (VB report footer) ----
  const total = ws.addRow(["", "Total :", report.totalDebit, report.totalCredit]);
  total.eachCell({ includeEmpty: true }, (c, col) => {
    c.font = { bold: true };
    c.border = thin;
    if (col === 2) c.alignment = { horizontal: "right" };
    if (col >= 3) {
      c.numFmt = AMOUNT;
      c.alignment = { horizontal: "right" };
    }
  });

  // the whole sheet in the report font (a cell keeps its own size and bold)
  applyReportFont(ws, "inter");

  return Buffer.from(await wb.xlsx.writeBuffer());
};
