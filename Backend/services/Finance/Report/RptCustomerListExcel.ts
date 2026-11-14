// services/Finance/Report/RptCustomerListExcel.ts
// The Customer List as an Excel file (same columns as the printed report,
// coloured by account level).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";
import { applyReportFont, levelFont, setPrintedFooter, thin } from "../../../utils/reportStyle.js";
import type { ReportRow } from "./RptCustomerListService.js";

export type CustomerListReport = {
  coName: string;
  heading: string;
  reportInfo: string;
  rows: ReportRow[];
};

// VB Detail_BeforePrint: level 1 red, 2 green, 3 blue, else black
const levelColor = (level: number) =>
  level === 1
    ? { argb: "FFFF0000" }
    : level === 2
      ? { argb: "FF008000" }
      : level === 3
        ? { argb: "FF0000FF" }
        : { argb: "FF000000" };

const MONEY = "#,##0.00";
const WHOLE = "#,##0";

export const buildCustomerListWorkbook = async (
  report: CustomerListReport,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Customer List", {
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
    { width: 14 }, // Customer ID
    { width: 40 }, // Customer Name
    { width: 34 }, // Address
    { width: 24 }, // Contact
    { width: 18 }, // Phone
    { width: 18 }, // VAT No.
    { width: 14 }, // Credit Limit
    { width: 13 }, // Credit Days
  ];

  // ---- company / heading / report info (rows 1-3) ----
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = report.coName;
  ws.getCell("A1").font = levelFont("company", false, "inter");
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = levelFont("heading", false, "inter");
  ws.getCell("A2").alignment = { horizontal: "center" };

  // the user and the time: bottom right of every printed page
  setPrintedFooter(ws, report.reportInfo, "inter");

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = [
    "Customer ID",
    "Customer Name",
    "Address",
    "Contact",
    "Phone",
    "VAT No.",
    "Credit Limit",
    "Credit Days",
  ];
  head.eachCell((cell, col) => {
    cell.font = levelFont("columnHead", true, "inter");
    cell.border = thin;
    cell.alignment = { horizontal: col >= 7 ? "right" : "left" };
  });

  // ---- customers (the name keeps its leading spaces = the level 4 indent) ----
  for (const r of report.rows) {
    const row = ws.addRow([
      r.accountId,
      r.accountName,
      r.address,
      r.contact,
      r.phone,
      r.vatNo,
      r.creditLimit,
      r.creditDays,
    ]);
    const color = levelColor(r.accountLevel);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { color };
      cell.alignment = {
        horizontal: col >= 7 ? "right" : "left",
        vertical: "middle",
        wrapText: col === 3, // long addresses wrap
      };
    });
    row.getCell(7).numFmt = MONEY;
    row.getCell(8).numFmt = WHOLE;
  }

  // the whole sheet in the report font (a cell keeps its own size, bold and colour)
  applyReportFont(ws, "inter");

  return Buffer.from(await wb.xlsx.writeBuffer());
};
