// services/Sales/Transaction/stockAdjustmentExcel.ts
// The Stock Adjustment report as an Excel file (same columns as the printed report:
// Sl.#, Item ID, Item Name, Unit, Qty. In, Qty. Out, Unit Cost, Total Cost - and a
// Total row).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";

import type { StockAdjustmentPrint } from "./stockAdjustmentService.js";

export type StockAdjustmentExcelReport = {
  report: StockAdjustmentPrint;
  heading: string;
  reportInfo: string;
};

const BORDER_COLOR = { argb: "FFC7D1E4" };
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

export const buildStockAdjustmentWorkbook = async ({
  report,
  heading,
  reportInfo,
}: StockAdjustmentExcelReport): Promise<Buffer> => {
  const { header, lines } = report;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stock Adjustment", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 8 }, // Sl.#
    { width: 18 }, // Item ID
    { width: 44 }, // Item Name
    { width: 10 }, // Unit
    { width: 14 }, // Qty. In
    { width: 14 }, // Qty. Out
    { width: 16 }, // Unit Cost
    { width: 18 }, // Total Cost
  ];

  // ---- company / heading (rows 1-2) ----
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = header.fconame;
  ws.getCell("A1").font = { name: "Times New Roman", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = heading;
  ws.getCell("A2").font = { name: "Times New Roman", size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  // ---- branch (left) and report info (right) - row 3 ----
  ws.mergeCells("A3:E3");
  ws.getCell("A3").value = `Branch : ${header.fbrname}`;
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells("F3:H3");
  ws.getCell("F3").value = reportInfo;
  ws.getCell("F3").font = { name: "Times New Roman", size: 8 };
  ws.getCell("F3").alignment = { horizontal: "right" };

  // ---- entry no. / date - row 4, and the note when there is one - row 5 ----
  ws.mergeCells("A4:H4");
  ws.getCell("A4").value = `Entry No. : ${header.fdocno}      Date : ${dmmy(header.fdate)}`;
  ws.getCell("A4").alignment = { horizontal: "left" };

  let headRow = 5;

  if (header.fnote) {
    ws.mergeCells("A5:H5");
    ws.getCell("A5").value = `Note : ${header.fnote}`;
    ws.getCell("A5").alignment = { horizontal: "left" };
    headRow = 6;
  }

  // ---- column labels ----
  const head = ws.getRow(headRow);
  head.values = [
    "Sl.#",
    "Item ID",
    "Item Name",
    "Unit",
    "Qty. In",
    "Qty. Out",
    "Unit Cost",
    "Total Cost",
  ];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: headRow }];
  ws.pageSetup.printTitlesRow = `1:${headRow}`;

  // ---- the lines ----
  let totalQtyIn = 0;
  let totalQtyOut = 0;
  let totalCost = 0;

  for (const line of lines) {
    const qtyIn = Number(line.fqtyin);
    const qtyOut = Number(line.fqtyout);
    const cost = Number(line.ftotalcost);

    totalQtyIn += qtyIn;
    totalQtyOut += qtyOut;
    totalCost += cost;

    const row = ws.addRow([
      line.fslno,
      line.fitemid,
      line.fitemname ?? "",
      line.funit ?? "",
      qtyIn,
      qtyOut,
      Number(line.funitcost),
      cost,
    ]);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
      if (col === 5 || col === 6) cell.numFmt = QTY_FORMAT;
      if (col >= 7) cell.numFmt = COST_FORMAT;
    });
  }

  // ---- the shaded Total row ----
  const total = ws.addRow(["Total :", "", "", "", totalQtyIn, totalQtyOut, "", totalCost]);
  ws.mergeCells(total.number, 1, total.number, 4);
  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.border = thin;
    cell.font = { bold: true };
    cell.alignment = { horizontal: col === 1 ? "left" : "right" };
    if (col === 5 || col === 6) cell.numFmt = QTY_FORMAT;
    if (col === 8) cell.numFmt = COST_FORMAT;
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
};
