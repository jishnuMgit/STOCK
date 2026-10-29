// services/Purchase/Report/rptItemPurchaseExcel.ts
// The Item Purchase report as an Excel file - the same layout as the printed report (the old rptItemPurchaseRpt):
// Date / Type / Document No. / P.I. No. / Qty. / Unit Price / Supplier, a block per item ("Item : 0001   o1item1")
// with its Total (the Qty).
import ExcelJS from "exceljs";

import type { ItemPurchaseItem } from "./rptItemPurchaseService.js";

export type ItemPurchaseReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" (one branch), "" (all branches)
  txtBranch: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  items: ItemPurchaseItem[];
};

const BORDER_COLOR = { argb: "FFC7D1E4" };
const thin = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
};

// the old report: the Qty #,#0 (whole numbers), the Unit Price n2
const QTY_FORMAT = "#,##0";
const PRICE_FORMAT = "#,##0.00";

const font = (size: number, bold = false) => ({ name: "Times New Roman", size, bold });

const COLUMNS = 7;
const QTY_COLUMN = 5;
const PRICE_COLUMN = 6;

export const buildItemPurchaseWorkbook = async (report: ItemPurchaseReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Item Purchase", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 12 }, // Date
    { width: 8 }, // Type
    { width: 18 }, // Document No.
    { width: 16 }, // P.I. No.
    { width: 12 }, // Qty.
    { width: 14 }, // Unit Price
    { width: 34 }, // Supplier
  ];

  // ---- company / heading / branch + report info (rows 1-3) ----
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = report.txtCoName;
  ws.getCell("A1").font = font(14, true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = report.txtHeading;
  ws.getCell("A2").font = font(12);
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:C3");
  ws.getCell("A3").value = report.txtBranch;
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells("D3:G3");
  ws.getCell("D3").value = report.txtReportInfo;
  ws.getCell("D3").font = font(8);
  ws.getCell("D3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Date", "Type", "Document No.", "P.I. No.", "Qty.", "Unit Price", "Supplier"];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col === QTY_COLUMN || col === PRICE_COLUMN ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  for (const item of report.items) {
    // ---- "Item : 0001   o1item1" ----
    const heading = ws.addRow([`Item : ${item.lkpItemID}   ${item.txtItemName}`]);
    ws.mergeCells(heading.number, 1, heading.number, COLUMNS);
    heading.getCell(1).font = { bold: true };
    heading.getCell(1).alignment = { horizontal: "left" };

    for (const l of item.lines) {
      const row = ws.addRow([l.txtDate, l.txtDocType, l.txtDocNo, l.txtPINo, l.txtQty, l.txtUnitPrice, l.txtSupplierName]);

      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = thin;
        cell.alignment = { horizontal: col === QTY_COLUMN || col === PRICE_COLUMN ? "right" : "left" };
        if (col === QTY_COLUMN) cell.numFmt = QTY_FORMAT;
        if (col === PRICE_COLUMN) cell.numFmt = PRICE_FORMAT;
      });
    }

    // ---- the Total of the item (the Qty) ----
    const total = ws.addRow(["Total :", "", "", "", item.totals.txtQty, "", ""]);
    ws.mergeCells(total.number, 1, total.number, 4);
    total.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { bold: true };
      cell.alignment = { horizontal: col === 1 || col === QTY_COLUMN ? "right" : "left" };
      if (col === QTY_COLUMN) cell.numFmt = QTY_FORMAT;
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
};
