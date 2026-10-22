// services/Finance/Report/RptChartOfAccountExcel.ts
// The Chart Of Account as an Excel file (same columns as the printed report:
// Account ID, Account Name (indented by level), C.C, Level, coloured by level).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";
import type { ReportRow } from "./RptChartOfAccountService.js";

export type ChartOfAccountReport = {
  coName: string;
  heading: string;
  reportInfo: string;
  rows: ReportRow[];
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

// level colours as on the tree: 1 green, 2 blue, 3 purple, else dark slate
const levelColor = (level: number) =>
  level === 1
    ? { argb: "FF00A63E" }
    : level === 2
      ? { argb: "FF155DFC" }
      : level === 3
        ? { argb: "FFC800DE" }
        : { argb: "FF314158" };

export const buildChartOfAccountWorkbook = async (
  report: ChartOfAccountReport,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Chart Of Account", {
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
    { width: 60 }, // Account Name
    { width: 8 }, // C.C
    { width: 8 }, // Level
  ];

  // ---- company / heading / report info (rows 1-3) ----
  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = report.coName;
  ws.getCell("A1").font = { name: "Times New Roman", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = { name: "Times New Roman", size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = report.reportInfo;
  ws.getCell("A3").font = { name: "Times New Roman", size: 8 };
  ws.getCell("A3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Account ID", "Account Name", "C.C", "Level"];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.fill = HEAD_FILL;
    cell.border = thin;
    cell.alignment = { horizontal: col === 4 ? "right" : "left" };
  });

  // ---- accounts (the name keeps its leading spaces = the level indent) ----
  for (const r of report.rows) {
    const row = ws.addRow([
      r.accountId,
      r.accountName,
      r.haveCC ? "Yes" : "",
      r.accountLevel,
    ]);
    const color = levelColor(r.accountLevel);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { color };
      cell.alignment = { horizontal: col === 4 ? "right" : "left" };
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
};