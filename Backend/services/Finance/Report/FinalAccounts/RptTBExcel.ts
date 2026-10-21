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

// same colours as the account tree: level 1 green, 2 blue, 3 magenta,
// level 4 (the accounts) dark slate. Levels 1-3 (the groups) are bold.
const LEVEL_COLOR: Record<number, string> = {
  1: "FF00A63E",
  2: "FF155DFC",
  3: "FFC800DE",
};
const DETAIL_COLOR = "FF314158";

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
    views: [{ state: "frozen", ySplit: 5 }],
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
    { width: 18 }, // Debit
    { width: 18 }, // Credit
    { width: 18 }, // Movement
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

  // ---- two-line column labels (rows 4-5) ----
  //   Account ID | Account Name | Opening | Transactions            | Closing
  //                                        | Debit | Credit | Movement |
  ws.mergeCells("A4:A5");
  ws.mergeCells("B4:B5");
  ws.mergeCells("C4:C5");
  ws.mergeCells("D4:F4");
  ws.mergeCells("G4:G5");

  // the same look on every cell of the header block (merged cells included)
  for (let r = 4; r <= 5; r++) {
    for (let c = 1; c <= 7; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { bold: true };
      cell.fill = HEAD_FILL;
      cell.border = thin;
      cell.alignment = { horizontal: "right", vertical: "bottom" };
    }
  }

  const label = (
    addr: string,
    value: string,
    horizontal: "left" | "center" | "right",
    vertical: "top" | "middle" | "bottom" = "bottom",
  ) => {
    const cell = ws.getCell(addr);
    cell.value = value;
    cell.alignment = { horizontal, vertical };
  };

  // Account ID / Account Name: centred between the two lines
  label("A4", "Account ID", "left", "middle");
  label("B4", "Account Name", "left", "middle");
  label("C4", "Opening", "right");
  label("D4", "Transactions", "center");
  label("G4", "Closing", "right");
  label("D5", "Debit", "right");
  label("E5", "Credit", "right");
  label("F5", "Movement", "right");

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
    const color = { argb: LEVEL_COLOR[r.level] ?? DETAIL_COLOR };
    const bold = r.level >= 1 && r.level <= 3;

    row.eachCell((c, col) => {
      c.font = { color, bold };
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
  total.eachCell((c, col) => {
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