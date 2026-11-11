// services/ZATCA/Report/zatcaDocumentStatusExcel.ts
// The ZATCA Document Status report as an Excel file (same columns as the printed
// report: Sl.#, Br. ID, Type, Doc. No., Doc. Date, Doc. Issue Time, Submission Time,
// Customer ID, Customer Name, the three amounts - and a Total row).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";

import type { ZatcaDocStatusResult } from "./zatcaDocumentStatusService.js";

export type ZatcaDocStatusExcelReport = {
  report: ZatcaDocStatusResult;
  coName: string;
  heading: string;
  branchLabel: string; // "" for All Branch
  reportInfo: string;
};

// same design as the Item History Excel file: Times New Roman, light-blue borders
const FONT = "Times New Roman";
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
const font = (size: number, bold = false) => ({ name: FONT, size, bold });

const AMOUNT_FORMAT = "#,##0.00";
const LAST_COL = 12; // L

export const buildZatcaDocumentStatusWorkbook = async ({
  report,
  coName,
  heading,
  branchLabel,
  reportInfo,
}: ZatcaDocStatusExcelReport): Promise<Buffer> => {
  const { rows, totals } = report;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ZATCA Document Status", {
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
    { width: 6 }, // Sl.#
    { width: 8 }, // Br. ID
    { width: 8 }, // Type
    { width: 16 }, // Doc. No.
    { width: 12 }, // Doc. Date
    { width: 20 }, // Doc. Issue Time
    { width: 20 }, // Submission Time
    { width: 14 }, // Customer ID
    { width: 36 }, // Customer Name
    { width: 16 }, // Amount Excl. VAT
    { width: 12 }, // VAT Amt.
    { width: 16 }, // Amount Incl. VAT
  ];

  // ---- company / heading (rows 1-2) ----
  ws.mergeCells(1, 1, 1, LAST_COL);
  ws.getCell("A1").value = coName;
  ws.getCell("A1").font = font(14, true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(2, 1, 2, LAST_COL);
  ws.getCell("A2").value = heading;
  ws.getCell("A2").font = font(12);
  ws.getCell("A2").alignment = { horizontal: "center" };

  // ---- branch (left) and report info (right) - row 3 ----
  ws.mergeCells(3, 1, 3, 6);
  ws.getCell("A3").value = branchLabel;
  ws.getCell("A3").font = font(9);
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells(3, 7, 3, LAST_COL);
  ws.getCell("G3").value = reportInfo;
  ws.getCell("G3").font = font(8);
  ws.getCell("G3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = [
    "Sl.#",
    "Br. ID",
    "Type",
    "Doc. No.",
    "Doc. Date",
    "Doc. Issue Time",
    "Submission Time",
    "Customer ID",
    "Customer Name",
    "Amount Excl. VAT",
    "VAT Amt.",
    "Amount Incl. VAT",
  ];
  head.eachCell((cell, col) => {
    cell.font = font(9, true);
    cell.fill = HEAD_FILL;
    cell.border = thin;
    cell.alignment = { horizontal: col >= 10 ? "right" : "left" };
  });

  // ---- the lines (Sl.# counts only the rows that carry a document no.) ----
  let slNo = 0;

  for (const r of rows) {
    if (r.docNo) slNo += 1;

    const row = ws.addRow([
      r.docNo ? slNo : "",
      r.branchId,
      r.docType,
      r.docNo,
      r.docDate,
      r.issueTime,
      r.submitTime,
      r.customerId,
      r.customerName,
      r.amountExVat,
      r.vatAmount,
      r.amountInVat,
    ]);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = font(9);
      cell.border = thin;
      cell.alignment = { horizontal: col >= 10 ? "right" : "left" };
      if (col >= 10) cell.numFmt = AMOUNT_FORMAT;
    });
  }

  // ---- the Total row ----
  const total = ws.addRow([
    "Total :",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totals.amountExVat,
    totals.vatAmount,
    totals.amountInVat,
  ]);
  ws.mergeCells(total.number, 1, total.number, 9);
  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.border = thin;
    cell.font = font(9, true);
    cell.alignment = { horizontal: col === 1 ? "left" : "right" };
    if (col >= 10) cell.numFmt = AMOUNT_FORMAT;
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
};
