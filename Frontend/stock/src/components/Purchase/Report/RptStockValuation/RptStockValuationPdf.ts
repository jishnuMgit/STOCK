// RptStockValuationPdf.ts
// The Stock Valuation report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait. With more than one branch: "Branch : Jeddah", its items and its Total, then the next
//   branch ...; a Grand Total row closes the report.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the
// branch and the report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  COLUMN_WEIGHTS,
  LINE_COLOR,
  formatAmount,
  formatStock,
  hasBranchSections,
  type PrintReport,
} from "./RptStockValuationPrintReport";

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const BLACK: RGB = [0, 0, 0];

const PAD = 1.2;

export const buildStockValuationPdf = (report: PrintReport): Blob => {
  const lineColor = hexToRgb(LINE_COLOR);
  const sections = hasBranchSections(report);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = { top: 12.7, right: 10, bottom: 12.7, left: 15 };
  const usable = pageW - margin.left - margin.right;
  const tableTop = margin.top + 27;

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
          styles: { fontStyle: "bold" as const, lineWidth: 0, minCellHeight: 9, valign: "bottom" },
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
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");

    doc.setFontSize(14);
    doc.text(report.txtCoName, pageW / 2, margin.top + 8, { align: "center" });

    doc.setFontSize(12);
    doc.text(report.txtHeading, pageW / 2, margin.top + 15, { align: "center" });

    doc.setFontSize(9);
    if (report.txtBranch) doc.text(report.txtBranch, margin.left, margin.top + 22);

    doc.setFontSize(8);
    doc.text(report.txtReportInfo, pageW - margin.right, margin.top + 22, { align: "right" });
  };

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
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: PAD,
      lineColor,
      lineWidth: 0.2,
      minCellHeight: 7,
      valign: "middle",
      overflow: "linebreak",
      textColor: BLACK,
    },
    headStyles: {
      textColor: BLACK,
      fontStyle: "normal",
    },
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();

  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, pageW - margin.right, margin.top, { align: "right" });
  }

  return doc.output("blob");
};
