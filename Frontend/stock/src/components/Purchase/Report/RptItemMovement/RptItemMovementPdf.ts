// RptItemMovementPdf.ts
// The Item Movement report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait. Fast / Slow Moving: Item ID / Item Name / Item Group Name / Moved Qty. / Moved Value / Stock and a
//   Total row. Non Moving: Item ID / Item Name / Item Group / Stock (no total) - the old rptItemMovementrpt and
//   rptItemNonMovingrpt.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the branch and the
// report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  PDF_BLACK,
  addPageNumbers,
  drawReportTitle,
  pdfMargin,
  pdfTableStyles,
  pdfTableTop,
} from "../../../common/reportPdf";

import {
  FIRST_NUMBER_COLUMN,
  columnWeights,
  formatQty,
  formatValue,
  isNonMoving,
  type PrintReport,
} from "./RptItemMovementPrintReport";

export const buildItemMovementPdf = (report: PrintReport): Blob => {
  const nonMoving = isNonMoving(report);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  const weights = columnWeights(report);

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    weights.map((w, i) => [i, { cellWidth: w * usable, ...(i >= FIRST_NUMBER_COLUMN ? right : {}) }])
  );

  const labels = nonMoving
    ? ["Item ID", "Item Name", "Item Group", "Stock"]
    : ["Item ID", "Item Name", "Item Group Name", "Moved Qty.", "Moved Value", "Stock"];

  const head: CellDef[][] = [
    labels.map((content, i) => ({
      content,
      styles: { halign: i >= FIRST_NUMBER_COLUMN ? ("right" as const) : ("left" as const) },
    })),
  ];

  const body: CellDef[][] = report.lines.map((l) =>
    nonMoving
      ? [
          { content: l.lkpItemID },
          { content: l.txtItemName },
          { content: l.txtItemGroupName },
          { content: formatQty(l.txtStock), styles: right },
        ]
      : [
          { content: l.lkpItemID },
          { content: l.txtItemName },
          { content: l.txtItemGroupName },
          { content: formatQty(l.txtMovedQty), styles: right },
          { content: formatValue(l.txtMovedValue), styles: right },
          { content: formatQty(l.txtStock), styles: right },
        ]
  );

  // the Total row (Fast / Slow Moving only): the label over the three text columns
  if (!nonMoving) {
    const t = report.totals;

    body.push([
      { content: "Total :", colSpan: 3, styles: { ...bold, ...right } },
      { content: formatQty(t.txtMovedQty), styles: { ...bold, ...right } },
      { content: formatValue(t.txtMovedValue), styles: { ...bold, ...right } },
      { content: formatQty(t.txtStock), styles: { ...bold, ...right } },
    ]);
  }

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawReportTitle(doc, pageW, margin, report, report.txtBranch);

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
    styles: pdfTableStyles(),
    headStyles: {
      textColor: PDF_BLACK,
      fontStyle: "normal",
    },
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  addPageNumbers(doc, pageW, margin);

  return doc.output("blob");
};
