// RptStockAgeingPdf.ts
// The Stock Ageing report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 landscape, a flat list in the order of the Item ID (no group headings, no totals) - the old rptStAgeingRpt.
//   An item is one row: its stock added up over all the branches asked for.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the branch and the
// report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  COLUMN_WEIGHTS,
  FIRST_AGE_COLUMN,
  FIRST_NUMBER_COLUMN,
  LINE_COLOR,
  formatCost,
  formatQty,
  type PrintReport,
} from "./RptStockAgeingPrintReport";

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const BLACK: RGB = [0, 0, 0];

const PAD = 1.2;

export const buildStockAgeingPdf = (report: PrintReport): Blob => {
  const lineColor = hexToRgb(LINE_COLOR);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = 297;
  const margin = { top: 12.7, right: 10, bottom: 12.7, left: 12 };
  const usable = pageW - margin.left - margin.right;
  const tableTop = margin.top + 27;

  const right = { halign: "right" as const };

  // Item ID | Item Name | Item Group | Unit | Stock | Unit Cost | the five age columns
  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COLUMN_WEIGHTS.map((w, i) => [
      i,
      { cellWidth: w * usable, ...(i >= FIRST_NUMBER_COLUMN ? right : {}) },
    ])
  );

  const head: CellDef[][] = [
    ["Item ID", "Item Name", "Item Group", "Unit", "Stock", "Unit Cost", ...report.txtAgeLabels].map(
      (content, i) => ({
        content,
        styles: {
          halign:
            i >= FIRST_AGE_COLUMN
              ? ("center" as const)
              : i >= FIRST_NUMBER_COLUMN
                ? ("right" as const)
                : ("left" as const),
        },
      })
    ),
  ];

  const body: CellDef[][] = report.lines.map((l) => [
    { content: l.lkpItemID },
    { content: l.txtItemName },
    { content: l.txtItemGroupName },
    { content: l.txtUnit },
    { content: formatQty(l.txtStock), styles: right },
    { content: formatCost(l.txtUnitCost), styles: right },
    ...l.txtAge.map((v) => ({ content: formatQty(v), styles: right })),
  ]);

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
