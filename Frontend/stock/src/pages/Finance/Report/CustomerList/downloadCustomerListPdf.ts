// downloadCustomerListPdf.ts
// The Customer List as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 LANDSCAPE, company name, heading, then Customer ID / Name / Address /
// Contact / Phone / VAT No. / Credit Limit / Credit Days, coloured by account
// level. Column labels repeat on every page, page number top right, report
// info bottom right.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import type { PrintReport } from "./PrintCustomerListReport";

import { pdfHeadStyles, pdfTableStyles, registerReportPdfFont } from "../../../../components/common/reportPdf";
import { REPORT_STYLE } from "../../../../components/common/reportStyle";
type RGB = [number, number, number];
const BLACK: RGB = [0, 0, 0];

// VB Detail_BeforePrint: level 1 red, 2 green, 3 blue, else black
const LEVEL_COLOR: Record<number, RGB> = {
  1: [255, 0, 0],
  2: [0, 128, 0],
  3: [0, 0, 255],
};

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 15 };
const TABLE_TOP = 30 + REPORT_STYLE.pdf.tableGap; // below company / heading

// same column proportions as the printed page
const COL_PCT = [10.5, 18, 14.5, 12.5, 10.5, 12.5, 11, 10.5]; // wide enough for the 14 px labels with the cell padding

const PAD = 1.2;
const INDENT_PER_SPACE = 1.0; // mm: the leading spaces of the name become padding

const money = (v: number | null) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const whole = (v: number | null) =>
  v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

export const buildCustomerListPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = {};
  COL_PCT.forEach((p, i) => {
    columnStyles[i] = {
      cellWidth: (p / 100) * usable,
      ...(i >= 6 ? { halign: "right" as const } : {}),
    };
  });

  const body: CellDef[][] = report.rows.map((r) => {
    const color = LEVEL_COLOR[r.accountLevel] ?? BLACK;
    const lead = /^ */.exec(r.accountName)?.[0].length ?? 0;
    const base = { textColor: color };
    const right = { textColor: color, halign: "right" as const };

    return [
      { content: r.accountId, styles: base },
      {
        content: r.accountName.trimStart(),
        styles: {
          textColor: color,
          cellPadding: {
            top: PAD,
            bottom: PAD,
            right: REPORT_STYLE.pdf.cellPaddingX,
            left: REPORT_STYLE.pdf.cellPaddingX + lead * INDENT_PER_SPACE,
          },
        },
      },
      { content: r.address, styles: base },
      { content: r.contact, styles: base },
      { content: r.phone, styles: base },
      { content: r.vatNo, styles: base },
      { content: money(r.creditLimit), styles: right },
      { content: whole(r.creditDays), styles: right },
    ];
  });

  // company / heading - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.company);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(look.size.heading);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15 + REPORT_STYLE.pdf.titleGap, { align: "center" });
  };

  const labels = [
    "Customer ID",
    "Customer Name",
    "Address",
    "Contact",
    "Phone",
    "VAT No.",
    "Credit Limit",
    "Credit Days",
  ];

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
    styles: pdfTableStyles(look), // long addresses wrap, like the printed page
    headStyles: pdfHeadStyles(look),
    columnStyles,
    head: [
      labels.map((t, i) => ({
        content: t,
        styles: { halign: i >= 6 ? ("right" as const) : ("left" as const) },
      })),
    ],
    body,
    didDrawPage: drawTitle,
  });

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.small);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, {
      align: "right",
    });
    doc.text(`Printed : ${report.reportInfo}`, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, {
      align: "right",
    });
  }

  return doc.output("blob");
};
