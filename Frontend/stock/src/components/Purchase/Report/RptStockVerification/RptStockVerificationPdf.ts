// RptStockVerificationPdf.ts
// The Stock Verification report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait, by item group (heading, items, Total), a Grand Total row at the end; with more than one
//   branch one section per branch ("Branch : Jeddah", its item groups, its Total). The Phys. Stock column is
//   empty: it is for the counters.
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
  formatStock,
  hasBranchSections,
  type PrintReport,
} from "./RptStockVerificationRpt";

export const buildStockVerificationPdf = async (report: PrintReport): Promise<Blob> => {
  const sections = hasBranchSections(report);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(20);
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

  // Item ID | Item Name | Unit | Comp. Stock | Phys. Stock
  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COLUMN_WEIGHTS.map((w, i) => [i, { cellWidth: w * usable, ...(i >= 3 ? right : {}) }])
  );

  const head: CellDef[][] = [
    ["Item ID", "Item Name", "Unit", "Comp. Stock", "Phys. Stock"].map((content, i) => ({
      content,
      styles: { halign: i >= 3 ? ("right" as const) : ("left" as const) },
    })),
  ];

  // a row of one text over the whole width ("Branch : Jeddah", "Item Group : 01   Tiles")
  const headingRow = (content: string): CellDef[] => [
    {
      content,
      colSpan: 5,
      styles: groupStyles,
    },
  ];

  // a Total row: the label over the text columns, the Comp. Stock, and the empty Phys. Stock
  const totalRow = (label: string, stock: number): CellDef[] => [
    { content: label, colSpan: 3, styles: { ...bold, ...right } },
    { content: formatStock(stock), styles: { ...bold, ...right } },
    { content: "" },
  ];

  const body: CellDef[][] = [];

  for (const branch of report.branches) {
    if (sections) body.push(headingRow(`Branch : ${branch.txtBranchName}`));

    for (const group of branch.groups) {
      body.push(headingRow(`Item Group : ${group.lkpItemGroupID}   ${group.txtItemGroupName}`));

      group.lines.forEach((l, index) => {
        // the first line under the item group has the line above it (the group row has no lines)
        const top = (first: boolean) => (index === 0 ? sides(first) : {});
        body.push([
          { content: l.lkpItemID, styles: top(true) },
          { content: l.txtItemName, styles: top(false) },
          { content: l.txtUnit, styles: top(false) },
          { content: formatStock(l.txtStock), styles: { ...right, ...top(false) } },
          { content: "", styles: top(false) },
        ]);
      });

      body.push(totalRow("Total :", group.totals.txtStock));
    }

    if (sections) body.push(totalRow("Branch Total :", branch.totals.txtStock));
  }

  body.push(totalRow("Grand Total :", report.totals.txtStock));

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
