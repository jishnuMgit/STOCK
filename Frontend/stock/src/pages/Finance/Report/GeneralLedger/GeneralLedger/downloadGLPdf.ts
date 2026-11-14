// downloadGLPdf.ts
// The General Ledger as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 landscape, company name, heading, branch, one block per account (each on
// a new page) with the column labels repeated on every page, a running balance
// and a "Total :" row. Page numbers restart for every account, like the VB report.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import { pdfHeadStyles, pdfTableStyles, registerReportPdfFont } from "../../../../../components/common/reportPdf";
import { REPORT_STYLE } from "../../../../../components/common/reportStyle";
import {
  amount,
  COL_LABELS,
  COL_WIDTHS,
  type GLAccount,
  type PrintReport,
} from "./printGLReport";

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12.7, right: 10, bottom: 14, left: 19 };
const TABLE_TOP = 47 + REPORT_STYLE.pdf.titleGap + REPORT_STYLE.pdf.tableGap; // below company / heading / branch / account

export const buildGLPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> =
    {};
  COL_WIDTHS.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w * usable, ...(i >= 6 ? { halign: "right" as const } : {}) };
  });

  const tot = {
    halign: "right" as const,
    fontStyle: "bold" as const,
  };

  // the account being drawn: company / heading / branch / account are drawn on every page
  let current: GLAccount = report.accounts[0];

  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    const gap = REPORT_STYLE.pdf.titleGap; // between the company name and the heading
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.company);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(look.size.heading);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15 + gap, { align: "center" });

    doc.setFontSize(look.size.group);
    doc.text(report.branch, MARGIN.left, MARGIN.top + 22 + gap);

    doc.text(
      `Account :   ${current.accountId}    ${current.accountName}`,
      MARGIN.left,
      MARGIN.top + 29 + gap,
    );

    // the user and the time: bottom right of every page
    doc.setFontSize(look.size.small);
    doc.text(`Printed : ${report.reportInfo}`, PAGE_W - MARGIN.right, doc.internal.pageSize.getHeight() - MARGIN.bottom + 6, {
      align: "right",
    });
  };

  // first page and last page of every account (for the page numbers)
  const ranges: { start: number; end: number }[] = [];

  report.accounts.forEach((acc, index) => {
    current = acc;
    if (index > 0) doc.addPage(); // each account on a new page
    const start = doc.getNumberOfPages();

    const body: CellDef[][] = acc.rows.map((r) => [
      { content: r.date },
      { content: r.brId },
      { content: r.docType },
      { content: r.docNo },
      { content: r.description },
      { content: r.ccId },
      { content: amount(r.debit), styles: { halign: "right" as const } },
      { content: amount(r.credit), styles: { halign: "right" as const } },
      { content: r.balance, styles: { halign: "right" as const } },
    ]);
    body.push([
      { content: "Total :", colSpan: 6, styles: tot },
      { content: amount(acc.totalDebit), styles: tot },
      { content: amount(acc.totalCredit), styles: tot },
      { content: acc.balance, styles: tot },
    ]);

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
      showHead: "everyPage",
      styles: { ...pdfTableStyles(look), minCellHeight: REPORT_STYLE.pdf.minCellHeight, overflow: "ellipsize" as const },
      headStyles: pdfHeadStyles(look),
      columnStyles,
      head: [
        COL_LABELS.map((label, i) => ({
          content: label,
          styles: { halign: i >= 6 ? ("right" as const) : ("left" as const) },
        })),
      ],
      body,
      didDrawPage: drawTitle,
    });

    ranges.push({ start, end: doc.getNumberOfPages() });
  });

  // page numbers need the page count of each account, so they are added at the end
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.small);
  doc.setTextColor(0, 0, 0);
  for (const { start, end } of ranges) {
    for (let p = start; p <= end; p++) {
      doc.setPage(p);
      doc.text(`Page ${p - start + 1} / ${end - start + 1}`, PAGE_W - MARGIN.right, MARGIN.top, {
        align: "right",
      });
    }
  }

  return doc.output("blob");
};