// services/Purchase/Report/rptSupplierPurchaseExcel.ts
// The Supplier Purchase report as an Excel file - the same layout as the printed report:
//   Summary  (the old rptSupplierPurchaseRpt): Date / Type / Document No. / Amount_FC / Amount, a block per
//            supplier ("Supplier : 70000   supplier1") with its Total;
//   Detailed (the old rptPIprint / rptPRprint): a block per document - its header, its item lines
//            (Sl / Item ID / Item Name / Unit / Qty / U Price (FC) / Tot. Price (FC) / Unit Price / Unit Cost /
//            Total Cost) and its Total.
import ExcelJS from "exceljs";
import { addReportTitle, applyReportFont, thin } from "../../../utils/reportStyle.js";

import type {
  SupplierPurchaseDocument,
  SupplierPurchaseSupplier,
} from "./rptSupplierPurchaseService.js";

type ReportCommon = {
  txtCoName: string;
  txtHeading: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
};

// rdgDetOrSum 1 = Summary
export type SupplierPurchaseSummaryReport = ReportCommon & {
  rdgDetOrSum: 1;
  // "Branch : X" (one branch), "" (all branches)
  txtBranch: string;
  suppliers: SupplierPurchaseSupplier[];
};

// rdgDetOrSum 0 = Detailed
export type SupplierPurchaseDetailedReport = ReportCommon & {
  rdgDetOrSum: 0;
  rdgDocType: "PI" | "PR";
  // "P. Invoice No." (PI) or "P. Entry No." (PR)
  txtPINoLabel: string;
  documents: SupplierPurchaseDocument[];
};

export type SupplierPurchaseReport = SupplierPurchaseSummaryReport | SupplierPurchaseDetailedReport;

// the old report: Amount_FC #,#0.0000, Amount n2, the quantity #,#0 (whole numbers)
const FC_FORMAT = "#,##0.0000";
const AMOUNT_FORMAT = "#,##0.00";
const QTY_FORMAT = "#,##0";

const boxed = (row: ExcelJS.Row, numberFrom: number, formats: Record<number, string> = {}) => {
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.border = thin;
    cell.alignment = { horizontal: col >= numberFrom ? "right" : "left" };
    if (formats[col]) cell.numFmt = formats[col];
  });
};

/* ---------------------------------------------------------
   Summary
--------------------------------------------------------- */

const buildSummary = (wb: ExcelJS.Workbook, report: SupplierPurchaseSummaryReport) => {
  const ws = wb.addWorksheet("Supplier Purchase", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [{ width: 14 }, { width: 10 }, { width: 22 }, { width: 18 }, { width: 18 }];

  addReportTitle(ws, report, report.txtBranch, 5);

  const head = ws.getRow(4);
  head.values = ["Date", "Type", "Document No.", "Amount_FC", "Amount"];
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= 4 ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  for (const supplier of report.suppliers) {
    // ---- "Supplier : 70000   supplier1" ----
    const heading = ws.addRow([`Supplier : ${supplier.lkpSupplierID}   ${supplier.txtSupplierName}`]);
    ws.mergeCells(heading.number, 1, heading.number, 5);
    heading.getCell(1).font = { bold: true };
    heading.getCell(1).alignment = { horizontal: "left" };

    for (const line of supplier.lines) {
      const row = ws.addRow([line.txtDate, line.txtDocType, line.txtDocNo, line.txtAmountFC, line.txtAmount]);
      boxed(row, 4, { 4: FC_FORMAT, 5: AMOUNT_FORMAT });
    }

    // ---- the Total of the supplier ----
    const total = ws.addRow(["Total :", "", "", supplier.totals.txtAmountFC, supplier.totals.txtAmount]);
    ws.mergeCells(total.number, 1, total.number, 3);
    boxed(total, 4, { 4: FC_FORMAT, 5: AMOUNT_FORMAT });
    total.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
    });
  }
  applyReportFont(ws);
};

/* ---------------------------------------------------------
   Detailed
--------------------------------------------------------- */

