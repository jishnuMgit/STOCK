// RptRVPVSumPdf.ts
// The Receipt / Payment Summary report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait. Entry No. / Date / Cash/Bank Account Name / Received From/Paid To / Amount and a Total row - the old
//   rptRVPVSumRpt.
// Column labels repeat on every page; "Page x of y" on a line of its own under the heading; the company, the heading
// and the branch at the top of every page; "Printed : ..." at the bottom right (the stock look, common/reportPdf.ts).
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
} from "../../../common/reportPdf";
import { REPORT_STYLE } from "../../../common/reportStyle";

import { AMOUNT_COLUMN, COLUMN_WEIGHTS, formatAmount, type PrintReport } from "./RptRVPVSumRpt";

export const buildRVPVSumPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COLUMN_WEIGHTS.map((w, i) => [i, { cellWidth: w * usable, ...(i === AMOUNT_COLUMN ? right : {}) }])
  );

  const head: CellDef[][] = [
    ["Entry No.", "Date", "Cash/Bank Account Name", "Received From/Paid To", "Amount"].map((content, i) => ({
      content,
      styles: { halign: i === AMOUNT_COLUMN ? ("right" as const) : ("left" as const) },
    })),
  ];

  const body: CellDef[][] = report.lines.map((l): CellDef[] => [
    { content: l.txtDocNo },
    { content: l.txtDate },
    { content: l.txtAccountName },
    { content: l.txtReceivedFromPaidTo },
    { content: formatAmount(l.txtAmount), styles: right },
  ]);

  // the Total row: the label over the four text columns
  body.push([
    { content: "Total :", colSpan: 4, styles: { ...bold, ...right } },
    { content: formatAmount(report.totals.txtAmount), styles: { ...bold, ...right } },
  ]);

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawStockReportTitle(doc, pageW, margin, report, report.txtBranch, look);

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
    // the stock look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
    ...stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX),
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  // "Page x of y" on a line of its own under the heading, and "Printed : ..." at the bottom right of every page
  addStockDocumentPageNumbers(doc, look, {
    right: pageW - margin.right,
    pageRight: pageW - margin.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: margin.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: margin.bottom - 6,
    footer: `Printed : ${report.txtReportInfo}`,
  });

  return doc.output("blob");
};
