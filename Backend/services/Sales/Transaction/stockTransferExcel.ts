// services/Sales/Transaction/stockTransferExcel.ts
// The Stock Transfer report as an Excel file (same columns as the printed report:
// Sl.#, Item ID, Item Name, Unit, Qty., Unit Cost, Total Cost - and a Total row).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";
import { applyReportFont, levelFont, setPrintedFooter, thin } from "../../../utils/reportStyle.js";

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
    { width: 8 }, // Line
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
  ws.getCell("A1").font = levelFont("company", true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = heading;
  ws.getCell("A2").font = levelFont("heading", false);
  ws.getCell("A2").alignment = { horizontal: "center" };

  // a text "label : value" with the value in bold, as the print
  const labelled = (label: string, value: string): ExcelJS.CellRichTextValue => ({
    richText: [
      { text: `${label} : `, font: levelFont("body", false) },
      { text: value, font: levelFont("body", true) },
    ],
  });

  // ---- the same layout as the print: Branch at the left, Entry No. in the middle, Date at the right end - row 3 ----
  ws.mergeCells("A3:C3");
  ws.getCell("A3").value = labelled("Branch", header.fbrname);
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells("D3:F3");
  ws.getCell("D3").value = labelled("Entry No.", header.fdocno);
  ws.getCell("D3").alignment = { horizontal: "center" };

  ws.getCell("G3").value = labelled("Date", dmmy(header.fdate));
  ws.getCell("G3").alignment = { horizontal: "right" };

  // Transfer To under the Branch - row 4 (the print's TRANSFER_TO_SIDE is "left")
  ws.mergeCells("A4:G4");
  ws.getCell("A4").value = labelled("Transfer To", header.ftobrname);
  ws.getCell("A4").alignment = { horizontal: "left" };

  // the user and the time of the save ("Created By"), else of the print: bottom right of every printed page
  if (header.fsavedby) setPrintedFooter(ws, header.fsavedby, "classic", "Created By");
  else setPrintedFooter(ws, reportInfo);

  const headRow = 5;

  // ---- column labels ----
  const head = ws.getRow(headRow);
  head.values = ["Line", "Item ID", "Item Name", "Unit", "Qty.", "Unit Cost", "Total Cost"];
  head.eachCell((cell, col) => {
    cell.font = levelFont("columnHead", true);
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
    cell.alignment = { horizontal: "right" };
    if (col === 5) cell.numFmt = QTY_FORMAT;
    if (col === 7) cell.numFmt = COST_FORMAT;
  });

  // the note after the Total row, as in the print (always printed, empty when there is no note)
  const noteRow = ws.addRow([]);
  ws.mergeCells(noteRow.number, 1, noteRow.number, 7);
  noteRow.getCell(1).value = labelled("Note", header.fnote ?? "");
  noteRow.getCell(1).alignment = { horizontal: "left" };

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
