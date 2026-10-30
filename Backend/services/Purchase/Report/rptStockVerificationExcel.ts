// services/Purchase/Report/rptStockVerificationExcel.ts
// The Stock Verification report as an Excel file - the same layout as the printed report:
// Item ID / Item Name / Unit / Comp. Stock / Phys. Stock (an empty column for the counters), by item group,
// each group with its Total; with more than one branch one section per branch ("Branch : Jeddah", its item
// groups, "Branch Total :"); a Grand Total row closes the report.
import ExcelJS from "exceljs";
import { addReportTitle, applyReportFont, thin } from "../../../utils/reportStyle.js";

import type { StockVerificationBranch } from "./rptStockVerificationService.js";

export type StockVerificationReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" (one branch), "" (all branches)
  txtBranch: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  // one entry per branch
  branches: StockVerificationBranch[];
  totals: { txtStock: number };
};

// the Comp. Stock shows whole numbers without decimals and a fraction up to 3 decimals
const QTY_FORMAT = "#,##0.###";

const COLUMNS = 5;

export const buildStockVerificationWorkbook = async (
  report: StockVerificationReport
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stock Verification", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 20 }, // Item ID
    { width: 46 }, // Item Name
    { width: 8 }, // Unit
    { width: 16 }, // Comp. Stock
    { width: 16 }, // Phys. Stock
  ];

  // ---- company / heading / branch + report info (rows 1-3): the same on every report ----
  addReportTitle(ws, report, report.txtBranch, 5);

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Item ID", "Item Name", "Unit", "Comp. Stock", "Phys. Stock"];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= 4 ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  // a Total row: the label over the text columns, the Comp. Stock, and the empty Phys. Stock
  const addTotal = (label: string, stock: number) => {
    const total = ws.addRow([label, "", "", stock, ""]);
    ws.mergeCells(total.number, 1, total.number, 3);

    total.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
      if (col === 4) cell.numFmt = QTY_FORMAT;
    });
  };

  // the branch sections (with their Total) only when the report holds more than one branch
  const sections = report.branches.length > 1;

  for (const branch of report.branches) {
    if (sections) {
      const branchRow = ws.addRow([`Branch : ${branch.txtBranchName}`]);
      ws.mergeCells(branchRow.number, 1, branchRow.number, COLUMNS);
      branchRow.getCell(1).font = { bold: true };
      branchRow.getCell(1).alignment = { horizontal: "left" };
    }

    for (const group of branch.groups) {
      // ---- "Item Group : 01   Tiles" ----
      const groupRow = ws.addRow([`Item Group : ${group.lkpItemGroupID}   ${group.txtItemGroupName}`]);
      ws.mergeCells(groupRow.number, 1, groupRow.number, COLUMNS);
      groupRow.getCell(1).font = { bold: true };
      groupRow.getCell(1).alignment = { horizontal: "left" };

      // ---- one row per item: the books' quantity, and an empty box for the counted one ----
      for (const line of group.lines) {
        const row = ws.addRow([line.lkpItemID, line.txtItemName, line.txtUnit, line.txtStock, ""]);

        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.border = thin;
          cell.alignment = { horizontal: col >= 4 ? "right" : "left" };
          if (col === 4) cell.numFmt = QTY_FORMAT;
        });
      }

      // ---- the Total of the item group ----
      addTotal("Total :", group.totals.txtStock);
    }

    if (sections) addTotal("Branch Total :", branch.totals.txtStock);
  }

  // ---- the Grand Total row ----
  addTotal("Grand Total :", report.totals.txtStock);

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
