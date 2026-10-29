// RptItemPurchasePdf.ts
// The Item Purchase report as a PDF (returned as a Blob; saveFile.ts saves it). The same layout as the printed
// report (RptItemPurchasePrintReport.ts): A4 portrait, a block per item with its Total (the Qty).
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the branch and the
// report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  COLUMN_COUNT,
  COLUMN_WEIGHTS,
  FIRST_NUMBER_COLUMN,
  LINE_COLOR,
  formatPrice,
  formatQty,
  type PrintReport,
} from "./RptItemPurchasePrintReport";

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const BLACK: RGB = [0, 0, 0];

const PAD = 1.2;

export const buildItemPurchasePdf = (report: PrintReport): Blob => {
  const lineColor = hexToRgb(LINE_COLOR);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = { top: 12.7, right: 10, bottom: 12.7, left: 18 };
  const usable = pageW - margin.left - margin.right;
  const tableTop = margin.top + 27;

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
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
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
    headStyles: { textColor: BLACK, fontStyle: "normal" },
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
