// services/Sales/Transaction/stockTransferExcel.ts
// The Stock Transfer report as an Excel file (same columns as the printed report:
// Sl.#, Item ID, Item Name, Unit, Qty., Unit Cost, Total Cost - and a Total row).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";
import { REPORT_FONT_SIZE, applyReportFont, font, thin } from "../../../utils/reportStyle.js";

import type { StockTransferPrint } from "./stockTransferService.js";

export type StockTransferExcelReport = {
  report: StockTransferPrint;
  heading: string;
  reportInfo: string;
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

export const buildStockTransferWorkbook = async ({
  report,
  heading,
  reportInfo,
}: StockTransferExcelReport): Promise<Buffer> => {
  const { header, lines } = report;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stock Transfer", {
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
    { width: 14 }, // Qty.
    { width: 16 }, // Unit Cost
    { width: 18 }, // Total Cost
  ];

  // ---- company / heading (rows 1-2) ----
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = header.fconame;
  ws.getCell("A1").font = font(REPORT_FONT_SIZE.company, true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = heading;
  ws.getCell("A2").font = font(REPORT_FONT_SIZE.heading);
  ws.getCell("A2").alignment = { horizontal: "center" };

  // ---- branch / transfer to (left) and report info (right) - row 3 ----
  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = `Branch : ${header.fbrname}      Transfer To : ${header.ftobrname}`;
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells("E3:G3");
  ws.getCell("E3").value = reportInfo;
  ws.getCell("E3").font = font(REPORT_FONT_SIZE.small);
  ws.getCell("E3").alignment = { horizontal: "right" };

  // ---- entry no. / date - row 4, and the note when there is one - row 5 ----
  ws.mergeCells("A4:G4");
  ws.getCell("A4").value = `Entry No. : ${header.fdocno}      Date : ${dmmy(header.fdate)}`;
  ws.getCell("A4").alignment = { horizontal: "left" };

  let headRow = 5;

  if (header.fnote) {
    ws.mergeCells("A5:G5");
    ws.getCell("A5").value = `Note : ${header.fnote}`;
    ws.getCell("A5").alignment = { horizontal: "left" };
    headRow = 6;
  }

  // ---- column labels ----
  const head = ws.getRow(headRow);
  head.values = ["Sl.#", "Item ID", "Item Name", "Unit", "Qty.", "Unit Cost", "Total Cost"];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: headRow }];
  ws.pageSetup.printTitlesRow = `1:${headRow}`;

  // ---- the lines ----
  let totalQty = 0;
  let totalCost = 0;

  for (const line of lines) {
    const qty = Number(line.fqtyout);
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
    cell.font = { bold: true };
    cell.alignment = { horizontal: col === 1 ? "left" : "right" };
    if (col === 5) cell.numFmt = QTY_FORMAT;
    if (col === 7) cell.numFmt = COST_FORMAT;
  });

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
