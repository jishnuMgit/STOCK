// MatchEnquiryPdf.ts
// The Match Enquiry report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait. Br. ID / Date / Type / Doc. No. / Description / Debit / Credit / Match Apply Date - the old
//   rptMatchEnquiryPrint: one block for each account ("Account : id name", its lines, "Total :"), a new page after each.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the branch, the document and
// the account at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import { REPORT_STYLE } from "../../common/reportStyle";
import {
  PDF_BLACK,
  addPageNumbers,
  drawReportTitle,
  pdfMargin,
  pdfTableStyles,
  pdfTableTop,
} from "../../common/reportPdf";

import {
  COLUMN_LABELS,
  COLUMN_WEIGHTS,
  accountHeading,
  formatAmount,
  isAmountColumn,
  type PrintReport,
} from "./MatchEnquiryPrintReport";

export const buildMatchEnquiryPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;

  // two lines under the usual title: the document and the account
  const documentY = margin.top + 29;
  const accountY = margin.top + 35;
  const tableTop = pdfTableTop(margin) + 14;

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COLUMN_WEIGHTS.map((w, i) => [i, { cellWidth: w * usable, ...(isAmountColumn(i) ? right : {}) }])
  );

  const head: CellDef[][] = [
    COLUMN_LABELS.map((content, i) => ({
      content,
      styles: { halign: isAmountColumn(i) ? ("right" as const) : ("left" as const) },
    })),
  ];

  report.groups.forEach((g, index) => {
    // a new page after each account
    if (index > 0) doc.addPage();

    const body: CellDef[][] = g.lines.map((l): CellDef[] => [
      { content: l.txtBrID },
      { content: l.txtDate },
      { content: l.txtDocType },
      { content: l.txtDocNo },
      { content: l.txtDescription },
      { content: formatAmount(l.txtDebit), styles: right },
      { content: formatAmount(l.txtCredit), styles: right },
      { content: l.txtMatchApplyDate },
    ]);

    // the Total row: the label over the five text columns
    body.push([
      { content: "Total :", colSpan: 5, styles: { ...bold, ...right } },
      { content: formatAmount(g.totals.txtDebit), styles: { ...bold, ...right } },
      { content: formatAmount(g.totals.txtCredit), styles: { ...bold, ...right } },
      { content: "" },
    ]);

    // the title, the document and the account - drawn on every page of the block
    const drawTitle = () => {
      drawReportTitle(doc, pageW, margin, report, report.txtBranch);

      doc.setFont(REPORT_STYLE.pdfFont, "normal");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(REPORT_STYLE.size.pdfBody);
      doc.text(report.txtDocument, margin.left, documentY);

      doc.setFontSize(REPORT_STYLE.size.group);
      doc.text(accountHeading(g), margin.left, accountY);
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
  });

  addPageNumbers(doc, pageW, margin);

  return doc.output("blob");
};
