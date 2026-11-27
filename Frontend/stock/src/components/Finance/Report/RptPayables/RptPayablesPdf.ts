// RptPayablesPdf.ts
// The Payables report as a PDF (returned as a Blob; saveFile.ts saves it): the same layout as the printed report (RptPayablesRpt.ts) -
// A4 portrait, company name, heading, branch, column labels repeated on every page and a "Total :" row at the end.
// "Page x of y" on a line of its own under the heading; "Printed : ..." at the bottom right (the stock look, common/reportPdf.ts).
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  STOCK_DOCUMENT_PDF,
  addStockDocumentPageNumbers,
  drawStockReportTitle,
  pdfMargin,
  registerReportPdfFont,
  stockDocumentTable,
  stockReportTableTop,
} from "../../../common/reportPdf";
import { REPORT_STYLE } from "../../../common/reportStyle";

import { amount, COL_WIDTHS, type PrintReport } from "./RptPayablesRpt";

export const buildPayablesPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(25.4);
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const tot = { halign: "right" as const, fontStyle: "bold" as const };

  const body: CellDef[][] = report.rows.map((r) => [
    { content: r.accountId },
    { content: r.accountName },
    { content: amount(r.debit), styles: { halign: "right" as const } },
    { content: amount(r.credit), styles: { halign: "right" as const } },
  ]);
  body.push([
    { content: "Total :", colSpan: 2, styles: tot },
    { content: amount(report.totalDebit), styles: tot },
    { content: amount(report.totalCredit), styles: tot },
  ]);

  const columnStyles: Record<number, { cellWidth: number }> = {};
  COL_WIDTHS.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w * usable };
  });

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // the stock look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
    ...stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX),
    columnStyles,
    head: [
      [
        { content: "Account ID", styles: { halign: "left" } },
        { content: "Account Name", styles: { halign: "left" } },
        { content: "Debit", styles: { halign: "right" } },
        { content: "Credit", styles: { halign: "right" } },
      ],
    ],
    body,
    // company / heading / branch - drawn on every page
    didDrawPage: () => drawStockReportTitle(doc, pageW, margin, { txtCoName: report.coName, txtHeading: report.heading }, report.branch, look),
  });

  // "Page x of y" on a line of its own under the heading, and "Printed : ..." at the bottom right of every page
  addStockDocumentPageNumbers(doc, look, {
    right: pageW - margin.right,
    pageRight: pageW - margin.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: margin.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: margin.bottom - 6,
    footer: `Printed : ${report.reportInfo}`,
  });

  return doc.output("blob");
};
