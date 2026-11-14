// reportStyle.ts
// THE LOOK OF THE REPORTS - print, Print Preview and PDF - in ONE place. Change the font, the sizes or the line
// colour here and every report that uses this file changes with it.
//
//   print / Print Preview : reportPrintCss()                     (below)
//   PDF                   : REPORT_STYLE.pdf + components/common/reportPdf.ts
//   Excel                 : made on the SERVER - Backend/utils/reportStyle.ts. The browser and the server are two
//                           projects and cannot share a file, so keep these two files in step (the same font,
//                           the same sizes, the same line colour).
//
// A report still decides what it shows (its columns, its blocks, its numbers); this file decides how it looks.

import { cssStr } from "./printHtml";

export const REPORT_STYLE = {
  // the font of every report: the HTML print uses fontFamily (then fontFallback), jsPDF its built-in pdfFont
  fontFamily: "Times New Roman",
  fontFallback: "serif",
  pdfFont: "times",

  // the colour of the thin lines of the tables
  lineColor: "#c7d1e4",

  // sizes in points
  size: {
    company: 14, // the company name
    heading: 12, // the heading of the report
    body: 9.75, // the table text (print)
    pdfBody: 9, // the table text (PDF)
    docBody: 9, // the text of a document print (Stock Transfer, Adjustment, Beginning Stock ...)
    group: 10.5, // a block heading: "Item : ...", "Branch : ...", "Supplier : ..."
    small: 8, // the report info (user and time) and "Page x of y"
  },

  // print / Print Preview, in pixels
  html: {
    rowHeight: 25,
    companyHeight: 36, // the company row: its text is at the top, the rest is the gap before the heading
    headingHeight: 26,
    subHeight: 24,
    groupHeight: 30,
    cellPaddingX: 8, // the space left and right inside a cell
    tableGap: 8, // the space between the branch / info line and the table
  },

  // PDF, in millimetres
  pdf: {
    cellPadding: 1.2, // top and bottom inside a cell
    cellPaddingX: 2, // left and right inside a cell
    tableGap: 2.2, // the space between the branch / info line and the table (8 px)
    lineWidth: 0.2,
    minCellHeight: 7,
    margin: { top: 12.7, right: 10, bottom: 12.7 },
    // the gap between the company name and the heading (the heading, the branch line and the table move down by it)
    titleGap: 2.5,
    // the table starts below the company, the heading and the branch line
    headerHeight: 29.5,
  },
} as const;

// THE LOOKS OF THE REPORTS - the font and EVERY size of a report, in one place, read by the print, the Print Preview and
// the PDF (and mirrored by the Excel file of the server, Backend/utils/reportStyle.ts, which has the same two looks).
//
//     classic   the old look: Times New Roman, the sizes of REPORT_STYLE.size
//     inter     the app font (src/index.css: Inter) and a text hierarchy:
//
//                   company name                    13.5 pt  =  18 px
//                   heading of the report           12   pt  =  16 px
//                   column labels                   10.5 pt  =  14 px
//                   block heading (Supplier : ...)   9   pt  =  12 px
//                   table text                       8.25 pt =  11 px
//                   report info, "Page x of y"       8   pt
//
// A report picks its look in ONE word:   reportPrintCss({ look: "inter", ... })   in its print / preview,
// registerReportPdfFont(doc, "inter")   in its PDF (components/common/reportPdf.ts) and the "inter" look of the Excel
// helpers on the server. It never writes a font name or a size. When every report is on "inter", the classic look is
// removed and the word is not needed any more.
//
// A printed page is its own document (a hidden iframe or the preview), which does not see the fonts of the app, so the
// print CSS of a look loads its web font itself (the same Google Fonts file the app loads).

export type ReportSizes = {
  company: number;
  heading: number;
  // the column labels; null = they take the table text size
  columnHead: number | null;
  group: number;
  body: number; // the table text (print)
  pdfBody: number; // the table text (PDF)
  docBody: number; // the text of a document print
  small: number;
};

type PdfFontFile = { file: string; style: "normal" | "bold" };

export type ReportLookDefinition = {
  // print / Print Preview
  css: { family: string; importCss: string };
  // PDF: the font name, and the TrueType files to embed (null = a built-in font of jsPDF)
  pdf: { font: string; files: readonly PdfFontFile[] | null };
  size: ReportSizes;
};

const INTER_IMPORT = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap");`;

export const REPORT_LOOKS = {
  classic: {
    css: { family: `"${REPORT_STYLE.fontFamily}", ${REPORT_STYLE.fontFallback}`, importCss: "" },
    pdf: { font: REPORT_STYLE.pdfFont, files: null },
    size: { ...REPORT_STYLE.size, columnHead: null },
  },
  inter: {
    css: { family: `"Inter", sans-serif`, importCss: INTER_IMPORT },
    pdf: {
      font: "Inter",
      files: [
        { file: "Inter-Regular.ttf", style: "normal" },
        { file: "Inter-Bold.ttf", style: "bold" },
      ],
    },
    size: {
      company: 13.5,
      heading: 12,
      columnHead: 10.5,
      group: 9,
      body: 8.25,
      pdfBody: 8.25,
      docBody: 8.25,
      small: 8,
    },
  },
} satisfies Record<string, ReportLookDefinition>;

export type ReportLook = keyof typeof REPORT_LOOKS;

export const reportLook = (look: ReportLook = "classic"): ReportLookDefinition => REPORT_LOOKS[look];

const columnHeadCss = (size: { columnHead: number | null }) =>
  size.columnHead ? `font-size: ${size.columnHead}pt; ` : "";

