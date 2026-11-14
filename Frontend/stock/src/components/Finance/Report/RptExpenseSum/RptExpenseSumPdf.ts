// RptExpenseSumPdf.ts
// The Expense Summary report as a PDF (returned as a Blob; saveFile.ts saves it).
//   A4 portrait. Account ID / Account Name / Opening / Current / Closing and a Total row - the old rptExpenseSumRpt.
//   The line is coloured by the account level (1 red, 2 green, 3 blue, the rest black); the name is indented by the
//   spaces the server put in front of it (Print A/c Group).
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the branch / cost center
// and the report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  addPageNumbers,
  drawReportTitle,
  pdfHeadStyles,
  pdfMargin,
  pdfTableStyles,
  pdfTableTop,
  registerReportPdfFont,
  type PdfLook,
} from "../../../common/reportPdf";

import {
  COLUMN_WEIGHTS,
  FIRST_NUMBER_COLUMN,
  LEVEL_COLORS,
  formatAmount,
  monthPageLabels,
  monthPageNumbers,
  monthPageWeights,
  type ExpenseSumMonthLine,
  type MonthReport,
  type PeriodReport,
  type PrintReport,
} from "./RptExpenseSumPrintReport";

import { REPORT_STYLE } from "../../../common/reportStyle";
// the cell padding of the report (mm) and the width of one leading space of the name
const CELL_PADDING = REPORT_STYLE.pdf.cellPadding;
const SPACE_WIDTH = 0.9;

// the name of a line, indented by the spaces the server put in front of it
const nameStyles = (color: [number, number, number], name: string) => {
  const trimmed = name.trimStart();
  const indent = (name.length - trimmed.length) * SPACE_WIDTH;

  return {
    content: trimmed,
    styles: {
      textColor: color,
      cellPadding: {
        top: CELL_PADDING,
        right: REPORT_STYLE.pdf.cellPaddingX,
        bottom: CELL_PADDING,
        left: REPORT_STYLE.pdf.cellPaddingX + indent,
      },
    },
  };
};

// ---- the monthly report: A4 landscape, January to June, then (after June) July to December ----

const addMonthPage = (
  doc: jsPDF,
  report: MonthReport,
  heading: string,
  secondHalf: boolean,
  first: boolean,
  look: PdfLook
) => {
  const pageW = 297;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  if (!first) doc.addPage();

  const labels = monthPageLabels(secondHalf);
  const weights = monthPageWeights(secondHalf);

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    weights.map((w, i) => [i, { cellWidth: w * usable, ...(i >= FIRST_NUMBER_COLUMN ? right : {}) }])
  );

  const head: CellDef[][] = [
    labels.map((content, i) => ({
      content,
      styles: { halign: i >= FIRST_NUMBER_COLUMN ? ("right" as const) : ("left" as const) },
    })),
  ];

  const body: CellDef[][] = report.lines.map((l: ExpenseSumMonthLine) => {
    const color = LEVEL_COLORS[l.txtAccountLevel] ?? [0, 0, 0];

    return [
      { content: l.lkpAccountID, styles: { textColor: color } },
      nameStyles(color, l.txtAccountName),
      ...monthPageNumbers(l.txtMonths, l.txtJanToJun, l.txtJanToDec, secondHalf).map((v) => ({
        content: formatAmount(v),
        styles: { ...right, textColor: color },
      })),
    ];
  });

  const t = report.totals;

  body.push([
    { content: "Total :", colSpan: 2, styles: { ...bold, ...right } },
    ...monthPageNumbers(t.txtMonths, t.txtJanToJun, t.txtJanToDec, secondHalf).map((v) => ({
      content: formatAmount(v),
      styles: { ...bold, ...right },
    })),
  ]);

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: { top: tableTop, right: margin.right, bottom: margin.bottom, left: margin.left },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: pdfTableStyles(look),
    headStyles: pdfHeadStyles(look),
    columnStyles,
    head,
    body,
    didDrawPage: () =>
      drawReportTitle(
        doc,
        pageW,
        margin,
        { txtCoName: report.txtCoName, txtHeading: heading, txtReportInfo: report.txtReportInfo },
        report.txtBranch,
        look
      ),
  });
};

const buildMonthPdf = async (report: MonthReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  addMonthPage(doc, report, report.txtHeading, false, true, look);

  if (report.txtHeadingJulToDec !== "") {
    addMonthPage(doc, report, report.txtHeadingJulToDec, true, false, look);
  }

  addPageNumbers(doc, 297, pdfMargin(15), look);

  return doc.output("blob");
};

export const buildExpenseSumPdf = (report: PrintReport): Promise<Blob> =>
  report.rdgDate === 0 ? buildMonthPdf(report) : buildPeriodPdf(report);

// ---- For a Period: A4 portrait, Opening / Current / Closing ----

const buildPeriodPdf = async (report: PeriodReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = 210;
  const margin = pdfMargin(15);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = Object.fromEntries(
    COLUMN_WEIGHTS.map((w, i) => [i, { cellWidth: w * usable, ...(i >= FIRST_NUMBER_COLUMN ? right : {}) }])
  );

  const head: CellDef[][] = [
    ["Account ID", "Account Name", "Opening", "Current", "Closing"].map((content, i) => ({
      content,
      styles: { halign: i >= FIRST_NUMBER_COLUMN ? ("right" as const) : ("left" as const) },
    })),
  ];

  const body: CellDef[][] = report.lines.map((l) => {
    const color = LEVEL_COLORS[l.txtAccountLevel] ?? [0, 0, 0];
    const trimmed = l.txtAccountName.trimStart();
    const indent = (l.txtAccountName.length - trimmed.length) * SPACE_WIDTH;
    const amount = (value: number) => ({
      content: formatAmount(value),
      styles: { ...right, textColor: color },
    });

    return [
      { content: l.lkpAccountID, styles: { textColor: color } },
      {
        content: trimmed,
        styles: {
          textColor: color,
          cellPadding: {
            top: CELL_PADDING,
            right: REPORT_STYLE.pdf.cellPaddingX,
            bottom: CELL_PADDING,
            left: REPORT_STYLE.pdf.cellPaddingX + indent,
          },
        },
      },
      amount(l.txtOpening),
      amount(l.txtCurrent),
      amount(l.txtClosing),
    ];
  });

  // the Total row: the label over the two text columns
  const t = report.totals;

  body.push([
    { content: "Total :", colSpan: 2, styles: { ...bold, ...right } },
    { content: formatAmount(t.txtOpening), styles: { ...bold, ...right } },
    { content: formatAmount(t.txtCurrent), styles: { ...bold, ...right } },
    { content: formatAmount(t.txtClosing), styles: { ...bold, ...right } },
  ]);

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawReportTitle(doc, pageW, margin, report, report.txtBranch, look);

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
    styles: pdfTableStyles(look),
    headStyles: pdfHeadStyles(look),
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  addPageNumbers(doc, pageW, margin, look);

  return doc.output("blob");
};
