// services/Purchase/Report/RptTBExcel.ts
// The Trial Balance as an Excel file (same columns, colours and totals as the
// printed report). Needs:  npm i exceljs
import ExcelJS from "exceljs";
import type { TBRow, TBTotals } from "./RptTBService.js";

export type TBReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  accountLevel: number;
  rows: TBRow[];
  totals: TBTotals;
};

// VB: level 1 red, 2 green, 3 blue, otherwise black
const LEVEL_COLOR: Record<number, string> = {
  1: "FFFF0000",
  2: "FF008000",
  3: "FF0000FF",
};

const NUM_FMT = "#,##0.00;(#,##0.00);0.00";
const BORDER_COLOR = { argb: "FFB0C4DE" }; // LightSteelBlue
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

export const buildTrialBalanceWorkbook = async (
  report: TBReport,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Trial Balance", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 14 }, // Account ID
    { width: 50 }, // Account Name
    { width: 18 }, // Opening
    { width: 18 }, // Current Dr.
    { width: 18 }, // Current Cr.
    { width: 18 }, // Cu. Movement
    { width: 18 }, // Closing
  ];

  // ---- company / heading / branch (rows 1-3) ----
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = report.coName;
  ws.getCell("A1").font = { name: "Times New Roman", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = { name: "Times New Roman", size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = report.branch;
  ws.mergeCells("E3:G3");
  ws.getCell("E3").value = report.reportInfo;
  ws.getCell("E3").font = { name: "Times New Roman", size: 8 };
  ws.getCell("E3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const labels = [
    "Account ID",
    "Account Name",
    "Opening",
    "Current Dr.",
    "Current Cr.",
    "Cu. Movement",
    "Closing",
  ];
  const head = ws.getRow(4);
  labels.forEach((label, i) => {
    const c = head.getCell(i + 1);
    c.value = label;
    c.font = { bold: true };
    c.fill = HEAD_FILL;
    c.border = thin;
    c.alignment = { horizontal: i < 2 ? "left" : "right" };
  });

  // ---- detail ----
  for (const r of report.rows) {
    const row = ws.addRow([
      r.accountId,
      r.accountName, // leading spaces (A/C group indent) are kept
      r.opening,
      r.currentDr,
      r.currentCr,
      r.movement,
      r.closing,
    ]);
    const color = { argb: LEVEL_COLOR[r.level] ?? "FF000000" };

    row.eachCell((c: ExcelJS.Cell, col: number) => {
      c.font = { color };
      c.border = thin;
      if (col >= 3) {
        c.numFmt = NUM_FMT;
        c.alignment = { horizontal: "right" };
      }
    });
  }

  // ---- totals (VB report footer) ----
  const t = report.totals;
  const total = ws.addRow([
    "",
    "Total :",
    t.opening,
    t.currentDr,
    t.currentCr,
    t.movement,
    t.closing,
  ]);
  total.eachCell((c: ExcelJS.Cell, col: number) => {
    c.font = { bold: true };
    c.fill = HEAD_FILL;
    c.border = thin;
    if (col === 2) c.alignment = { horizontal: "right" };
    if (col >= 3) {
      c.numFmt = NUM_FMT;
      c.alignment = { horizontal: "right" };
    }
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
};