type PrintCssOptions = {
  // the look of the page (see REPORT_LOOKS above)
  look?: ReportLook;
  // A4 portrait or A4 landscape
  orientation: "portrait" | "landscape";
  // the left margin of the page, e.g. "20mm" (the others are the same on every report)
  marginLeft: string;
  // the cells that are a block heading ("Item : ...", "Branch : ..."): a CSS selector list, e.g. "td.group"
  groupSelector: string;
  // the report info ("<user>  dd/mm/yyyy hh:mm"): printed as  "Printed : ..."  at the bottom right of every page
  reportInfo?: string;
  // anything this report needs on top
  extra?: string;
};

// The CSS of a printed report: the page, the font, the title rows (company / heading / branch + info), the
// table, its lines and its Total rows. The report's own HTML uses these classes:
//   .co .head .sub (.info)       the title rows         th / th.r      the column labels (.r = right)
//   td / td.r / td.u             a cell, a number, a unit (a number or a unit is never split over two lines)
//   the group selector           a block heading        tr.tot / tr.first   a Total row / the first line of a block
export const reportPrintCss = ({ look = "classic", orientation, marginLeft, groupSelector, reportInfo, extra = "" }: PrintCssOptions) => {
  const { lineColor, html } = REPORT_STYLE;
  const { css, size } = reportLook(look);
  const { family: font, importCss } = css;

  return `${importCss}
  @page {
    size: A4 ${orientation};
    margin: 12.7mm 10mm 12.7mm ${marginLeft};
    @top-right { content: "Page " counter(page) " / " counter(pages); font: ${size.small}pt ${font}; }
    ${reportInfo ? `@bottom-right { content: "Printed : ${cssStr(reportInfo)}"; font: ${size.small}pt ${font}; }` : ""}
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${size.body}pt ${font}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* the heading repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${size.company}pt; text-align: center; height: ${html.companyHeight}px; vertical-align: top; }
  .head { font-size: ${size.heading}pt; text-align: center; height: ${html.headingHeight}px; }
  .sub  { height: ${html.subHeight + html.tableGap}px; vertical-align: top; } /* the gap under it is the space before the table */
  .sub div { display: flex; justify-content: space-between; gap: 16px; }
  .sub .info { ${reportInfo ? "display: none; " : ""}font-size: ${size.small}pt; } /* with a reportInfo it is printed at the bottom right of the page */
  th { border: 1px solid ${lineColor}; height: ${html.rowHeight}px;
       padding: 0 ${html.cellPaddingX}px; ${columnHeadCss(size)}font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid ${lineColor}; border-top: 0; height: ${html.rowHeight}px; padding: 0 ${html.cellPaddingX}px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  td.r, td.u { white-space: nowrap; }                /* a number or a unit is never split over two lines */
  ${groupSelector} { border: 0; height: ${html.groupHeight}px; padding-top: 8px; font-size: ${size.group}pt; }
  tr.tot td, tr.first td { border-top: 1px solid ${lineColor}; }
  ${extra}`;
};

type DocumentPrintCssOptions = {
  // the look of the page (see REPORT_LOOKS above)
  look?: ReportLook;
  orientation: "portrait" | "landscape";
  // the whole margin of the page, e.g. "12mm 10mm 14mm 15mm"
  margin: string;
  // the report info (user and time) for the bottom right of every page - already made safe with cssStr()
  reportInfo: string;
  // the space left and right inside a cell, in pixels
  cellPaddingX?: number;
  // anything this print needs on top
  extra?: string;
};

// The CSS of a printed DOCUMENT (Stock Transfer, Stock Adjustment, Beginning Stock, Beginning Balance, User
// Audit): the same font, sizes and line colour as a report, a little smaller text, and the report info at the
// bottom right of the page instead of under the heading. The title rows are .co .head and .info; the cells
// are th / td / .r and tr.tot, as in reportPrintCss.
export const documentPrintCss = ({
  look = "classic",
  orientation,
  margin,
  reportInfo,
  cellPaddingX = REPORT_STYLE.html.cellPaddingX,
  extra = "",
}: DocumentPrintCssOptions) => {
  const { lineColor, html } = REPORT_STYLE;
  const { css, size } = reportLook(look);
  const { family: font, importCss } = css;

  return `${importCss}
  @page {
    size: A4 ${orientation};
    margin: ${margin};
    @top-right    { content: "Page " counter(page) " / " counter(pages); font: ${size.small}pt ${font}; }
    @bottom-right { content: "Printed : ${reportInfo}"; font: ${size.small}pt ${font}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${size.docBody}pt ${font}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* the header repeats on every page */
  tr { page-break-inside: avoid; }
  /* the same spacing as a report (reportPrintCss): the company row, the heading, the info line and the rows */
  .co   { font-size: ${size.company}pt; text-align: center; height: ${html.companyHeight}px; vertical-align: top; }
  .head { font-size: ${size.heading}pt; text-align: center; height: ${html.headingHeight}px; }
  .info { height: ${html.subHeight + html.tableGap}px; vertical-align: top; }
  .info div { display: flex; justify-content: space-between; gap: 16px; }
  th { border: 1px solid ${lineColor}; height: ${html.rowHeight}px;
       padding: 0 ${cellPaddingX}px; ${columnHeadCss(size)}font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid ${lineColor}; border-top: 0; height: ${html.rowHeight}px; padding: 0 ${cellPaddingX}px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  tr.tot td { border-top: 1px solid ${lineColor}; }
  ${extra}`;
};
