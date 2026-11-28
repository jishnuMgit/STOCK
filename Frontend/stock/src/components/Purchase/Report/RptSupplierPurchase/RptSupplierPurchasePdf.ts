// RptSupplierPurchasePdf.ts
// The Supplier Purchase report as a PDF (returned as a Blob; saveFile.ts saves it). The same two layouts as
// the printed report (RptSupplierPurchaseRpt.ts): the Summary on A4 portrait (a block per supplier) and
// the Detailed on A4 landscape (a block per document).
// "Page x of y" top right; the company, the heading and the report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  STOCK_DOCUMENT_PDF,
  addStockDocumentPageNumbers,
  autoTableKeepBlocks,
  drawStockReportTitle,
  pdfGroupStyles,
  pdfMargin,
  registerReportPdfFont,
  stockDocumentTable,
  stockReportTableTop,
  type PdfLook,
} from "../../../common/reportPdf";
import { REPORT_STYLE } from "../../../common/reportStyle";

import {
  DETAIL_FIRST_NUMBER,
  DETAIL_LABELS,
  SUMMARY_WEIGHTS,
  formatAmount,
  formatCost,
  formatPrice,
  formatQty,
  type DetailedReport,
  type PrintReport,
  type SummaryReport,
} from "./RptSupplierPurchaseRpt";

const right = { halign: "right" as const };
const bold = { fontStyle: "bold" as const };

// the sides of a cell that is drawn with its own lines (the first row under a block heading, the column labels of a document): the top,
// the right and the bottom - and the left on the first column. A cell takes its sides from stockDocumentTable() unless it names them.
const sides = (firstColumn: boolean, lineWidth = STOCK_DOCUMENT_PDF.lineWidth) => ({
  lineWidth: { top: lineWidth, right: lineWidth, bottom: lineWidth, left: firstColumn ? lineWidth : 0 },
});

// the table, the title on every page and "Page x of y"
const draw = (
  doc: jsPDF,
  pageW: number,
  margin: { top: number; right: number; bottom: number; left: number },
  report: PrintReport,
  branch: string,
  head: CellDef[][] | undefined,
  body: CellDef[][],
  columnWeights: number[],
  firstNumberColumn: number,
  look: PdfLook,
  // the space left and right in the first column: the narrow Line column has less than a text column
  firstColumnPadding: number,
  // blocks that must not be split over two pages (a block that does not fit in the rest of the page starts on the next
  // page); when given, they are drawn instead of `body`
  blocks?: CellDef[][][],
  // true: every block starts on a new page
  pagePerBlock = false
) => {
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    columnWeights.map((w, i) => [i, { cellWidth: w * usable, ...(i >= firstNumberColumn ? right : {}) }])
  );

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawStockReportTitle(doc, pageW, margin, report, branch, look);

  const options = {
    theme: "plain" as const,
    startY: tableTop,
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
    tableWidth: usable,
    rowPageBreak: "avoid" as const,
    showHead: head ? ("everyPage" as const) : ("never" as const),
    // the stock look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
    ...stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, firstColumnPadding),
    columnStyles,
    ...(head ? { head } : {}),
  };

  if (blocks) {
    autoTableKeepBlocks(doc, blocks, options, drawTitle, pagePerBlock);
  } else {
    autoTable(doc, { ...options, body, didDrawPage: drawTitle });
  }

  // "Page x of y" on a line of its own under the heading, and "Printed : ..." at the bottom right of every page
  addStockDocumentPageNumbers(doc, look, {
    right: pageW - margin.right,
    pageRight: pageW - margin.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: margin.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: margin.bottom - 6,
    footer: `Printed : ${report.txtReportInfo}`,
  });
};

// a row of one text over the whole width, no lines
const textRow = (content: string, colSpan: number, styles: Record<string, unknown> = {}): CellDef[] => [
  { content, colSpan, styles: { lineWidth: 0, minCellHeight: 6, ...styles } },
];

/* ---------------------------------------------------------
   Summary
--------------------------------------------------------- */

