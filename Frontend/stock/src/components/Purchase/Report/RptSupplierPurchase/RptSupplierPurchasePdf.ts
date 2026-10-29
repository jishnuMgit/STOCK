// RptSupplierPurchasePdf.ts
// The Supplier Purchase report as a PDF (returned as a Blob; saveFile.ts saves it). The same two layouts as
// the printed report (RptSupplierPurchasePrintReport.ts): the Summary on A4 portrait (a block per supplier) and
// the Detailed on A4 landscape (a block per document).
// "Page x of y" top right; the company, the heading and the report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  DETAIL_FIRST_NUMBER,
  DETAIL_LABELS,
  DETAIL_WEIGHTS,
  LINE_COLOR,
  SUMMARY_WEIGHTS,
  formatAmount,
  formatAmountFC,
  formatCost,
  formatPrice,
  formatQty,
  type DetailedReport,
  type PrintReport,
  type SummaryReport,
} from "./RptSupplierPurchasePrintReport";

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const BLACK: RGB = [0, 0, 0];

const PAD = 1.2;

const right = { halign: "right" as const };
const bold = { fontStyle: "bold" as const };

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
  firstNumberColumn: number
) => {
  const usable = pageW - margin.left - margin.right;
  const tableTop = margin.top + 27;

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    columnWeights.map((w, i) => [i, { cellWidth: w * usable, ...(i >= firstNumberColumn ? right : {}) }])
  );

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");

    doc.setFontSize(14);
    doc.text(report.txtCoName, pageW / 2, margin.top + 8, { align: "center" });

    doc.setFontSize(12);
    doc.text(report.txtHeading, pageW / 2, margin.top + 15, { align: "center" });

    doc.setFontSize(9);
    if (branch) doc.text(branch, margin.left, margin.top + 22);

    doc.setFontSize(8);
    doc.text(report.txtReportInfo, pageW - margin.right, margin.top + 22, { align: "right" });
  };

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: head ? "everyPage" : "never",
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: PAD,
      lineColor: hexToRgb(LINE_COLOR),
      lineWidth: 0.2,
      minCellHeight: 7,
      valign: "middle",
      overflow: "linebreak",
      textColor: BLACK,
    },
    headStyles: { textColor: BLACK, fontStyle: "normal" },
    columnStyles,
    ...(head ? { head } : {}),
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
};

// a row of one text over the whole width, no lines
const textRow = (content: string, colSpan: number, styles: Record<string, unknown> = {}): CellDef[] => [
  { content, colSpan, styles: { lineWidth: 0, minCellHeight: 6, ...styles } },
];

/* ---------------------------------------------------------
   Summary
--------------------------------------------------------- */

const buildSummary = (report: SummaryReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const head: CellDef[][] = [
    ["Date", "Type", "Document No.", "Amount_FC", "Amount"].map((content, i) => ({
      content,
      styles: { halign: i >= 3 ? ("right" as const) : ("left" as const) },
    })),
  ];

  const body: CellDef[][] = [];

  for (const s of report.suppliers) {
    body.push(
      textRow(`Supplier : ${s.lkpSupplierID}   ${s.txtSupplierName}`, 5, {
        ...bold,
        minCellHeight: 9,
        valign: "bottom",
      })
    );

    for (const l of s.lines) {
      body.push([
        { content: l.txtDate },
        { content: l.txtDocType },
        { content: l.txtDocNo },
        { content: formatAmountFC(l.txtAmountFC), styles: right },
        { content: formatAmount(l.txtAmount), styles: right },
      ]);
    }

    body.push([
      { content: "Total :", colSpan: 3, styles: { ...bold, ...right } },
      { content: formatAmountFC(s.totals.txtAmountFC), styles: { ...bold, ...right } },
      { content: formatAmount(s.totals.txtAmount), styles: { ...bold, ...right } },
    ]);
  }

  draw(doc, 210, { top: 12.7, right: 10, bottom: 12.7, left: 20 }, report, report.txtBranch, head, body, SUMMARY_WEIGHTS, 3);

  return doc.output("blob");
};

/* ---------------------------------------------------------
   Detailed
--------------------------------------------------------- */

const buildDetailed = (report: DetailedReport): Blob => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const body: CellDef[][] = [];

  // three texts over the 10 columns: 3 + 4 + 3
  const infoRow = (a: string, b: string, c: string): CellDef[] => [
    { content: a, colSpan: 3, styles: { lineWidth: 0, minCellHeight: 6 } },
    { content: b, colSpan: 4, styles: { lineWidth: 0, minCellHeight: 6 } },
    { content: c, colSpan: 3, styles: { lineWidth: 0, minCellHeight: 6 } },
  ];

  for (const d of report.documents) {
    body.push(textRow("", 10, { minCellHeight: 4 }));
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
        styles: { halign: i >= DETAIL_FIRST_NUMBER ? ("right" as const) : ("left" as const) },
      }))
    );

    for (const l of d.lines) {
      body.push([
        { content: String(l.txtSlNo) },
        { content: l.lkpItemID },
        { content: l.txtItemName },
        { content: l.txtUnit },
        { content: formatQty(l.txtQty), styles: right },
        { content: formatCost(l.txtUnitPriceFC), styles: right },
        { content: formatCost(l.txtTotalPriceFC), styles: right },
        { content: formatPrice(l.txtUnitPrice), styles: right },
        { content: formatCost(l.txtUnitCost), styles: right },
        { content: formatCost(l.txtTotalCost), styles: right },
      ]);
    }

    body.push([
      { content: "Total :", colSpan: 4, styles: { ...bold, ...right } },
      { content: formatQty(d.totals.txtQty), styles: { ...bold, ...right } },
      { content: "" },
      { content: formatCost(d.totals.txtTotalPriceFC), styles: { ...bold, ...right } },
      { content: "" },
      { content: "" },
      { content: formatCost(d.totals.txtTotalCost), styles: { ...bold, ...right } },
    ]);

    body.push([
      { content: `Disc. Amt.(FC) : ${formatCost(d.txtDiscAmtFC)}`, colSpan: 4, styles: { lineWidth: 0, minCellHeight: 6 } },
      { content: `Disc. Amt. : ${formatPrice(d.txtDiscAmt)}`, colSpan: 6, styles: { lineWidth: 0, minCellHeight: 6 } },
    ]);
    body.push(textRow(`Note : ${d.txtNote}`, 10));
  }

  draw(doc, 297, { top: 12.7, right: 10, bottom: 12.7, left: 12 }, report, "", undefined, body, DETAIL_WEIGHTS, DETAIL_FIRST_NUMBER);

  return doc.output("blob");
};

export const buildSupplierPurchasePdf = (report: PrintReport): Blob =>
  report.rdgDetOrSum === 1 ? buildSummary(report) : buildDetailed(report);
