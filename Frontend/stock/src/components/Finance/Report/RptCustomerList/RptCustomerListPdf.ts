// RptCustomerListPdf.ts
// The Customer List as a PDF (returned as a Blob; saveFile.ts saves it): the same layout as the printed report
// (RptCustomerListRpt.ts) - A4 landscape, company name, heading, then Customer ID / Name / Address / Contact / Phone / VAT No. /
// Credit Limit / Credit Days, coloured by account level. Column labels repeat on every page; "Page x of y" on a line of its own
// under the heading; "Printed : ..." at the bottom right (the stock look, common/reportPdf.ts).
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

import { money, whole, type PrintReport } from "./RptCustomerListRpt";

type RGB = [number, number, number];
const BLACK: RGB = [0, 0, 0];

// VB Detail_BeforePrint: level 1 red, 2 green, 3 blue, else black
const LEVEL_COLOR: Record<number, RGB> = {
  1: [255, 0, 0],
  2: [0, 128, 0],
  3: [0, 0, 255],
};

const PAGE_W = 297; // A4 landscape, mm

// same column proportions as the printed page
const COL_PCT = [10.5, 18, 14.5, 12.5, 10.5, 12.5, 11, 10.5];

const INDENT_PER_SPACE = 1.0; // mm: the leading spaces of the name become padding

export const buildCustomerListPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const margin = pdfMargin(15);
  const usable = PAGE_W - margin.left - margin.right;
  // this report has no branch line: the table starts higher
  const tableTop = stockReportTableTop(margin) - 4;

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = {};
  COL_PCT.forEach((p, i) => {
    columnStyles[i] = {
      cellWidth: (p / 100) * usable,
      ...(i >= 6 ? { halign: "right" as const } : {}),
    };
  });

  const body: CellDef[][] = report.rows.map((r) => {
    const color = LEVEL_COLOR[r.accountLevel] ?? BLACK;
    const lead = /^ */.exec(r.accountName)?.[0].length ?? 0;
    const base = { textColor: color };
    const right = { textColor: color, halign: "right" as const };

    return [
      { content: r.accountId, styles: base },
      {
        content: r.accountName.trimStart(),
        styles: {
          textColor: color,
          cellPadding: {
            top: REPORT_STYLE.pdf.cellPadding,
            bottom: REPORT_STYLE.pdf.cellPadding,
            right: STOCK_DOCUMENT_PDF.cellPaddingX,
            left: STOCK_DOCUMENT_PDF.cellPaddingX + lead * INDENT_PER_SPACE,
          },
        },
      },
      { content: r.address, styles: base },
      { content: r.contact, styles: base },
      { content: r.phone, styles: base },
      { content: r.vatNo, styles: base },
      { content: money(r.creditLimit), styles: right },
      { content: whole(r.creditDays), styles: right },
    ];
  });

  const labels = ["Customer ID", "Customer Name", "Address", "Contact", "Phone", "VAT No.", "Credit Limit", "Credit Days"];

  const look2 = stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX);

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    ...look2,
    // long addresses wrap, like the printed page
    styles: { ...look2.styles, overflow: "linebreak" as const },
    columnStyles,
    head: [
      labels.map((t, i) => ({
        content: t,
        styles: { halign: i >= 6 ? ("right" as const) : ("left" as const) },
      })),
    ] as CellDef[][],
    body,
    // company / heading - drawn on every page
    didDrawPage: () => drawStockReportTitle(doc, PAGE_W, margin, { txtCoName: report.coName, txtHeading: report.heading }, "", look),
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
