// services/Finance/Report/RptPayablesExcel.ts
// The Payables as an Excel file (same columns and total as the printed
// report). Needs:  npm i exceljs
import ExcelJS from "exceljs";
import type { PayableRow } from "./RptPayablesService.js";

export type PayablesReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  rows: PayableRow[];
  totalDebit: number;
  totalCredit: number;
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

export const buildPayablesWorkbook = async (
  report: PayablesReport,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Payables", {
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
  ws.getCell("A1").font = { name: "Times New Roman", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = { name: "Times New Roman", size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:B3");
  ws.getCell("A3").value = report.branch;
  ws.mergeCells("C3:D3");
  ws.getCell("C3").value = report.reportInfo;
  ws.getCell("C3").font = { name: "Times New Roman", size: 8 };
  ws.getCell("C3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Account ID", "Account Name", "Debit", "Credit"];
  head.eachCell((c, col) => {
    c.font = { bold: true };
    c.fill = HEAD_FILL;
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
    c.fill = HEAD_FILL;
    c.border = thin;
    if (col === 2) c.alignment = { horizontal: "right" };
    if (col >= 3) {
      c.numFmt = AMOUNT;
      c.alignment = { horizontal: "right" };
    }
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
};
