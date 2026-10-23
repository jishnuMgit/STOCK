// services/Purchase/Transaction/beginningStockExcel.ts
// The Beginning Stock report as an Excel file (same columns as the printed report:
// Sl.#, Item ID, Item Name, Unit, Qty., Unit Cost, Total Cost - and a Total row).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";

import type { BeginningStockPrint } from "./beginningStockService.js";

export type BeginningStockExcelReport = {
  report: BeginningStockPrint;
  heading: string;
  reportInfo: string;
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// DD-MMM-YYYY of a date the server holds as text (yyyy-mm-dd...) or as a Date
const dmmy = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date) {
    return `${String(value.getDate()).padStart(2, "0")}-${MONTHS[value.getMonth()]}-${value.getFullYear()}`;
  }

  const [year, month, day] = String(value).slice(0, 10).split("-");
  const monthName = MONTHS[Number(month) - 1];

  return monthName ? `${day}-${monthName}-${year}` : String(value);
};

const QTY_FORMAT = "#,##0.000";
const COST_FORMAT = "#,##0.0000";

export const buildBeginningStockWorkbook = async ({
  report,
  heading,
  reportInfo,
}: BeginningStockExcelReport): Promise<Buffer> => {
  const { header, lines } = report;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Beginning Stock", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:4",
    },
  });

  ws.columns = [
    { width: 8 }, // Sl.#
    { width: 18 }, // Item ID
    { width: 44 }, // Item Name
    { width: 10 }, // Unit
    { width: 14 }, // Qty.
    { width: 16 }, // Unit Cost
    { width: 18 }, // Total Cost
  ];

  // ---- company / heading (rows 1-2) ----
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = header.fconame;
  ws.getCell("A1").font = { name: "Times New Roman", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = heading;
  ws.getCell("A2").font = { name: "Times New Roman", size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  // ---- branch and date (left) and report info (right) - row 3 ----
  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = `Branch : ${header.fbrname}      Date : ${dmmy(header.fdate)}`;
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells("E3:G3");
  ws.getCell("E3").value = reportInfo;
  ws.getCell("E3").font = { name: "Times New Roman", size: 8 };
  ws.getCell("E3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Sl.#", "Item ID", "Item Name", "Unit", "Qty.", "Unit Cost", "Total Cost"];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.fill = HEAD_FILL;
    cell.border = thin;
    cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
  });

  // ---- the lines ----
  let totalQty = 0;
  let totalCost = 0;

  for (const line of lines) {
    const qty = Number(line.fqtyin);
    const cost = Number(line.ftotalcost);

    totalQty += qty;
    totalCost += cost;

    const row = ws.addRow([
      line.fslno,
      line.fitemid,
      line.fitemname ?? "",
      line.funit ?? "",
      qty,
      Number(line.funitcost),
      cost,
    ]);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
      if (col === 5) cell.numFmt = QTY_FORMAT;
      if (col >= 6) cell.numFmt = COST_FORMAT;
    });
  }

  // ---- the shaded Total row ----
  const total = ws.addRow(["Total :", "", "", "", totalQty, "", totalCost]);
  ws.mergeCells(total.number, 1, total.number, 4);
  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.border = thin;
    cell.fill = HEAD_FILL;
    cell.font = { bold: true };
    cell.alignment = { horizontal: col === 1 ? "left" : "right" };
    if (col === 5) cell.numFmt = QTY_FORMAT;
    if (col === 7) cell.numFmt = COST_FORMAT;
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
};
