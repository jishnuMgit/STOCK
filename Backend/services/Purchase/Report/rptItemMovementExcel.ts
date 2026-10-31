// services/Purchase/Report/rptItemMovementExcel.ts
// The Item Movement report as an Excel file - the same layout as the printed report (the old rptItemMovementrpt and
// rptItemNonMovingrpt), A4 portrait:
//   Fast / Slow Moving  Item ID / Item Name / Item Group Name / Moved Qty. / Moved Value / Stock, and a Total row
//   Non Moving          Item ID / Item Name / Item Group / Stock (no total)
import ExcelJS from "exceljs";
import { addReportTitle, applyReportFont, thin } from "../../../utils/reportStyle.js";

import type { ItemMovementLine } from "./rptItemMovementService.js";

export type ItemMovementReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" (one branch), "" (all branches)
  txtBranch: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  // 0 Fast Moving, 1 Slow Moving, 2 Non Moving
  rdgItemMovement: 0 | 1 | 2;
  lines: ItemMovementLine[];
  totals: { txtMovedQty: number; txtMovedValue: number; txtStock: number };
};

// the old report: the quantities as #,#0 (whole numbers), the Moved Value as n2
const QTY_FORMAT = "#,##0";
const VALUE_FORMAT = "#,##0.00";

export const buildItemMovementWorkbook = async (report: ItemMovementReport): Promise<Buffer> => {
  const nonMoving = report.rdgItemMovement === 2;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Item Movement", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const columnCount = nonMoving ? 4 : 6;

  ws.columns = nonMoving
    ? [{ width: 22 }, { width: 40 }, { width: 22 }, { width: 14 }]
    : [{ width: 22 }, { width: 38 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 14 }];

  // ---- company / heading / branch + report info (rows 1-3): the same on every report ----
  addReportTitle(ws, report, report.txtBranch, columnCount, 2);

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = nonMoving
    ? ["Item ID", "Item Name", "Item Group", "Stock"]
    : ["Item ID", "Item Name", "Item Group Name", "Moved Qty.", "Moved Value", "Stock"];

  // the Stock (Non Moving) or the Moved Qty. onwards (Fast / Slow Moving) are numbers
  const firstNumberColumn = 4;

  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= firstNumberColumn ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  // ---- one row per item ----
  for (const line of report.lines) {
    const row = ws.addRow(
      nonMoving
        ? [line.lkpItemID, line.txtItemName, line.txtItemGroupName, line.txtStock]
        : [
            line.lkpItemID,
            line.txtItemName,
            line.txtItemGroupName,
            line.txtMovedQty,
            line.txtMovedValue,
            line.txtStock,
          ]
    );

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.alignment = { horizontal: col >= firstNumberColumn ? "right" : "left" };

      if (col >= firstNumberColumn) {
        cell.numFmt = !nonMoving && col === 5 ? VALUE_FORMAT : QTY_FORMAT;
      }
    });
  }

  // ---- the Total row (Fast / Slow Moving only) ----
  if (!nonMoving) {
    const total = ws.addRow([
      "Total :",
      "",
      "",
      report.totals.txtMovedQty,
      report.totals.txtMovedValue,
      report.totals.txtStock,
    ]);

    ws.mergeCells(total.number, 1, total.number, 3);

    total.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
      if (col >= 4) cell.numFmt = col === 5 ? VALUE_FORMAT : QTY_FORMAT;
    });
  }

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
