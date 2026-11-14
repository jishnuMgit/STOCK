
import { REPORT_STYLE } from "../../../components/common/reportStyle";
import { PDF_CELL_PADDING } from "../../../components/common/reportPdf";
/* =========================================================
   ZATCA DOCUMENT STATUS - the printed report (port of rptZATCADoxStatusrpt)
   Same design as the Item History report: Times New Roman, light-blue borders,
   "Page x of y" top right, report info bottom right of every page.
   - buildReportHtml: used by the print preview and the printer
   - printZatcaDocumentStatusReport: browser print dialog (hidden iframe, no pop-up)
   - buildPdfBlob: the PDF file (saved by the page with saveFile)
   (The Excel file is built on the server - see zatcaDocumentStatusExcel.ts.)
   Needs:  npm i jspdf jspdf-autotable   (loaded only when the PDF is made)
========================================================= */

export type ReportRow = {
  branchId: string;
  docType: string;
  docNo: string;
  docDate: string;
  issueTime: string;
  submitTime: string;
  customerId: string;
  customerName: string;
  amountExVat: number;
  vatAmount: number;
  amountInVat: number;
};

export type ReportData = {
  coName: string;
  heading: string;
  branchLabel: string; // "" when All Branch
  reportInfo: string; // "<user>  DD-MM-YYYY hh:mm" - bottom right of every page
  rows: ReportRow[];
  totals: { amountExVat: number; vatAmount: number; amountInVat: number };
};

const HEAD = [
  "Sl.#",
  "Br. ID",
  "Type",
  "Doc. No.",
  "Doc. Date",
  "Doc. Issue Time",
  "Submission Time",
  "Customer ID",
  "Customer Name",
  "Amount Excl. VAT",
  "VAT Amt.",
  "Amount Incl. VAT",
];

// column proportions (%), shared by the printed page and the PDF
const COL_PCT = [4, 5, 5, 11, 8, 12, 12, 8, 13, 8, 6, 8];

