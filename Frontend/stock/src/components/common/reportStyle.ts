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
    tableGap: 5, // the space between the branch / info line and the table
    lineWidth: 0.5, // the lines of a table, in pixels (the one value for every report and document print)
  },

  // PDF, in millimetres
  pdf: {
    cellPadding: 1.2, // top and bottom inside a cell
    cellPaddingX: 2, // left and right inside a cell
    tableGap: 2.2, // the space between the branch / info line and the table (8 px)
    lineWidth: 0.2, // the lines of a table, in mm (the one value for every report and document PDF)
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
//   tbody.keep                   a block that must not be split over two pages: it starts on the next page when it does
//                                not fit in what is left of this one (a block taller than a page still splits)
//   tbody.newpage                a block that always starts on a new page (add it to every block but the first)
export const reportPrintCss = ({ look = "classic", orientation, marginLeft, groupSelector, reportInfo, extra = "" }: PrintCssOptions) => {
  const { lineColor, html } = REPORT_STYLE;
  const { css, size } = reportLook(look);
  const { family: font, importCss } = css;

  return `${importCss}
  @page {
    size: A4 ${orientation};
    margin: 12.7mm 10mm 12.7mm ${marginLeft};
    @top-right { content: "Page " counter(page) " of " counter(pages); font: ${size.small}pt ${font}; }
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
  th { border: ${REPORT_STYLE.html.lineWidth}px solid ${lineColor}; height: ${html.rowHeight}px;
       padding: 0 ${html.cellPaddingX}px; ${columnHeadCss(size)}font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: ${REPORT_STYLE.html.lineWidth}px solid ${lineColor}; border-top: 0; height: ${html.rowHeight}px; padding: 0 ${html.cellPaddingX}px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  td.r, td.u { white-space: nowrap; }                /* a number or a unit is never split over two lines */
  ${groupSelector} { border: 0; height: ${html.groupHeight}px; padding-top: 8px; font-size: ${size.group}pt; }
  tr.tot td, tr.first td { border-top: ${REPORT_STYLE.html.lineWidth}px solid ${lineColor}; }
  tbody.newpage { break-before: page; page-break-before: always; } /* a block that starts on a new page (not the first one) */
  tbody.keep { break-inside: avoid; page-break-inside: avoid; } /* a block (<tbody class="keep">) is never split over two pages */
  ${extra}`;
};

// THE STOCK DOCUMENT LOOK - the print of a stock document (Stock Transfer first; Stock Adjustment, Beginning Stock ... follow): ask for it
// with documentPrintCss({ stockLook: true, ... }). One place for its text sizes, row heights, cell spaces and the table lines, so every
// document that uses it looks the same. (The PDF has the same look in reportPdf.ts: STOCK_DOCUMENT_PDF.)
//   - the line under the heading (Branch, Entry No., Date, Transfer To) is 11 px, the Entry No. itself 14 px;
//   - the column headings are 11 px, the same as the rows;
//   - the table lines are a whole 1 px in a light colour (a fraction of a pixel is drawn thicker on some lines and thinner on others);
//   - the line numbers (td.c) and the Line heading are in the middle of a narrow column, a unit (td.u) is never split over two lines;
//   - .pagerow is the line of its own for "Page x of y" under the heading, tr.note the "Note :" line after the Total row.
// the size of the "Created By : ..." line at the bottom right of a stock document: 9 px ("Page x of y" stays 11 px)
export const STOCK_DOCUMENT_FOOTER_SIZE = "9px";

export const STOCK_DOCUMENT_CSS = `.info { font-size: 11px; height: 25px; } .info .entry b { font-size: 16px; } .info .date { text-align: right; padding-right: 12px; } /* the Date ends 12 px in from the right edge of the table */ /* the height is the space between the Branch line and the table (the common one is 32 px) */
  th { font-size: 11px; } /* the column headings are 11 px, the same as the rows */
  tr.note td { padding: 10px 0 0 0; white-space: pre-wrap; } /* the "Note :" line after the Total row, at the left side - printed even when the note is empty */
  td.u { white-space: nowrap; padding: 0 4px; } /* a unit (NOS.) is never split over two lines, even in a narrow column */
  td.c { text-align: center; padding: 0 2px; white-space: nowrap; } /* the line numbers are in the middle of their column, with only 2 px of space on each side */
  th:first-child { padding: 0 4px; text-align: center; } /* the Line heading: in the middle, 4 px on each side - the same space on both sides, like the numbers below it */
  th { border-color: #e2e8f2; } /* the table lines: lighter than the common #c7d1e4, a whole 1 px */
  td { border-color: #e2e8f2; }
  tr.tot td { border-top: 1px solid #e2e8f2; }
  tr.note td { border: 0; }
  .info, .pagerow, .co, .head { border: 0; }
  td.info { padding: 0; } /* the info line has no cell space: Branch starts at the left edge of the table, the Date ends where "Page x of y" ends */
  .pagerow { height: 20px; } /* the line of its own for "Page x of y", between the heading and the Branch line */`;

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
  // the word before the report info at the bottom right: "Printed" (default) or e.g. "Created By"
  infoLabel?: string;
  // the size of "Page x of y" and "Printed : ..." as a CSS length, e.g. "11px" (default: the look's small size, 8pt)
  smallSize?: string;
  // the stock document look (see STOCK_DOCUMENT_CSS): its rules are added, and "Page x of y" / the bottom line are 11 px
  stockLook?: boolean;
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
  cellPaddingX: cellPaddingXOption,
  smallSize: smallSizeOption,
  infoLabel = "Printed",
  stockLook = false,
  extra = "",
}: DocumentPrintCssOptions) => {
  const smallSize = smallSizeOption ?? (stockLook ? "11px" : undefined);
  // the space left and right inside a cell: the page's own, else 4 px on a stock document (the common one is 8 px)
  const cellPaddingX = cellPaddingXOption ?? (stockLook ? 4 : REPORT_STYLE.html.cellPaddingX);
  const { lineColor, html } = REPORT_STYLE;
  const { css, size } = reportLook(look);
  const { family: font, importCss } = css;

  return `${importCss}
  @page {
    size: A4 ${orientation};
    margin: ${margin};
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: ${smallSize ?? `${size.small}pt`} ${font}; }
    @bottom-right { content: "${infoLabel} : ${reportInfo}"; font: ${stockLook ? STOCK_DOCUMENT_FOOTER_SIZE : (smallSize ?? `${size.small}pt`)} ${font}; }
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
  th { border: ${REPORT_STYLE.html.lineWidth}px solid ${lineColor}; height: ${html.rowHeight}px;
       padding: 0 ${cellPaddingX}px; ${columnHeadCss(size)}font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: ${REPORT_STYLE.html.lineWidth}px solid ${lineColor}; border-top: 0; height: ${html.rowHeight}px; padding: 0 ${cellPaddingX}px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  tr.tot td { border-top: ${REPORT_STYLE.html.lineWidth}px solid ${lineColor}; }
  ${stockLook ? STOCK_DOCUMENT_CSS : ""}
  ${extra}`;
};
