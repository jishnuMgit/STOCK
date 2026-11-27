// RptGLPdf.ts
// The General Ledger as a PDF (returned as a Blob; saveFile.ts saves it): the same layout as the printed report (RptGLRpt.ts) -
// A4 landscape, company name, heading, branch, one block per account (each on a new page) with the column labels repeated on
// every page, a running balance and a "Total :" row. Page numbers restart for every account, like the VB report.
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

import { amount, COL_LABELS, COL_WIDTHS, type GLAccount, type PrintReport } from "./RptGLRpt";

const PAGE_W = 297; // A4 landscape, mm

export const buildGLPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const margin = pdfMargin(19);
  const usable = PAGE_W - margin.left - margin.right;
  // the account line is under the branch line: the table starts a line lower
  const ACCOUNT_LINE = 7;
  const tableTop = stockReportTableTop(margin) + ACCOUNT_LINE;

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> =
    {};
  COL_WIDTHS.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w * usable, ...(i >= 6 ? { halign: "right" as const } : {}) };
  });

  const tot = {
    halign: "right" as const,
    fontStyle: "bold" as const,
  };

  // the account being drawn: company / heading / branch / account are drawn on every page
  let current: GLAccount = report.accounts[0];

  const drawTitle = () => {
    drawStockReportTitle(doc, PAGE_W, margin, { txtCoName: report.coName, txtHeading: report.heading }, report.branch, look);

    // "Account : 1001   Cash": the id in bold, 11 px, under the branch line
    const y = margin.top + 22 + STOCK_DOCUMENT_PDF.spaceAfterHeading + REPORT_STYLE.pdf.titleGap + ACCOUNT_LINE - 1;
    const label = "Account : ";
    doc.setFontSize(look.size.pdfBody);
    doc.setFont(look.font, "normal");
    doc.text(label, margin.left, y);
    doc.setFont(look.font, "bold");
    doc.text(current.accountId, margin.left + doc.getTextWidth(label), y);
    doc.setFont(look.font, "normal");
    doc.text(current.accountName, margin.left + doc.getTextWidth(label) + doc.getTextWidth(current.accountId) + 3, y);
  };

  // first page and last page of every account (for the page numbers)
  const ranges: { start: number; end: number }[] = [];

  report.accounts.forEach((acc, index) => {
    current = acc;
    if (index > 0) doc.addPage(); // each account on a new page
    const start = doc.getNumberOfPages();

    const body: CellDef[][] = acc.rows.map((r) => [
      { content: r.date },
      { content: r.brId },
      { content: r.docType },
      { content: r.docNo },
      { content: r.description },
      { content: r.ccId },
      { content: amount(r.debit), styles: { halign: "right" as const } },
      { content: amount(r.credit), styles: { halign: "right" as const } },
      { content: r.balance, styles: { halign: "right" as const } },
    ]);
    body.push([
      { content: "Total :", colSpan: 6, styles: tot },
      { content: amount(acc.totalDebit), styles: tot },
      { content: amount(acc.totalCredit), styles: tot },
      { content: acc.balance, styles: tot },
    ]);

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
        COL_LABELS.map((label, i) => ({
          content: label,
          styles: { halign: i >= 6 ? ("right" as const) : ("left" as const) },
        })),
      ],
      body,
      didDrawPage: drawTitle,
    });

    ranges.push({ start, end: doc.getNumberOfPages() });
  });

  // "Page x of y" (restarting for every account) on a line of its own under the heading, and "Printed : ..." at the bottom right
  addStockDocumentPageNumbers(doc, look, {
    right: PAGE_W - margin.right,
    pageRight: PAGE_W - margin.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: margin.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: margin.bottom - 6,
    footer: `Printed : ${report.reportInfo}`,
    ranges,
  });

  return doc.output("blob");
};