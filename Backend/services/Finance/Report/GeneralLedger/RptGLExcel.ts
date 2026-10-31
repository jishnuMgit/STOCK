// services/Finance/Report/RptGLExcel.ts
// The General Ledger as an Excel file (same columns, account groups and totals
// as the printed report). Needs:  npm i exceljs
import ExcelJS from "exceljs";
import type { GLAccount } from "./RptGLService.js";

export type GLReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  accounts: GLAccount[];
};

const BORDER_COLOR = { argb: "FFC7D1E4" };
const HEAD_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFEFF3FA" },
};
const thin = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
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
  ws.getCell("A1").font = { name: "Tahoma", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(`A2:${LAST_COL}2`);
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = { name: "Tahoma", size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:E3");
  ws.getCell("A3").value = report.branch;
  ws.mergeCells(`F3:${LAST_COL}3`);
  ws.getCell("F3").value = report.reportInfo;
  ws.getCell("F3").font = { name: "Tahoma", size: 8.5 };
  ws.getCell("F3").alignment = { horizontal: "right" };

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
    accRow.getCell(1).font = { bold: true, size: 10.5 };
    accRow.getCell(1).fill = HEAD_FILL;

    // ---- column labels ----
    const head = ws.addRow(labels);
    head.eachCell((c, col) => {
      c.font = { bold: true };
      c.fill = HEAD_FILL;
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
      c.fill = HEAD_FILL;
      c.border = thin;
      if (col === 6) c.alignment = { horizontal: "right" };
      if (col === 7 || col === 8) {
        c.numFmt = AMOUNT;
        c.alignment = { horizontal: "right" };
      }
      if (col === 9) c.alignment = { horizontal: "right" };
    });
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
};