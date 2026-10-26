// RptStockPdf.ts
// The Stock report as a PDF (returned as a Blob; saveFile.ts saves it).
//   Detailed - A4 portrait, by item with a running balance and a Total row per item.
//   Summary  - A4 landscape, one row per item and a Total row at the end.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the
// branch and the report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  COLORS,
  formatCost,
  formatDate,
  formatQty,
  type PrintReport,
} from "./RptStockPrintReport";

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const BLACK: RGB = [0, 0, 0];

const PAD = 1.2;

export const buildStockPdf = (report: PrintReport): Blob => {
  const detailed = report.txtMode === "D";
  const color = COLORS[report.txtMode];
  const lineColor = hexToRgb(color.line);
  const headFill = hexToRgb(color.head);
  const totalFill = hexToRgb(COLORS.total);

  const doc = new jsPDF({
    orientation: detailed ? "portrait" : "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = detailed ? 210 : 297;
  const margin = { top: 12.7, right: 10, bottom: 12.7, left: detailed ? 22.9 : 25.4 };
  const usable = pageW - margin.left - margin.right;
  const tableTop = margin.top + 27;

  const right = { halign: "right" as const };
  const bold = { fillColor: totalFill, fontStyle: "bold" as const };

  let head: CellDef[][];
  const body: CellDef[][] = [];
  let columnStyles: Record<number, { cellWidth: number; halign?: "right" }>;

  if (detailed) {
    // Date | Type | Document No. | Txn.# | Unit Cost | Qty. In | Qty. Out | Balance (the old weights)
    const weights = [0.136, 0.072, 0.133, 0.107, 0.121, 0.145, 0.144, 0.142];

    columnStyles = Object.fromEntries(
      weights.map((w, i) => [i, { cellWidth: w * usable, ...(i >= 4 ? right : {}) }])
    );

    head = [
      ["Date", "Type", "Document No.", "Txn.#", "Unit Cost", "Qty. In", "Qty. Out", "Balance"].map(
        (content, i) => ({
          content,
          styles: { halign: i >= 4 ? ("right" as const) : ("left" as const) },
        })
      ),
    ];

    for (const item of report.detail) {
      body.push([
        {
          content: `Item : ${item.lkpItemID}   ${item.txtItemName}`,
          colSpan: 8,
          styles: { fontStyle: "bold" as const, lineWidth: 0, minCellHeight: 9, valign: "bottom" },
        },
      ]);

      for (const l of item.lines) {
        body.push([
          { content: formatDate(l.txtDate) },
          { content: l.txtDocType },
          { content: l.txtDocNo },
          { content: l.txtTxnNo },
          { content: formatCost(l.txtUnitCost), styles: right },
          { content: formatQty(l.txtQtyIn), styles: right },
          { content: formatQty(l.txtQtyOut), styles: right },
          { content: formatQty(l.txtBalance), styles: right },
        ]);
      }

      body.push([
        { content: "Total :", colSpan: 5, styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalIn), styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalOut), styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalBalance), styles: { ...bold, ...right } },
      ]);
    }
  } else {
    // Item ID | Item Name | Unit | Opening | Qty. In | Qty. Out | Closing (the old weights)
    const weights = [0.174, 0.395, 0.048, 0.105, 0.093, 0.093, 0.093];

    columnStyles = Object.fromEntries(
      weights.map((w, i) => [i, { cellWidth: w * usable, ...(i >= 3 ? right : {}) }])
    );

    head = [
      ["Item ID", "Item Name", "Unit", "Opening", "Qty. In", "Qty. Out", "Closing"].map(
        (content, i) => ({
          content,
          styles: { halign: i >= 3 ? ("right" as const) : ("left" as const) },
        })
      ),
    ];

    for (const l of report.summary.lines) {
      body.push([
        { content: l.lkpItemID },
        { content: l.txtItemName },
        { content: l.txtUnit },
        { content: formatQty(l.txtQtyOpening), styles: right },
        { content: formatQty(l.txtQtyIn), styles: right },
        { content: formatQty(l.txtQtyOut), styles: right },
        { content: formatQty(l.txtQtyClosing), styles: right },
      ]);
    }

    const t = report.summary.totals;

    body.push([
      { content: "Total :", colSpan: 3, styles: { ...bold, ...right } },
      { content: formatQty(t.txtQtyOpening), styles: { ...bold, ...right } },
      { content: formatQty(t.txtQtyIn), styles: { ...bold, ...right } },
      { content: formatQty(t.txtQtyOut), styles: { ...bold, ...right } },
      { content: formatQty(t.txtQtyClosing), styles: { ...bold, ...right } },
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
      fillColor: headFill,
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
