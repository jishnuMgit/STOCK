// reportPdf.ts
// The parts every PDF report has in common - the table style, the title on every page and "Page x of y" - built
// from components/common/reportStyle.ts, so that the look of all the PDFs is changed in that one file.
import type { jsPDF } from "jspdf";

import { REPORT_STYLE } from "./reportStyle";

export type RGB = [number, number, number];

export const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export const PDF_BLACK: RGB = [0, 0, 0];

export type PdfMargin = { top: number; right: number; bottom: number; left: number };

// the margins of a page: the top, right and bottom are the same on every report, the left is the report's own
export const pdfMargin = (left: number): PdfMargin => ({ ...REPORT_STYLE.pdf.margin, left });

// where the table starts: below the company, the heading and the branch line
export const pdfTableTop = (margin: PdfMargin) => margin.top + REPORT_STYLE.pdf.headerHeight;

// the `styles` of jspdf-autotable: the font, its size, the padding, the thin light lines
export const pdfTableStyles = () => ({
  font: REPORT_STYLE.pdfFont,
  fontSize: REPORT_STYLE.size.pdfBody,
  cellPadding: REPORT_STYLE.pdf.cellPadding,
  lineColor: hexToRgb(REPORT_STYLE.lineColor),
  lineWidth: REPORT_STYLE.pdf.lineWidth,
  minCellHeight: REPORT_STYLE.pdf.minCellHeight,
  valign: "middle" as const,
  overflow: "linebreak" as const,
  textColor: PDF_BLACK,
});

type TitleText = { txtCoName: string; txtHeading: string; txtReportInfo: string };

// the company, the heading, the branch (left) and the report info (right) - drawn at the top of every page
export const drawReportTitle = (
  doc: jsPDF,
  pageW: number,
  margin: PdfMargin,
  report: TitleText,
  branch: string
) => {
  const { pdfFont, size } = REPORT_STYLE;

  doc.setTextColor(0, 0, 0);
  doc.setFont(pdfFont, "normal");

  doc.setFontSize(size.company);
  doc.text(report.txtCoName, pageW / 2, margin.top + 8, { align: "center" });

  doc.setFontSize(size.heading);
  doc.text(report.txtHeading, pageW / 2, margin.top + 15, { align: "center" });

  doc.setFontSize(size.pdfBody);
  if (branch) doc.text(branch, margin.left, margin.top + 22);

  doc.setFontSize(size.small);
  doc.text(report.txtReportInfo, pageW - margin.right, margin.top + 22, { align: "right" });
};

// "Page x of y" top right of every page - it needs the final page count, so it is added at the end
export const addPageNumbers = (doc: jsPDF, pageW: number, margin: PdfMargin) => {
  const pages = doc.getNumberOfPages();

  doc.setFont(REPORT_STYLE.pdfFont, "normal");
  doc.setFontSize(REPORT_STYLE.size.small);
  doc.setTextColor(0, 0, 0);

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, pageW - margin.right, margin.top, { align: "right" });
  }
};
