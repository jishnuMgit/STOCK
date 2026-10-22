// downloadItemHistoryPdf.ts
// The Item History as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 portrait, company name, heading, branch, then per item a header block,
// the transactions (Date, Type, Document No., Account ID, Qty. In, Qty. Out,
// Unit Cost, Unit Price) and a "Total :" row. Page number top right, report
// info bottom right of every page.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import {
  dmy,
  fixed,
  whole,
  raw,
  type PrintReport,
  type HistoryGroup,
} from "./printItemHistoryReport";

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4
const HEAD_FILL: RGB = [239, 243, 250]; // #eff3fa

// same column proportions as the printed page
const COL_PCT = [11.6, 9.9, 13.4, 14.1, 10.4, 9.9, 14.7, 16];

const PAGE_W = 210; // A4 portrait, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 12 };
const TABLE_TOP = 36; // below company / heading / branch

const plain = { lineWidth: 0, halign: "left" as const };

const label = (text: string, span = 2): CellDef => ({
  content: text,
  colSpan: span,
  styles: plain,
});
const value = (text: string, span = 2): CellDef => ({
  content: text,
  colSpan: span,
  styles: plain,
});

// header block of one item (VB XrTable1): label : value, two pairs per line
const headerBlock = (g: HistoryGroup): CellDef[][] => [
  [label("Item :"), value(`${g.itemId}   ${g.itemName}`, 6)],
  [
    label("Supplier :"),
    value(g.supplier),
    label("Last Sale Date :"),
    value(dmy(g.lastSaleDate, true)),
  ],
  [
    label("Last Purchase Date :"),
    value(dmy(g.lastPurDate, true)),
    label("Last Sale Unit Price :"),
    value(fixed(g.lastSaleUnitPrice, 2)),
  ],
  [
    label("Last Purchase Unit Price :"),
    value(fixed(g.lastPurUnitPrice, 4)),
    label("Current Stock :"),
    value(whole(g.stock)),
  ],
  [
    label("Last Purchase Unit Cost :"),
    value(fixed(g.lastPurUnitCost, 4)),
    { content: "", colSpan: 4, styles: plain },
  ],
];

const labelsRow = (): CellDef[] =>
  ["Date", "Type", "Document No.", "Account ID", "Qty. In", "Qty. Out", "Unit Cost", "Unit Price"].map(
    (t, i) => ({
      content: t,
      styles: {
        fillColor: HEAD_FILL,
        halign: i >= 4 ? ("right" as const) : ("left" as const),
      },
    }),
  );

export const buildItemHistoryPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  const body: CellDef[][] = [];

  for (const g of report.groups) {
    body.push(...headerBlock(g));
    body.push(labelsRow());

    for (const r of g.rows) {
      const right = { halign: "right" as const };
      body.push([
        { content: dmy(r.date, false) },
        { content: r.docType },
        { content: r.docNo },
        { content: r.accountId },
        { content: whole(r.qtyIn), styles: right },
        { content: raw(r.qtyOut), styles: right },
        { content: fixed(r.unitCost, 2), styles: right },
        { content: fixed(r.unitPrice, 2), styles: right },
      ]);
    }

    // VB group footer: Sum of Qty. In / Qty. Out
    const sum = (pick: (r: (typeof g.rows)[number]) => number | null) =>
      Number(g.rows.reduce((t, r) => t + (pick(r) ?? 0), 0).toFixed(4));
    const tot = { halign: "right" as const, fontStyle: "bold" as const };
    body.push([
      { content: "Total :", colSpan: 4, styles: tot },
      { content: raw(sum((r) => r.qtyIn)), styles: tot },
      { content: raw(sum((r) => r.qtyOut)), styles: tot },
      { content: "" },
      { content: "" },
    ]);

    // space before the next item
    body.push([
      {
        content: "",
        colSpan: 8,
        styles: { lineWidth: 0, minCellHeight: 4, cellPadding: 0 },
      },
    ]);
  }

  // company / heading / branch - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15, { align: "center" });

    doc.setFontSize(9);
    doc.text(report.branch, MARGIN.left, MARGIN.top + 22);
  };

  const columnStyles: Record<number, { cellWidth: number }> = {};
  COL_PCT.forEach((p, i) => {
    columnStyles[i] = { cellWidth: (p / 100) * usable };
  });

  autoTable(doc, {
    theme: "plain",
    startY: TABLE_TOP,
    margin: {
      top: TABLE_TOP,
      right: MARGIN.right,
      bottom: MARGIN.bottom,
      left: MARGIN.left,
    },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "never",
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: 1.2,
      lineColor: BORDER,
      lineWidth: 0.2,
      minCellHeight: 6,
      valign: "middle",
      overflow: "ellipsize",
      textColor: [0, 0, 0],
    },
    columnStyles,
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
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, {
      align: "right",
    });
    doc.text(report.reportInfo, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, {
      align: "right",
    });
  }

  return doc.output("blob");
};