const buildDetailed = (wb: ExcelJS.Workbook, report: SupplierPurchaseDetailedReport) => {
  const ws = wb.addWorksheet("Supplier Purchase", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 6 }, // Sl
    { width: 20 }, // Item ID
    { width: 36 }, // Item Name
    { width: 8 }, // Unit
    { width: 10 }, // Qty
    { width: 14 }, // U Price (FC)
    { width: 16 }, // Tot. Price (FC)
    { width: 12 }, // Unit Price
    { width: 14 }, // Unit Cost
    { width: 16 }, // Total Cost
  ];

  addReportTitle(ws, report, "", 10);

  ws.views = [{ state: "frozen", ySplit: 3 }];
  ws.pageSetup.printTitlesRow = "1:3";

  // a row of texts in groups of columns: [text, first column, last column]
  const info = (cells: [string, number, number][]) => {
    const row = ws.addRow([]);
    for (const [value, from, to] of cells) {
      ws.mergeCells(row.number, from, row.number, to);
      row.getCell(from).value = value;
      row.getCell(from).alignment = { horizontal: "left" };
    }
    return row;
  };

  for (const doc of report.documents) {
    ws.addRow([]);

    // ---- the header of the document ----
    info([
      [`Branch : ${doc.txtBranchName}`, 1, 3],
      [`Entry No. : ${doc.txtDocNo}`, 4, 7],
      [`Date : ${doc.txtDate}`, 8, 10],
    ]);
    info([
      [`Supplier : ${doc.lkpSupplierID}   ${doc.txtSupplierName}`, 1, 3],
      [`${report.txtPINoLabel} : ${doc.txtPINo}`, 4, 7],
      [`Supplier Amt. : ${doc.txtSupplierAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 8, 10],
    ]);
    info([
      [`Currency : ${doc.txtCurrency}`, 1, 3],
      [`P.O. No. : ${doc.txtPONo}`, 4, 7],
      [`Currency Rate : ${doc.txtCurrencyRate}`, 8, 10],
    ]);

    // ---- the column labels ----
    const head = ws.addRow([
      "Sl. #", "Item ID", "Item Name", "Unit", "Qty.",
      "U Price (FC)", "Tot. Price(FC)", "Unit Price", "Unit Cost", "Total Cost",
    ]);
    head.eachCell((cell, col) => {
      cell.font = { bold: true };
      cell.border = thin;
      cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
    });

    // ---- one row per item line ----
    for (const l of doc.lines) {
      const row = ws.addRow([
        l.txtSlNo, l.lkpItemID, l.txtItemName, l.txtUnit, l.txtQty,
        l.txtUnitPriceFC, l.txtTotalPriceFC, l.txtUnitPrice, l.txtUnitCost, l.txtTotalCost,
      ]);
      boxed(row, 5, { 5: QTY_FORMAT, 6: FC_FORMAT, 7: FC_FORMAT, 8: AMOUNT_FORMAT, 9: FC_FORMAT, 10: FC_FORMAT });
    }

    // ---- the Total of the document ----
    const total = ws.addRow(["Total :", "", "", "", doc.totals.txtQty, "", doc.totals.txtTotalPriceFC, "", "", doc.totals.txtTotalCost]);
    ws.mergeCells(total.number, 1, total.number, 4);
    boxed(total, 5, { 5: QTY_FORMAT, 7: FC_FORMAT, 10: FC_FORMAT });
    total.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
    });

    // ---- the discount and the note ----
    info([
      [`Disc. Amt.(FC) : ${doc.txtDiscAmtFC.toFixed(4)}`, 1, 4],
      [`Disc. Amt. : ${doc.txtDiscAmt.toFixed(2)}`, 5, 10],
    ]);
    info([[`Note : ${doc.txtNote}`, 1, 10]]);
  }
  applyReportFont(ws);
};

export const buildSupplierPurchaseWorkbook = async (report: SupplierPurchaseReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();

  if (report.rdgDetOrSum === 1) buildSummary(wb, report);
  else buildDetailed(wb, report);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
