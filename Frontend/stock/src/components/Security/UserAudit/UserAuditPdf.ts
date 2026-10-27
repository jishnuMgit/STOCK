// UserAuditPdf.ts
// The User Audit report as a PDF (returned as a Blob; saveFile.ts saves it): A4
// landscape, company name, the period heading, then by user "User ID : X" and that
// user's rows (Sl.# / Year / Br. ID / Doc. Type / Doc. No. / Screen / Action / Audit
// Note / Audit Date). Column labels repeat on every page, page number top right,
// report info bottom right.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import { groupByUser, periodHeading, type PrintReport } from "./UserAuditPrintReport";

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4
const BLACK: RGB = [0, 0, 0];

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 15 };

const PAD = 1.2;

export const buildUserAuditPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // below the company name and the heading
  const tableTop = MARGIN.top + 22;

  // Sl.# | Year | Br. ID | Doc. Type | Doc. No. | Screen | Action | Audit Note (the rest) | Audit Date
  const widths = [12, 14, 14, 20, 30, 40, 16, 0, 38];
  const noteW = usable - widths.reduce((sum, width) => sum + width, 0);
  widths[7] = noteW;

  const columnStyles = Object.fromEntries(
    widths.map((width, index) => [index, { cellWidth: width }])
  );

  const body: CellDef[][] = [];

  for (const group of groupByUser(report.rows)) {
    // the "User ID : X" line of the group
    body.push([
      {
        content: `User ID : ${group.txtUserID}`,
        colSpan: 9,
        styles: { fontStyle: "bold" as const, lineWidth: 0 },
      },
    ]);

    group.items.forEach((row, index) => {
      body.push([
        { content: String(index + 1) },
        { content: row.txtYear ?? "" },
        { content: row.txtBranchID ?? "" },
        { content: row.txtDocType ?? "" },
        { content: row.txtDocNo ?? "" },
        { content: row.txtScreenName ?? "" },
        { content: row.txtAction ?? "" },
        { content: row.txtAuditNote ?? "" },
        { content: row.txtAuditDate ?? "" },
      ]);
    });
  }

  // company / heading - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.text(report.txtCompanyName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(12);
    doc.text(periodHeading(report), PAGE_W / 2, MARGIN.top + 15, { align: "center" });
  };

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: {
      top: tableTop,
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
      minCellHeight: 7,
      valign: "top",
      overflow: "linebreak",
      textColor: BLACK,
    },
    headStyles: {
      textColor: BLACK,
      fontStyle: "normal",
      valign: "middle",
    },
    columnStyles,
    head: [
      [
        "Sl.#",
        "Year",
        "Br. ID",
        "Doc. Type",
        "Doc. No.",
        "Screen",
        "Action",
        "Audit Note",
        "Audit Date",
      ].map((content) => ({ content, styles: { halign: "left" as const } })),
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
    doc.text(report.txtReportInfo, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, {
      align: "right",
    });
  }

  return doc.output("blob");
};
