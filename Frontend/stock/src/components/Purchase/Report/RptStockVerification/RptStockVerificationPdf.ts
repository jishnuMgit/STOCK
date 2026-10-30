// RptStockVerificationPdf.ts
// The Stock Verification report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait, by item group (heading, items, Total), a Grand Total row at the end; with more than one
//   branch one section per branch ("Branch : Jeddah", its item groups, its Total). The Phys. Stock column is
//   empty: it is for the counters.
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
  COLUMN_WEIGHTS,
  formatStock,
  hasBranchSections,
  type PrintReport,
} from "./RptStockVerificationPrintReport";

export const buildStockVerificationPdf = (report: PrintReport): Blob => {
  const sections = hasBranchSections(report);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = pdfMargin(20);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

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
      styles: { fontStyle: "bold" as const, lineWidth: 0, minCellHeight: 9, valign: "bottom" },
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

      for (const l of group.lines) {
        body.push([
          { content: l.lkpItemID },
          { content: l.txtItemName },
          { content: l.txtUnit },
          { content: formatStock(l.txtStock), styles: right },
          { content: "" },
        ]);
      }

      body.push(totalRow("Total :", group.totals.txtStock));
    }

    if (sections) body.push(totalRow("Branch Total :", branch.totals.txtStock));
  }

  body.push(totalRow("Grand Total :", report.totals.txtStock));

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
