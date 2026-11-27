// RptItemHistoryPdf.ts
// The Item History as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 portrait, company name, heading, branch, then per item a header block,
// the transactions (Date, Type, Document No., Account ID, Qty. In, Qty. Out,
// Unit Cost, Unit Price) and a "Total :" row. "Page x of y" on a line of its own under the heading and "Printed : ..." at the
// bottom right of every page (the stock look, common/reportPdf.ts).
//
// The header block of an item is laid out exactly like the printed page (RptItemHistoryRpt.ts): label | colon |
// value, the colons in a column of their own, the right-hand pair starting at the Unit Cost column and its value
// ending at the right edge of the Unit Price column. The font and the sizes come from the shared look.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import {
  STOCK_DOCUMENT_PDF,
  addStockDocumentPageNumbers,
  drawStockReportTitle,
  pdfMargin,
  registerReportPdfFont,
  stockDocumentTable,
  stockReportTableTop,
  type PdfLook,
  type PdfMargin,
} from "../../../common/reportPdf";
import { REPORT_STYLE } from "../../../common/reportStyle";
import {
  dmy,
  fixed,
  whole,
  raw,
  type PrintReport,
  type HistoryGroup,
} from "./RptItemHistoryRpt";

// same column proportions as the printed page
const COL_PCT = [11.6, 9.9, 17, 12.5, 10.4, 9.9, 13.2, 15.5]; // Document No. wide enough for its 14 px label

const PAGE_W = 210; // A4 portrait, mm
const PAGE_H = 297;

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
const drawHeaderBlock = (doc: jsPDF, look: PdfLook, margin: PdfMargin, usable: number, g: HistoryGroup, y: number): number => {
  const x = (percent: number) => margin.left + (percent / 100) * usable;

  doc.setTextColor(0, 0, 0);
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.pdfBody);

  let line = 0;
  const baseline = () => y + line * LINE_H + LINE_H * 0.72;

  // the values are in bold, as the values of the stock documents
  const bold = (on: boolean) => doc.setFont(look.font, on ? "bold" : "normal");

  const left = (label: string, value: string, valueX = X.value) => {
    doc.text(label, x(X.label), baseline());
    doc.text(":", x(X.colon), baseline(), { align: "center" });
    bold(true);
    doc.text(value, x(valueX), baseline());
    bold(false);
  };

  const right = (label: string, value: string) => {
    doc.text(label, x(X.rightLabel), baseline());
    doc.text(":", x(X.rightColon), baseline(), { align: "center" });
    bold(true);
    doc.text(value, x(X.rightValueEnd), baseline(), { align: "right" });
    bold(false);
  };

  // Item : 2001   AC Compressor
  doc.text("Item", x(X.label), baseline());
  doc.text(":", x(X.colon), baseline(), { align: "center" });
  bold(true);
  doc.text(g.itemId, x(X.value), baseline());
  bold(false);
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

// the column labels of an item: a row with its own lines (the top, the right and the bottom - and the left on the first column)
const labelsRow = (look: PdfLook): CellDef[] =>
  ["Date", "Type", "Document No.", "Account ID", "Qty. In", "Qty. Out", "Unit Cost", "Unit Price"].map(
    (t, i) => ({
      content: t,
      styles: {
        fontSize: look.size.pdfBody, // the column labels are 11 px, the same as the rows
        halign: i >= 4 ? ("right" as const) : ("left" as const),
        lineWidth: {
          top: STOCK_DOCUMENT_PDF.lineWidth,
          right: STOCK_DOCUMENT_PDF.lineWidth,
          bottom: STOCK_DOCUMENT_PDF.lineWidth,
          left: i === 0 ? STOCK_DOCUMENT_PDF.lineWidth : 0,
        },
      },
    }),
  );

export const buildItemHistoryPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const margin = pdfMargin(12);
  const usable = PAGE_W - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  // company / heading / branch - drawn once on every page
  const titled = new Set<number>();
  const drawTitle = () => {
    const page = doc.getCurrentPageInfo().pageNumber;
    if (titled.has(page)) return;
    titled.add(page);

    drawStockReportTitle(doc, PAGE_W, margin, { txtCoName: report.coName, txtHeading: report.heading }, report.branch, look);
  };

  const columnStyles: Record<number, { cellWidth: number }> = {};
  COL_PCT.forEach((p, i) => {
    columnStyles[i] = { cellWidth: (p / 100) * usable };
  });

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  drawTitle();
  let y = tableTop;

  for (const g of report.groups) {
    // the block and the first lines of its table must stay together: otherwise the item starts on a new page
    const needed = BLOCK_LINES * LINE_H + BLOCK_GAP + 3 * 6.5;
    if (y + needed > PAGE_H - margin.bottom) {
      doc.addPage();
      drawTitle();
      y = tableTop;
    }

    y = drawHeaderBlock(doc, look, margin, usable, g, y);

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
      margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
      tableWidth: usable,
      rowPageBreak: "avoid",
      showHead: "never",
      // the stock look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
      ...stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX),
      columnStyles,
      body,
      didDrawPage: drawTitle,
    });

    // space before the next item
    y = lastY() + 4;
  }

  // "Page x of y" on a line of its own under the heading, and "Printed : ..." at the bottom right of every page
  addStockDocumentPageNumbers(doc, look, {
    right: PAGE_W - margin.right,
    pageRight: PAGE_W - margin.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: margin.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: margin.bottom - 6,
    footer: `Printed : ${report.reportInfo}`,
  });

  return doc.output("blob");
};
