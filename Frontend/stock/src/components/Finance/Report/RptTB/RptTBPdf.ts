// RptTBPdf.ts
// The Trial Balance as a PDF (returned as a Blob; saveFile.ts saves it): the same layout as the printed report (RptTBRpt.ts) -
// A4 landscape, company name, heading, branch, two-line column header (repeated on every page), rows coloured by account level,
// "Total :" row at the end. "Page x of y" on a line of its own under the heading; "Printed : ..." at the bottom right (the stock
// look, common/reportPdf.ts).
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

import { amount, COL_WIDTHS, type PrintReport, type TBRow } from "./RptTBRpt";

type RGB = [number, number, number];

// same colours as the account tree (levels 1-3 are the bold groups)
const LEVEL_COLOR: Record<number, RGB> = {
  1: [0, 166, 62],
  2: [21, 93, 252],
  3: [200, 0, 222],
};
const DETAIL_COLOR: RGB = [49, 65, 88];

const PAGE_W = 297; // A4 landscape, mm

export const buildTrialBalancePdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const margin = pdfMargin(15);
  const usable = PAGE_W - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  // width of one space, to keep the A/C group indent (autoTable trims spaces)
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.pdfBody);
  const spaceW = doc.getTextWidth(" ");
  const PAD = REPORT_STYLE.pdf.cellPadding;

  const bodyRow = (r: TBRow): CellDef[] => {
    const color = LEVEL_COLOR[r.level] ?? DETAIL_COLOR;
    const fontStyle = r.level >= 1 && r.level <= 3 ? "bold" : "normal";
    const base = { textColor: color, fontStyle } as const;

    const indent = r.accountName.length - r.accountName.trimStart().length;

    return [
      { content: r.accountId, styles: base },
      {
        content: r.accountName.trim(),
        styles: {
          ...base,
          cellPadding: {
            top: PAD,
            bottom: PAD,
            right: STOCK_DOCUMENT_PDF.cellPaddingX,
            left: STOCK_DOCUMENT_PDF.cellPaddingX + indent * spaceW,
          },
        },
      },
      { content: amount(r.opening), styles: base },
      { content: amount(r.currentDr), styles: base },
      { content: amount(r.currentCr), styles: base },
      { content: amount(r.movement), styles: base },
      { content: amount(r.closing), styles: base },
    ];
  };

  const t = report.totals;
  const totalStyle = {
    fontStyle: "bold" as const,
    textColor: [0, 0, 0] as RGB,
    halign: "right" as const,
  };
  const totalRow: CellDef[] = [
    { content: "Total :", colSpan: 2, styles: totalStyle },
    { content: amount(t.opening), styles: totalStyle },
    { content: amount(t.currentDr), styles: totalStyle },
    { content: amount(t.currentCr), styles: totalStyle },
    { content: amount(t.movement), styles: totalStyle },
    { content: amount(t.closing), styles: totalStyle },
  ];

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // the stock look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
    ...(() => {
      const t = stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX);
      return { ...t, headStyles: { ...t.headStyles, valign: "bottom" as const } };
    })(),
    columnStyles: {
      0: { cellWidth: COL_WIDTHS[0] * usable },
      1: { cellWidth: COL_WIDTHS[1] * usable },
      2: { cellWidth: COL_WIDTHS[2] * usable, halign: "right" },
      3: { cellWidth: COL_WIDTHS[3] * usable, halign: "right" },
      4: { cellWidth: COL_WIDTHS[4] * usable, halign: "right" },
      5: { cellWidth: COL_WIDTHS[5] * usable, halign: "right" },
      6: { cellWidth: COL_WIDTHS[6] * usable, halign: "right" },
    },
    head: [
      [
        { content: "Account ID", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "Account Name", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "Opening", rowSpan: 2, styles: { halign: "right" } },
        { content: "Transactions", colSpan: 3, styles: { halign: "center" } },
        { content: "Closing", rowSpan: 2, styles: { halign: "right" } },
      ],
      [
        { content: "Debit", styles: { halign: "right" } },
        { content: "Credit", styles: { halign: "right" } },
        { content: "Movement", styles: { halign: "right" } },
      ],
    ],
    body: [...report.rows.map(bodyRow), totalRow],
    // company / heading / branch - drawn on every page
    didDrawPage: () => drawStockReportTitle(doc, PAGE_W, margin, { txtCoName: report.coName, txtHeading: report.heading }, report.branch, look),
  });

  // "Page x of y" on a line of its own under the heading, and "Printed : ..." at the bottom right of every page
  addStockDocumentPageNumbers(doc, look, {
    right: PAGE_W - margin.right,
    pageRight: PAGE_W - margin.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: margin.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: margin.bottom - 6,
    footer: `Printed : ${report.reportInfo}`,
  });

  return doc.output("blob");
};
