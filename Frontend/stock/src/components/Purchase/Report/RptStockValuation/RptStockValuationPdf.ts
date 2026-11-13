// RptStockValuationPdf.ts
// The Stock Valuation report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait. With more than one branch: "Branch : Jeddah", its items and its Total, then the next
//   branch ...; a Grand Total row closes the report.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the
// branch and the report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  addPageNumbers,
  drawReportTitle,
  pdfGroupStyles,
  pdfHeadStyles,
  pdfMargin,
  pdfTableStyles,
  pdfTableTop,
  registerReportPdfFont,
} from "../../../common/reportPdf";

import {
  COLUMN_WEIGHTS,
  formatAmount,
  formatStock,
  hasBranchSections,
  type PrintReport,
} from "./RptStockValuationPrintReport";

export const buildStockValuationPdf = async (report: PrintReport): Promise<Blob> => {
  const sections = hasBranchSections(report);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

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
          styles: { ...pdfGroupStyles(look), lineWidth: 0, minCellHeight: 9, valign: "bottom" },
        },
      ]);
    }

    for (const l of branch.lines) {
      body.push([
        { content: l.lkpItemID },
        { content: l.txtItemName },
        { content: l.txtItemGroupName },
        { content: l.txtUnit },
        { content: formatStock(l.txtStock), styles: right },
        { content: formatAmount(l.txtUnitCost), styles: right },
        { content: formatAmount(l.txtStockValue), styles: right },
      ]);
    }

    // the Total of the branch
    if (sections) {
      body.push(totalRow("Total :", branch.totals.txtStock, branch.totals.txtStockValue));
    }
  }

  body.push(totalRow("Grand Total :", report.totals.txtStock, report.totals.txtStockValue));

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
