// services/Purchase/Report/rptStockAgeingExcel.ts
// The Stock Ageing report as an Excel file - the same layout as the printed report (the old rptStAgeingRpt):
// a flat list, Item ID / Item Name / Item Group / Unit / Stock / Unit Cost / the five age columns, in the order
// of the Item ID. No group headings and no totals. An item is one row: its stock is added up over all the
// branches asked for.
import ExcelJS from "exceljs";
import { addReportTitle, applyReportFont, thin } from "../../../utils/reportStyle.js";

import type { StockAgeingLine } from "./rptStockAgeingService.js";

export type StockAgeingReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" (one branch), "" (all branches)
  txtBranch: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  // the labels of the five age columns ("0-30 Days" ...)
  txtAgeLabels: string[];
  lines: StockAgeingLine[];
};

// the old report: the Stock and the age columns as #,#0 (whole numbers), the Unit Cost as #,#0.0000
const QTY_FORMAT = "#,##0";
const COST_FORMAT = "#,##0.0000";

const FIRST_NUMBER_COLUMN = 5; // Stock, Unit Cost and the age columns are numbers
const COST_COLUMN = 6;
const FIRST_AGE_COLUMN = 7;

export const buildStockAgeingWorkbook = async (report: StockAgeingReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stock Ageing", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 20 }, // Item ID
    { width: 34 }, // Item Name
    { width: 18 }, // Item Group
    { width: 8 }, // Unit
    { width: 12 }, // Stock
    { width: 14 }, // Unit Cost
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 }, // the five age columns
  ];

  // ---- company / heading / branch + report info (rows 1-3): the same on every report ----
  addReportTitle(ws, report, report.txtBranch, 11, 3);

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = [
    "Item ID",
    "Item Name",
    "Item Group",
    "Unit",
    "Stock",
    "Unit Cost",
    ...report.txtAgeLabels,
  ];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = {
      horizontal: col >= FIRST_AGE_COLUMN ? "center" : col >= FIRST_NUMBER_COLUMN ? "right" : "left",
      wrapText: true,
    };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  // ---- one row per item ----
  for (const line of report.lines) {
    const row = ws.addRow([
      line.lkpItemID,
      line.txtItemName,
      line.txtItemGroupName,
      line.txtUnit,
      line.txtStock,
      line.txtUnitCost,
      ...line.txtAge,
    ]);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.alignment = { horizontal: col >= FIRST_NUMBER_COLUMN ? "right" : "left" };
      if (col === COST_COLUMN) cell.numFmt = COST_FORMAT;
      else if (col >= FIRST_NUMBER_COLUMN) cell.numFmt = QTY_FORMAT;
    });
  }

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