const buildSummary = async (report: SummaryReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const head: CellDef[][] = [
    ["Date", "Type", "Document No.", "Amount"].map((content, i) => ({
      content,
      styles: { halign: i >= 3 ? ("right" as const) : ("left" as const) },
    })),
  ];

  const body: CellDef[][] = [];

  for (const s of report.suppliers) {
    body.push(
      textRow(`Supplier : ${s.lkpSupplierID}   ${s.txtSupplierName}`, 4, {
        ...pdfGroupStyles(look),
        fontSize: look.size.pdfBody, // the supplier line is 11 px too, as the rows and the totals
        minCellHeight: 9,
        valign: "bottom",
      })
    );

    s.lines.forEach((l, index) => {
      // the first line under the supplier has the line above it (the supplier row has no lines)
      const top = (first: boolean) => (index === 0 ? sides(first) : {});
      body.push([
        { content: l.txtDate, styles: top(true) },
        { content: l.txtDocType, styles: top(false) },
        { content: l.txtDocNo, styles: top(false) },
        { content: formatAmount(l.txtAmount), styles: { ...right, ...top(false) } },
      ]);
    });

    body.push([
      { content: "Total :", colSpan: 3, styles: { ...bold, ...right } },
      { content: formatAmount(s.totals.txtAmount), styles: { ...bold, ...right } },
    ]);
  }

  draw(doc, 210, pdfMargin(20), report, report.txtBranch, head, body, SUMMARY_WEIGHTS, 3, look, STOCK_DOCUMENT_PDF.cellPaddingX);

  return doc.output("blob");
};

/* ---------------------------------------------------------
   Detailed
--------------------------------------------------------- */

const buildDetailed = async (report: DetailedReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  // one block per document: every document (Entry No.) starts on its own page
  const blocks: CellDef[][][] = [];

  // three texts over the 8 columns: 3 + 3 + 2
  const infoRow = (a: string, b: string, c: string): CellDef[] => [
    { content: a, colSpan: 3, styles: { lineWidth: 0, minCellHeight: 6 } },
    { content: b, colSpan: 3, styles: { lineWidth: 0, minCellHeight: 6 } },
    { content: c, colSpan: 2, styles: { lineWidth: 0, minCellHeight: 6 } },
  ];

  for (const d of report.documents) {
    const body: CellDef[][] = [];
    blocks.push(body);

    body.push(textRow("", 8, { minCellHeight: 4 }));
    body.push(infoRow(`Branch : ${d.txtBranchName}`, `Entry No. : ${d.txtDocNo}`, `Date : ${d.txtDate}`));
    body.push(
      infoRow(
        `Supplier : ${d.lkpSupplierID}   ${d.txtSupplierName}`,
        `${report.txtPINoLabel} : ${d.txtPINo}`,
        `Supplier Amt. : ${formatAmount(d.txtSupplierAmt)}`
      )
    );
    body.push(infoRow(`Currency : ${d.txtCurrency}`, `P.O. No. : ${d.txtPONo}`, `Currency Rate : ${d.txtCurrencyRate}`));

    body.push(
      DETAIL_LABELS.map((content, i) => ({
        content,
        styles: {
          halign: i === 0 ? ("center" as const) : i >= DETAIL_FIRST_NUMBER ? ("right" as const) : ("left" as const),
          fontSize: look.size.pdfBody, // the column labels are 11 px, the same as the rows
          ...sides(i === 0),
        },
      }))
    );

    for (const l of d.lines) {
      body.push([
        { content: String(l.txtSlNo), styles: { halign: "center" as const } },
        { content: l.lkpItemID },
        { content: l.txtItemName },
        { content: l.txtUnit },
        { content: formatQty(l.txtQty), styles: right },
        { content: formatPrice(l.txtUnitPrice), styles: right },
        { content: formatCost(l.txtUnitCost), styles: right },
        { content: formatCost(l.txtTotalCost), styles: right },
      ]);
    }

    body.push([
      { content: "Total :", colSpan: 4, styles: { ...bold, ...right } },
      { content: formatQty(d.totals.txtQty), styles: { ...bold, ...right } },
      { content: "" },
      { content: "" },
      { content: formatCost(d.totals.txtTotalCost), styles: { ...bold, ...right } },
    ]);

    body.push([
      { content: `Disc. Amt. : ${formatPrice(d.txtDiscAmt)}`, colSpan: 8, styles: { lineWidth: 0, minCellHeight: 6 } },
    ]);
    body.push(textRow(`Note : ${d.txtNote}`, 8));
  }

  // the column widths of the Stock Adjustment PDF (StockAdjustmentPdf.ts), in mm: Line 10, Item ID 38, Unit 16, Qty. 24,
  // Unit Price 24, Unit Cost 28, Total Cost 34 - Item Name takes the rest; draw() wants them as weights of the usable width
  const margin = pdfMargin(12);
  const usable = 297 - margin.left - margin.right;
  const fixed = [10, 38, 0, 16, 24, 24, 28, 34];
  fixed[2] = usable - fixed.reduce((a, b) => a + b, 0);
  const weights = fixed.map((w) => w / usable);

  draw(doc, 297, margin, report, "", undefined, [], weights, DETAIL_FIRST_NUMBER, look, STOCK_DOCUMENT_PDF.lineCellPaddingX, blocks, true);

  return doc.output("blob");
};

export const buildSupplierPurchasePdf = (report: PrintReport): Promise<Blob> =>
  report.rdgDetOrSum === 1 ? buildSummary(report) : buildDetailed(report);
