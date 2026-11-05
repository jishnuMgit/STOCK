// RptRVPVSumPdf.ts
// The Receipt / Payment Summary report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait. Entry No. / Date / Cash/Bank Account Name / Received From/Paid To / Amount and a Total row - the old
//   rptRVPVSumRpt.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the branch and the report
// info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  PDF_BLACK,
  addPageNumbers,
  drawReportTitle,
  pdfMargin,
  pdfTableStyles,
  pdfTableTop,
} from "../../../common/reportPdf";

import { AMOUNT_COLUMN, COLUMN_WEIGHTS, formatAmount, type PrintReport } from "./RptRVPVSumPrintReport";

export const buildRVPVSumPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

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
  const drawTitle = () => drawReportTitle(doc, pageW, margin, report, report.txtBranch);

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
    styles: pdfTableStyles(),
    headStyles: {
      textColor: PDF_BLACK,
      fontStyle: "normal",
    },
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  addPageNumbers(doc, pageW, margin);

  return doc.output("blob");
};