const money = (n: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// text placed inside a CSS string ("...") in the print stylesheet
const cssStr = (v: unknown): string =>
  String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\3C ")
    .replace(/[\r\n]+/g, " ");

// Sl.# counts only the rows that carry a document no. (Detail_BeforePrint of the VB report)
const bodyOf = (d: ReportData) => {
  let sl = 0;
  return d.rows.map((r) => {
    if (r.docNo) sl += 1;
    return [
      r.docNo ? String(sl) : "",
      r.branchId,
      r.docType,
      r.docNo,
      r.docDate,
      r.issueTime,
      r.submitTime,
      r.customerId,
      r.customerName,
      r.amountExVat,
      r.vatAmount,
      r.amountInVat,
    ] as (string | number)[];
  });
};

/* ---------------------------------------------------------
   HTML (preview + print) - A4 landscape, company / heading / branch repeat on every page
--------------------------------------------------------- */

export const buildReportHtml = (d: ReportData): string => {
  const rows = bodyOf(d)
    .map(
      (r) =>
        `<tr>${r
          .map((v, i) =>
            i >= 9
              ? `<td class="r">${esc(money(v as number))}</td>`
              : `<td>${esc(v)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(d.heading)}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12mm 10mm 14mm 12mm;
    @top-right    { content: "Page " counter(page) " / " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(d.reportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* company / heading repeat on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: ${REPORT_STYLE.html.companyHeight}px; vertical-align: top; }
  .head { font-size: 12pt; text-align: center; height: ${REPORT_STYLE.html.headingHeight}px; }
  .br   { font-size: 9pt;  text-align: left;   height: ${REPORT_STYLE.html.subHeight + REPORT_STYLE.html.tableGap}px; vertical-align: top; }
  th { border: 1px solid ${REPORT_STYLE.lineColor}; height: ${REPORT_STYLE.html.rowHeight}px;
       padding: 0 ${REPORT_STYLE.html.cellPaddingX}px; font-weight: normal; text-align: left; }
  td { border: 1px solid ${REPORT_STYLE.lineColor}; border-top: 0; height: ${REPORT_STYLE.html.rowHeight}px; padding: 2px ${REPORT_STYLE.html.cellPaddingX}px;
       word-wrap: break-word; overflow-wrap: anywhere; }
  .r { text-align: right; }
  .tot td { border-top: 1px solid ${REPORT_STYLE.lineColor}; font-weight: bold; }
</style>
</head>
<body>
<table class="main">
  <colgroup>
    ${COL_PCT.map((p) => `<col style="width:${p}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="12" class="co"   style="border:0">${esc(d.coName)}</td></tr>
    <tr><td colspan="12" class="head" style="border:0">${esc(d.heading)}</td></tr>
    <tr><td colspan="12" class="br"   style="border:0">${esc(d.branchLabel)}</td></tr>
    <tr>${HEAD.map((h, i) => `<th${i >= 9 ? ' class="r"' : ""}>${h}</th>`).join("")}</tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="tot">
      <td colspan="9" class="r">Total :</td>
      <td class="r">${esc(money(d.totals.amountExVat))}</td>
      <td class="r">${esc(money(d.totals.vatAmount))}</td>
      <td class="r">${esc(money(d.totals.amountInVat))}</td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

/* ---------------------------------------------------------
   PRINT - sends the report to the printer (browser print dialog, hidden iframe)
--------------------------------------------------------- */

export const printZatcaDocumentStatusReport = (report: ReportData): void => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("Could not open the print view");
  }

  doc.open();
  doc.write(buildReportHtml(report));
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup);

  // let the iframe lay out before printing
  setTimeout(() => {
    win.focus();
    win.print();
    // some browsers never fire afterprint: remove it anyway after a minute
    setTimeout(() => iframe.remove(), 60000);
  }, 250);
};

/* ---------------------------------------------------------
   PDF - returned as a Blob; the page saves it with saveFile (Save as window)
   A4 landscape, same look as the Item History PDF
--------------------------------------------------------- */

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // ${REPORT_STYLE.lineColor}

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 12 };
const TABLE_TOP = 36; // below company / heading / branch

export const buildPdfBlob = async (d: ReportData): Promise<Blob> => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;
  const body = bodyOf(d).map((r) => r.map((v, i) => (i >= 9 ? money(v as number) : String(v))));

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = {};
  COL_PCT.forEach((p, i) => {
    columnStyles[i] = { cellWidth: (p / 100) * usable, ...(i >= 9 ? { halign: "right" as const } : {}) };
  });

  // company / heading / branch - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(d.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text(d.heading, PAGE_W / 2, MARGIN.top + 15, { align: "center" });

    doc.setFontSize(9);
    if (d.branchLabel) doc.text(d.branchLabel, MARGIN.left, MARGIN.top + 22);
  };

  autoTable(doc, {
    theme: "plain",
    startY: TABLE_TOP,
    margin: { top: TABLE_TOP, right: MARGIN.right, bottom: MARGIN.bottom, left: MARGIN.left },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    showFoot: "lastPage", // the total prints once, at the end
    head: [HEAD],
    body,
    foot: [
      [
        { content: "Total :", colSpan: 9, styles: { halign: "right" } },
        money(d.totals.amountExVat),
        money(d.totals.vatAmount),
        money(d.totals.amountInVat),
      ],
    ],
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: PDF_CELL_PADDING,
      lineColor: BORDER,
      lineWidth: 0.2,
      minCellHeight: REPORT_STYLE.pdf.minCellHeight,
      valign: "middle",
      overflow: "linebreak",
      textColor: [0, 0, 0],
    },
    headStyles: { fontStyle: "normal", textColor: [0, 0, 0] },
    footStyles: { fontStyle: "bold", textColor: [0, 0, 0] },
    columnStyles,
    didParseCell: (h) => {
      if (h.section === "head" && h.column.index >= 9) h.cell.styles.halign = "right";
    },
    didDrawPage: drawTitle,
  });

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, { align: "right" });
    doc.text(d.reportInfo, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, { align: "right" });
  }

  return doc.output("blob");
};
