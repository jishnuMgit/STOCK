// RptItemPurchasePdf.ts
// The Item Purchase report as a PDF (returned as a Blob; saveFile.ts saves it). The same layout as the printed
// report (RptItemPurchasePrintReport.ts): A4 portrait, a block per item with its Total (the Qty).
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
  COLUMN_COUNT,
  COLUMN_WEIGHTS,
  FIRST_NUMBER_COLUMN,
  formatPrice,
  formatQty,
  type PrintReport,
} from "./RptItemPurchasePrintReport";

export const buildItemPurchasePdf = (report: PrintReport): Blob => {

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = pdfMargin(18);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  // Date | Type | Document No. | P.I. No. | Qty. | Unit Price | Supplier
  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COLUMN_WEIGHTS.map((w, i) => [
      i,
      { cellWidth: w * usable, ...(i === FIRST_NUMBER_COLUMN || i === FIRST_NUMBER_COLUMN + 1 ? right : {}) },
    ])
  );

  const head: CellDef[][] = [
    ["Date", "Type", "Document No.", "P.I. No.", "Qty.", "Unit Price", "Supplier"].map((content, i) => ({
      content,
      styles: {
        halign: i === FIRST_NUMBER_COLUMN || i === FIRST_NUMBER_COLUMN + 1 ? ("right" as const) : ("left" as const),
      },
    })),
  ];

  const body: CellDef[][] = [];

  for (const item of report.items) {
    // ---- "Item : 0001   o1item1" ----
    body.push([
      {
        content: `Item : ${item.lkpItemID}   ${item.txtItemName}`,
        colSpan: COLUMN_COUNT,
        styles: { ...bold, lineWidth: 0, minCellHeight: 9, valign: "bottom" },
      },
    ]);

    for (const l of item.lines) {
      body.push([
        { content: l.txtDate },
        { content: l.txtDocType },
        { content: l.txtDocNo },
        { content: l.txtPINo },
        { content: formatQty(l.txtQty), styles: right },
        { content: formatPrice(l.txtUnitPrice), styles: right },
        { content: l.txtSupplierName },
      ]);
    }

    // ---- the Total of the item (the Qty) ----
    body.push([
      { content: "Total :", colSpan: 4, styles: { ...bold, ...right } },
      { content: formatQty(item.totals.txtQty), styles: { ...bold, ...right } },
      { content: "" },
      { content: "" },
    ]);
  }

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawReportTitle(doc, pageW, margin, report, report.txtBranch);

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: pdfTableStyles(),
    headStyles: { textColor: PDF_BLACK, fontStyle: "normal" },
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  addPageNumbers(doc, pageW, margin);

  return doc.output("blob");
};
