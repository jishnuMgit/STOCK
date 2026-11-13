import ExcelJS from "exceljs";
import type { ReceiptPrintData } from "../../receiptPrintService.js";
import { REPORT_FONT_SIZE, applyReportFont, font, thin } from "../../../utils/reportStyle.js";

const AMOUNT_FORMAT = "#,##0.00";

export const buildReceiptWorkbook = async (
  data: ReceiptPrintData,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Receipt", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 20 },
    { width: 52 },
    { width: 20 },
  ];

  ws.mergeCells("A1:C1");
  ws.getCell("A1").value = data.company.nameEn;
  ws.getCell("A1").font = font(REPORT_FONT_SIZE.company, true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:C2");
  ws.getCell("A2").value = data.company.nameAr;
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:C3");
  ws.getCell("A3").value = data.heading;
  ws.getCell("A3").font = font(REPORT_FONT_SIZE.heading, true);
  ws.getCell("A3").alignment = { horizontal: "center" };

  const details: [string, string][] = [
    ["Receipt No.", data.docNo],
    ["Date", data.date],
    ["Branch", data.branchId],
    ["FOP", data.fop],
    ["Received From", data.receivedFrom],
    ["Reference", data.reference],
    ["Currency", data.currency],
    ["Amount in Words", data.amountInWords],
    ["Note", data.note],
  ];

  for (const [label, value] of details) {
    const row = ws.addRow([label, value]);
    ws.mergeCells(row.number, 2, row.number, 3);
    row.getCell(1).font = { bold: true };
  }

  const head = ws.addRow(["Account ID", "Account Name / Description", "Credit Amount"]);
  head.eachCell((cell, column) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: column === 3 ? "right" : "left" };
  });
  ws.views = [{ state: "frozen", ySplit: head.number }];
  ws.pageSetup.printTitlesRow = `1:${head.number}`;

  for (const item of data.rows) {
    const row = ws.addRow([
      item.accountId,
      [item.accountName, item.description].filter(Boolean).join("\n"),
      item.amount,
    ]);
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.border = thin;
      cell.alignment = { vertical: "top", horizontal: column === 3 ? "right" : "left", wrapText: true };
      if (column === 3) cell.numFmt = AMOUNT_FORMAT;
    });
  }

  const total = ws.addRow(["", "Total:", data.total]);
  total.eachCell({ includeEmpty: true }, (cell, column) => {
    cell.border = thin;
    cell.font = { bold: true };
    cell.alignment = { horizontal: column === 3 ? "right" : "left" };
    if (column === 3) cell.numFmt = AMOUNT_FORMAT;
  });

  ws.addRow([]);
  ws.addRow(["Prepared By", data.preparedBy]);
  ws.addRow(["Prepared Date", data.preparedDate]);
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
