// RptStockAgeingPdf.ts
// The Stock Ageing report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 landscape, a flat list in the order of the Item ID (no group headings, no totals) - the old rptStAgeingRpt.
//   An item is one row: its stock added up over all the branches asked for.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the branch and the
// report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  addPageNumbers,
  drawReportTitle,
  pdfHeadStyles,
  pdfMargin,
  pdfTableStyles,
  pdfTableTop,
  registerReportPdfFont,
} from "../../../common/reportPdf";

import {
  COLUMN_WEIGHTS,
  FIRST_AGE_COLUMN,
  FIRST_NUMBER_COLUMN,
  formatCost,
  formatQty,
  type PrintReport,
} from "./RptStockAgeingPrintReport";

export const buildStockAgeingPdf = async (report: PrintReport): Promise<Blob> => {

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 297;
  const margin = pdfMargin(12);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

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
  const drawTitle = () => drawReportTitle(doc, pageW, margin, report, report.txtBranch, look);

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
    styles: pdfTableStyles(look),
    headStyles: pdfHeadStyles(look),
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  addPageNumbers(doc, pageW, margin, look);

  return doc.output("blob");
};
