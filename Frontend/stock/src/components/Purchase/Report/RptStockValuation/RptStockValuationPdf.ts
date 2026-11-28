// RptStockValuationPdf.ts
// The Stock Valuation report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait. With more than one branch: "Branch : Jeddah", its items and its Total, then the next
//   branch ...; a Grand Total row closes the report.
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
  COLUMN_WEIGHTS,
  formatAmount,
  formatStock,
  hasBranchSections,
  type PrintReport,
} from "./RptStockValuationRpt";

export const buildStockValuationPdf = async (report: PrintReport): Promise<Blob> => {
  const sections = hasBranchSections(report);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  // the sides of a cell that is drawn with its own lines (the first row under a heading row): the top, the right and the
  // bottom - and the left on the first column. A cell takes its sides from stockDocumentTable() unless it names them.
  const sides = (firstColumn: boolean) => {
    const w = STOCK_DOCUMENT_PDF.lineWidth;
    return { lineWidth: { top: w, right: w, bottom: w, left: firstColumn ? w : 0 } };
  };

  // the heading rows (Branch, Item Group): 11 px, as the rows and the totals
  const groupStyles = { ...pdfGroupStyles(look), fontSize: look.size.pdfBody, lineWidth: 0, minCellHeight: 9, valign: "bottom" as const };

  // Item ID | Item Name | Item Group | Unit | Stock | Unit Cost | Stock Value
  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COLUMN_WEIGHTS.map((w, i) => [i, { cellWidth: w * usable, ...(i >= 4 ? right : {}) }])
  );

  const head: CellDef[][] = [
    ["Item ID", "Item Name", "Item Group", "Unit", "Stock", "Unit Cost", "Stock Value"].map(
      (content, i) => ({
        content,
        styles: { halign: i >= 4 ? ("right" as const) : ("left" as const) },
      })
    ),
  ];

  // a Total row: the label over the text columns, then the Stock and the Stock Value
  const totalRow = (label: string, stock: number, value: number): CellDef[] => [
    { content: label, colSpan: 4, styles: { ...bold, ...right } },
    { content: formatStock(stock), styles: { ...bold, ...right } },
    { content: "" },
    { content: formatAmount(value), styles: { ...bold, ...right } },
  ];

  const body: CellDef[][] = [];

  for (const branch of report.branches) {
    // "Branch : Jeddah"
    if (sections) {
      body.push([
        {
          content: `Branch : ${branch.txtBranchName}`,
          colSpan: 7,
          styles: groupStyles,
        },
      ]);
    }

    branch.lines.forEach((l, index) => {
      // under a branch line the first row has the line above it (the branch row has no lines)
      const top = (first: boolean) => (sections && index === 0 ? sides(first) : {});
      body.push([
        { content: l.lkpItemID, styles: top(true) },
        { content: l.txtItemName, styles: top(false) },
        { content: l.txtItemGroupName, styles: top(false) },
        { content: l.txtUnit, styles: top(false) },
        { content: formatStock(l.txtStock), styles: { ...right, ...top(false) } },
        { content: formatAmount(l.txtUnitCost), styles: { ...right, ...top(false) } },
        { content: formatAmount(l.txtStockValue), styles: { ...right, ...top(false) } },
      ]);
    });

    // the Total of the branch
    if (sections) {
      body.push(totalRow("Total :", branch.totals.txtStock, branch.totals.txtStockValue));
    }
  }

  body.push(totalRow("Grand Total :", report.totals.txtStock, report.totals.txtStockValue));

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
