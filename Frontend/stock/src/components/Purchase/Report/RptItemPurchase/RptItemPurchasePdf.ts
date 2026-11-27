// RptItemPurchasePdf.ts
// The Item Purchase report as a PDF (returned as a Blob; saveFile.ts saves it). The same layout as the printed
// report (RptItemPurchaseRpt.ts): A4 portrait, a block per item with its Total (the Qty).
// Column labels repeat on every page; "Page x of y" on a line of its own under the heading; the company, the heading
// and the branch at the top of every page; "Printed : ..." at the bottom right (the stock look, common/reportPdf.ts).
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  STOCK_DOCUMENT_PDF,
  addStockDocumentPageNumbers,
  drawStockReportTitle,
  pdfGroupStyles,
  pdfMargin,
  registerReportPdfFont,
  stockDocumentTable,
  stockReportTableTop,
} from "../../../common/reportPdf";
import { REPORT_STYLE } from "../../../common/reportStyle";

import {
  COLUMN_COUNT,
  COLUMN_WEIGHTS,
  FIRST_NUMBER_COLUMN,
  formatPrice,
  formatQty,
  type PrintReport,
} from "./RptItemPurchaseRpt";

export const buildItemPurchasePdf = async (report: PrintReport): Promise<Blob> => {

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(18);
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  // the sides of a cell that is drawn with its own lines (the first row under the item line): the top, the right and the
  // bottom - and the left on the first column. A cell takes its sides from stockDocumentTable() unless it names them.
  const sides = (firstColumn: boolean) => {
    const w = STOCK_DOCUMENT_PDF.lineWidth;
    return { lineWidth: { top: w, right: w, bottom: w, left: firstColumn ? w : 0 } };
  };

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
        styles: {
          ...pdfGroupStyles(look),
          fontSize: look.size.pdfBody, // the item line is 11 px too, as the rows and the totals
          lineWidth: 0,
          minCellHeight: 9,
          valign: "bottom",
        },
      },
    ]);

    item.lines.forEach((l, index) => {
      // the first line under the item has the line above it (the item row has no lines)
      const top = (first: boolean) => (index === 0 ? sides(first) : {});
      body.push([
        { content: l.txtDate, styles: top(true) },
        { content: l.txtDocType, styles: top(false) },
        { content: l.txtDocNo, styles: top(false) },
        { content: l.txtPINo, styles: top(false) },
        { content: formatQty(l.txtQty), styles: { ...right, ...top(false) } },
        { content: formatPrice(l.txtUnitPrice), styles: { ...right, ...top(false) } },
        { content: l.txtSupplierName, styles: top(false) },
      ]);
    });

    // ---- the Total of the item (the Qty) ----
    body.push([
      { content: "Total :", colSpan: 4, styles: { ...bold, ...right } },
      { content: formatQty(item.totals.txtQty), styles: { ...bold, ...right } },
      { content: "" },
      { content: "" },
    ]);
  }

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawStockReportTitle(doc, pageW, margin, report, report.txtBranch, look);

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
