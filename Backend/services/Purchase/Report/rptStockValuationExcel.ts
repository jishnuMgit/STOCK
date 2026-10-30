// services/Purchase/Report/rptStockValuationExcel.ts
// The Stock Valuation report as an Excel file - the same layout as the printed report:
// Item ID / Item Name / Item Group / Unit / Stock / Unit Cost / Stock Value.
// With more than one branch the report has one section per branch ("Branch : Jeddah", its items and
// its Total, then the next branch ...); a Grand Total row closes it.
import ExcelJS from "exceljs";
import { addReportTitle, applyReportFont, thin } from "../../../utils/reportStyle.js";

import type { StockValuationBranch } from "./rptStockValuationService.js";

export type StockValuationReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" (one branch), "Branch : X, Y" (selected branches), "" (all branches)
  txtBranch: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  // one entry per branch, in the order of the Branch screen
  branches: StockValuationBranch[];
  totals: { txtStock: number; txtStockValue: number };
};

// the stock shows whole numbers without decimals and a fraction up to 3 decimals;
// the Unit Cost and the Stock Value show 4 decimals (the old #,#0.0000 and n4)
const QTY_FORMAT = "#,##0.###";
const AMOUNT_FORMAT = "#,##0.0000";

const COLUMNS = 7;

export const buildStockValuationWorkbook = async (
  report: StockValuationReport
): Promise<Buffer> => {
  // the branch sections (with their Total) only when there is more than one branch
  const sections = report.branches.length > 1;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stock Valuation", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 18 }, // Item ID
    { width: 40 }, // Item Name
    { width: 22 }, // Item Group
    { width: 8 }, // Unit
    { width: 14 }, // Stock
    { width: 16 }, // Unit Cost
    { width: 18 }, // Stock Value
  ];

  // ---- company / heading / branch + report info (rows 1-3): the same on every report ----
  addReportTitle(ws, report, report.txtBranch, 7);

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Item ID", "Item Name", "Item Group", "Unit", "Stock", "Unit Cost", "Stock Value"];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  // a Total row: the label over the text columns, then the Stock and the Stock Value
  const addTotal = (label: string, stock: number, value: number) => {
    const total = ws.addRow([label, "", "", "", stock, "", value]);
    ws.mergeCells(total.number, 1, total.number, 4);

    total.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
      if (col === 5) cell.numFmt = QTY_FORMAT;
      if (col === COLUMNS) cell.numFmt = AMOUNT_FORMAT;
    });
  };

  for (const branch of report.branches) {
    // ---- "Branch : Jeddah" ----
    if (sections) {
      const branchRow = ws.addRow([`Branch : ${branch.txtBranchName}`]);
      ws.mergeCells(branchRow.number, 1, branchRow.number, COLUMNS);
      branchRow.getCell(1).font = { bold: true };
      branchRow.getCell(1).alignment = { horizontal: "left" };
    }

    // ---- one row per item ----
    for (const line of branch.lines) {
      const row = ws.addRow([
        line.lkpItemID,
        line.txtItemName,
        line.txtItemGroupName,
        line.txtUnit,
        line.txtStock,
        line.txtUnitCost,
        line.txtStockValue,
      ]);

      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = thin;
        cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
        if (col === 5) cell.numFmt = QTY_FORMAT;
        if (col >= 6) cell.numFmt = AMOUNT_FORMAT;
      });
    }

    // ---- the Total of the branch ----
    if (sections) addTotal("Total :", branch.totals.txtStock, branch.totals.txtStockValue);
  }

  // ---- the Grand Total row ----
  addTotal("Grand Total :", report.totals.txtStock, report.totals.txtStockValue);

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
