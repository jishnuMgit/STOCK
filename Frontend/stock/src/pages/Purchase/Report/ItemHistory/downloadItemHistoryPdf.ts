// downloadItemHistoryPdf.ts
// The Item History as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 portrait, company name, heading, branch, then per item a header block,
// the transactions (Date, Type, Document No., Account ID, Qty. In, Qty. Out,
// Unit Cost, Unit Price) and a "Total :" row. Page number and the user and the time
// top right of every page.
//
// The header block of an item is laid out exactly like the printed page (printItemHistoryReport.ts): label | colon |
// value, the colons in a column of their own, the right-hand pair starting at the Unit Cost column and its value
// ending at the right edge of the Unit Price column. The font and the sizes come from the shared look.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import { pdfLabelFontSize, registerReportPdfFont, type PdfLook, PDF_CELL_PADDING } from "../../../../components/common/reportPdf";
import {
  dmy,
  fixed,
  whole,
  raw,
  type PrintReport,
  type HistoryGroup,
} from "./printItemHistoryReport";

import { REPORT_STYLE } from "../../../../components/common/reportStyle";
type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4

// same column proportions as the printed page
const COL_PCT = [11.6, 9.9, 17, 12.5, 10.4, 9.9, 13.2, 15.5]; // Document No. wide enough for its 14 px label

const PAGE_W = 210; // A4 portrait, mm
const PAGE_H = 297;
const MARGIN = { top: 12, right: 10, bottom: 14, left: 12 };
const TABLE_TOP = 36 + REPORT_STYLE.pdf.tableGap; // below company / heading / branch

// ---- the header block of an item: the same positions as the printed page (percent of the table width) ----
const X = {
  label: 0, // the left-hand label
  colon: 26.33, // the colon (centred in its own narrow column)
  value: 26.92, // the left-hand value
  itemName: 48.98, // the item name, after the item id
  rightLabel: 71.3, // the right-hand label: the Unit Cost column starts here
  rightColon: 89.0,
  rightValueEnd: 100, // the right-hand value ends at the right edge of the Unit Price column
};
const LINE_H = 5.3; // the height of one line of the block, mm
const BLOCK_LINES = 5;
const BLOCK_GAP = 1.6; // between the block and the column labels

// draws the header block of one item at y; returns where the block ends
const drawHeaderBlock = (doc: jsPDF, look: PdfLook, usable: number, g: HistoryGroup, y: number): number => {
  const x = (percent: number) => MARGIN.left + (percent / 100) * usable;

  doc.setTextColor(0, 0, 0);
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.pdfBody);

  let line = 0;
  const baseline = () => y + line * LINE_H + LINE_H * 0.72;

  const left = (label: string, value: string, valueX = X.value) => {
    doc.text(label, x(X.label), baseline());
    doc.text(":", x(X.colon), baseline(), { align: "center" });
    doc.text(value, x(valueX), baseline());
  };

  const right = (label: string, value: string) => {
    doc.text(label, x(X.rightLabel), baseline());
    doc.text(":", x(X.rightColon), baseline(), { align: "center" });
    doc.text(value, x(X.rightValueEnd), baseline(), { align: "right" });
  };

  // Item : 2001   AC Compressor
  doc.text("Item", x(X.label), baseline());
  doc.text(":", x(X.colon), baseline(), { align: "center" });
  doc.text(g.itemId, x(X.value), baseline());
  doc.text(g.itemName, x(X.itemName), baseline());

  line = 1;
  left("Supplier", g.supplier);
  right("Last Sale Date", dmy(g.lastSaleDate, true));

  line = 2;
  left("Last Purchase Date", dmy(g.lastPurDate, true));
  right("Last Sale Unit Price", fixed(g.lastSaleUnitPrice, 2));

  line = 3;
  left("Last Purchase Unit Price", fixed(g.lastPurUnitPrice, 4));
  right("Current Stock", whole(g.stock));

  line = 4;
  left("Last Purchase Unit Cost", fixed(g.lastPurUnitCost, 4));

  return y + BLOCK_LINES * LINE_H + BLOCK_GAP;
};

const labelsRow = (look: PdfLook): CellDef[] =>
  ["Date", "Type", "Document No.", "Account ID", "Qty. In", "Qty. Out", "Unit Cost", "Unit Price"].map(
    (t, i) => ({
      content: t,
      styles: {
        fontSize: pdfLabelFontSize(look),
        halign: i >= 4 ? ("right" as const) : ("left" as const),
      },
    }),
  );

export const buildItemHistoryPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // company / heading / branch - drawn once on every page
  const titled = new Set<number>();
  const drawTitle = () => {
    const page = doc.getCurrentPageInfo().pageNumber;
    if (titled.has(page)) return;
    titled.add(page);

    doc.setTextColor(0, 0, 0);
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.company);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(look.size.heading);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15, { align: "center" });

    doc.setFontSize(look.size.pdfBody);
    doc.text(report.branch, MARGIN.left, MARGIN.top + 22);

    // the user and the time: bottom right of every page
    doc.setFontSize(look.size.small);
    doc.text(`Printed : ${report.reportInfo}`, PAGE_W - MARGIN.right, doc.internal.pageSize.getHeight() - MARGIN.bottom + 6, {
      align: "right",
    });
  };

  const columnStyles: Record<number, { cellWidth: number }> = {};
  COL_PCT.forEach((p, i) => {
    columnStyles[i] = { cellWidth: (p / 100) * usable };
  });

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  drawTitle();
  let y = TABLE_TOP;

  for (const g of report.groups) {
    // the block and the first lines of its table must stay together: otherwise the item starts on a new page
    const needed = BLOCK_LINES * LINE_H + BLOCK_GAP + 3 * 6.5;
    if (y + needed > PAGE_H - MARGIN.bottom) {
      doc.addPage();
      drawTitle();
      y = TABLE_TOP;
    }

    y = drawHeaderBlock(doc, look, usable, g, y);

    const body: CellDef[][] = [labelsRow(look)];

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

    autoTable(doc, {
      theme: "plain",
      startY: y,
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
        font: look.font,
        fontSize: look.size.pdfBody,
        cellPadding: PDF_CELL_PADDING,
        lineColor: BORDER,
        lineWidth: 0.2,
        minCellHeight: REPORT_STYLE.pdf.minCellHeight,
        valign: "middle",
        overflow: "ellipsize",
        textColor: [0, 0, 0],
      },
      columnStyles,
      body,
      didDrawPage: drawTitle,
    });

    // space before the next item
    y = lastY() + 4;
  }

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.small);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, {
      align: "right",
    });
  }

  return doc.output("blob");
};
