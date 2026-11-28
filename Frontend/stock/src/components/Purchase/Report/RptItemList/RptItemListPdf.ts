// RptItemListPdf.ts
// The Item List as a PDF (returned as a Blob; saveFile.ts saves it).
// Same three layouts as the printed report (RptItemListRpt.ts): "branch" (grouped by item group), "status" and "allBranch" -
// all A4 portrait. Column labels repeat on every page; "Page x of y" on a line of its own under the heading; the company, the
// heading and the branch at the top of every page; "Printed : ..." at the bottom right (the stock look, common/reportPdf.ts).
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

import { COLS, type PrintReport } from "./RptItemListRpt";

export const buildItemListPdf = async (report: PrintReport): Promise<Blob> => {
  const grouped = report.variant === "branch";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(12);
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const cols = COLS[report.variant];
  const total = cols.reduce((t, c) => t + c.width, 0);

  // the sides of a cell that is drawn with its own lines (the first row under an item group line): the top, the right and the
  // bottom - and the left on the first column. A cell takes its sides from stockDocumentTable() unless it names them.
  const sides = (firstColumn: boolean) => {
    const w = STOCK_DOCUMENT_PDF.lineWidth;
    return { lineWidth: { top: w, right: w, bottom: w, left: firstColumn ? w : 0 } };
  };

  // ---- body (a band per item group in the "branch" layout) ----
  const body: CellDef[][] = [];
  let currentGroup: string | null = null;

  for (const r of report.rows) {
    let firstUnderGroup = false;

    if (grouped && r.itemGroupId !== currentGroup) {
      currentGroup = r.itemGroupId;
      firstUnderGroup = true;
      body.push([
        {
          content: `Item Group : ${r.itemGroupId}   ${r.itemGroupName}`,
          colSpan: cols.length,
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
    }

    body.push(
      cols.map((c, i) => ({
        content: c.get(r),
        styles: firstUnderGroup ? sides(i === 0) : {},
      }))
    );
  }

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = {};
  cols.forEach((c, i) => {
    columnStyles[i] = {
      cellWidth: (c.width / total) * usable,
      ...(c.right ? { halign: "right" as const } : {}),
    };
  });

  // the stock look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
  const look2 = stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX);

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    ...look2,
    // a long item name goes on to a second line (it is not cut short)
    styles: { ...look2.styles, overflow: "linebreak" as const },
    columnStyles,
    head: [
      cols.map((c) => ({
        content: c.label,
        styles: { halign: c.right ? ("right" as const) : ("left" as const) },
      })),
    ],
    body,
    // company / heading / branch - drawn on every page
    didDrawPage: () => drawStockReportTitle(doc, pageW, margin, { txtCoName: report.coName, txtHeading: report.heading }, report.branch, look),
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
