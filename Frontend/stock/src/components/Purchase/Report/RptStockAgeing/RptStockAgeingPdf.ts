// RptStockAgeingPdf.ts
// The Stock Ageing report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 landscape, a flat list in the order of the Item ID (no group headings, no totals) - the old rptStAgeingRpt.
//   An item is one row: its stock added up over all the branches asked for.
// Column labels repeat on every page; "Page x of y" on a line of its own under the heading; the company, the heading
// and the branch at the top of every page; "Printed : ..." at the bottom right (the stock look, common/reportPdf.ts).
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

import {
  COLUMN_WEIGHTS,
  FIRST_AGE_COLUMN,
  FIRST_NUMBER_COLUMN,
  formatCost,
  formatQty,
  type PrintReport,
} from "./RptStockAgeingRpt";

export const buildStockAgeingPdf = async (report: PrintReport): Promise<Blob> => {

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 297;
  const margin = pdfMargin(12);
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const right = { halign: "right" as const };

  // Item ID | Item Name | Item Group | Unit | Stock | Unit Cost | the five age columns
  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COLUMN_WEIGHTS.map((w, i) => [
      i,
      { cellWidth: w * usable, ...(i >= FIRST_NUMBER_COLUMN ? right : {}) },
    ])
  );

  const head: CellDef[][] = [
    ["Item ID", "Item Name", "Item Group", "Unit", "Stock", "Unit Cost", ...report.txtAgeLabels].map(
      (content, i) => ({
        content,
        styles: {
          halign:
            i >= FIRST_AGE_COLUMN
              ? ("center" as const)
              : i >= FIRST_NUMBER_COLUMN
                ? ("right" as const)
                : ("left" as const),
        },
      })
    ),
  ];

  const body: CellDef[][] = report.lines.map((l) => [
    { content: l.lkpItemID },
    { content: l.txtItemName },
    { content: l.txtItemGroupName },
    { content: l.txtUnit },
    { content: formatQty(l.txtStock), styles: right },
    { content: formatCost(l.txtUnitCost), styles: right },
    ...l.txtAge.map((v) => ({ content: formatQty(v), styles: right })),
  ]);

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawStockReportTitle(doc, pageW, margin, report, report.txtBranch, look);

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: {
      top: tableTop,
      right: margin.right,
      bottom: margin.bottom,
      left: margin.left,
    },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // the stock look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
    ...stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX),
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  // "Page x of y" on a line of its own under the heading, and "Printed : ..." at the bottom right of every page
  addStockDocumentPageNumbers(doc, look, {
    right: pageW - margin.right,
    pageRight: pageW - margin.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: margin.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: margin.bottom - 6,
    footer: `Printed : ${report.txtReportInfo}`,
  });

  return doc.output("blob");
};
