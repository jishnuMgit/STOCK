// RptSalesPriceListPdf.ts
// The Sales Price List as a PDF (returned as a Blob; saveFile.ts saves it): A4 portrait, the same layout as the printed report
// (RptSalesPriceListRpt.ts) - the items grouped by item group.
// Column labels repeat on every page; "Page x of y" on a line of its own under the heading; the company, the heading and the
// branch at the top of every page; "Printed : ..." at the bottom right (the stock look, common/reportPdf.ts).
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

import { COL_WIDTHS, fixed, type PriceListReport } from "./RptSalesPriceListRpt";

export const buildSalesPriceListPdf = async (report: PriceListReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const right = { halign: "right" as const };

  // the sides of a cell that is drawn with its own lines (the first row under an item group line): the top, the right and the
  // bottom - and the left on the first column. A cell takes its sides from stockDocumentTable() unless it names them.
  const sides = (firstColumn: boolean) => {
    const w = STOCK_DOCUMENT_PDF.lineWidth;
    return { lineWidth: { top: w, right: w, bottom: w, left: firstColumn ? w : 0 } };
  };

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COL_WIDTHS.map((w, i) => [i, { cellWidth: w * usable, ...(i >= 3 ? right : {}) }])
  );

  const head: CellDef[][] = [
    ["Item ID", "Item Name", "Unit", "Unit Cost", "Unit Price"].map((content, i) => ({
      content,
      styles: { halign: i >= 3 ? ("right" as const) : ("left" as const) },
    })),
  ];

  const body: CellDef[][] = [];

  for (const g of report.groups) {
    body.push([
      {
        content: `Item Group : ${g.groupId}   ${g.groupName}`,
        colSpan: 5,
        styles: {
          ...pdfGroupStyles(look),
          fontSize: look.size.pdfBody, // the item group line is 11 px too, as the rows
          halign: "left" as const,
          lineWidth: 0,
          minCellHeight: 9,
          valign: "bottom" as const,
        },
      },
    ]);

    g.items.forEach((it, index) => {
      // the first line under the item group has the line above it (the group row has no lines)
      const top = (first: boolean) => (index === 0 ? sides(first) : {});
      body.push([
        { content: it.itemId, styles: top(true) },
        { content: it.itemName, styles: top(false) },
        { content: it.unit, styles: top(false) },
        { content: fixed(it.unitCost, 4), styles: { ...right, ...top(false) } },
        { content: fixed(it.unitPrice, 2), styles: { ...right, ...top(false) } },
      ]);
    });
  }

  // company / heading / branch - drawn on every page
  const drawTitle = () => drawStockReportTitle(doc, pageW, margin, { txtCoName: report.coName, txtHeading: report.heading }, report.branch, look);

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
    footer: `Printed : ${report.reportInfo}`,
  });

  return doc.output("blob");
};
