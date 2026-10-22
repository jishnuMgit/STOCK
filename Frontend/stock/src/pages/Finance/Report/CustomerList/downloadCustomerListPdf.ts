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

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4
const HEAD_FILL: RGB = [239, 243, 250]; // #eff3fa
const BLACK: RGB = [0, 0, 0];

// VB Detail_BeforePrint: level 1 red, 2 green, 3 blue, else black
const LEVEL_COLOR: Record<number, RGB> = {
  1: [255, 0, 0],
  2: [0, 128, 0],
  3: [0, 0, 255],
};

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 15 };
const TABLE_TOP = 30; // below company / heading

// same column proportions as the printed page
const COL_PCT = [7.4, 24.4, 18.2, 14.9, 10.7, 10.5, 7.1, 6.8];

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

export const buildCustomerListPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
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
            right: PAD,
            left: PAD + lead * INDENT_PER_SPACE,
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
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15, { align: "center" });
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
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: PAD,
      lineColor: BORDER,
      lineWidth: 0.2,
      minCellHeight: 6.5,
      valign: "middle",
      overflow: "linebreak", // long addresses wrap, like the printed page
      textColor: BLACK,
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: BLACK,
      fontStyle: "normal",
    },
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
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, {
      align: "right",
    });
    doc.text(report.reportInfo, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, {
      align: "right",
    });
  }

  return doc.output("blob");
};
