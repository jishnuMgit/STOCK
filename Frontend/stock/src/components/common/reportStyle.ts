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
    companyHeight: 26,
    headingHeight: 26,
    subHeight: 24,
    groupHeight: 30,
    cellPaddingX: 4,
  },

  // PDF, in millimetres
  pdf: {
    cellPadding: 1.2,
    lineWidth: 0.2,
    minCellHeight: 7,
    margin: { top: 12.7, right: 10, bottom: 12.7 },
    // the table starts below the company, the heading and the branch line
    headerHeight: 27,
  },
} as const;

type PrintCssOptions = {
  // A4 portrait or A4 landscape
  orientation: "portrait" | "landscape";
  // the left margin of the page, e.g. "20mm" (the others are the same on every report)
  marginLeft: string;
  // the cells that are a block heading ("Item : ...", "Branch : ..."): a CSS selector list, e.g. "td.group"
  groupSelector: string;
  // anything this report needs on top
  extra?: string;
};

// The CSS of a printed report: the page, the font, the title rows (company / heading / branch + info), the
// table, its lines and its Total rows. The report's own HTML uses these classes:
//   .co .head .sub (.info)       the title rows         th / th.r      the column labels (.r = right)
//   td / td.r / td.u             a cell, a number, a unit (a number or a unit is never split over two lines)
//   the group selector           a block heading        tr.tot / tr.first   a Total row / the first line of a block
export const reportPrintCss = ({ orientation, marginLeft, groupSelector, extra = "" }: PrintCssOptions) => {
  const { fontFamily, fontFallback, lineColor, size, html } = REPORT_STYLE;
  const font = `"${fontFamily}", ${fontFallback}`;

  return `
  @page {
    size: A4 ${orientation};
    margin: 12.7mm 10mm 12.7mm ${marginLeft};
    @top-right { content: "Page " counter(page) " of " counter(pages); font: ${size.small}pt ${font}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${size.body}pt ${font}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* the heading repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${size.company}pt; text-align: center; height: ${html.companyHeight}px; }
  .head { font-size: ${size.heading}pt; text-align: center; height: ${html.headingHeight}px; }
  .sub  { height: ${html.subHeight}px; }
  .sub div { display: flex; justify-content: space-between; gap: 16px; }
  .sub .info { font-size: ${size.small}pt; }
  th { border: 1px solid ${lineColor}; height: ${html.rowHeight}px;
       padding: 0 ${html.cellPaddingX}px; font-weight: normal; text-align: left; }
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
  orientation,
  margin,
  reportInfo,
  cellPaddingX = 4,
  extra = "",
}: DocumentPrintCssOptions) => {
  const { fontFamily, fontFallback, lineColor, size } = REPORT_STYLE;
  const font = `"${fontFamily}", ${fontFallback}`;

  return `
  @page {
    size: A4 ${orientation};
    margin: ${margin};
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: ${size.small}pt ${font}; }
    @bottom-right { content: "${reportInfo}"; font: ${size.small}pt ${font}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${size.docBody}pt ${font}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* the header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${size.company}pt; text-align: center; height: 24px; }
  .head { font-size: ${size.heading}pt; text-align: center; height: 24px; }
  .info { height: 22px; }
  .info div { display: flex; justify-content: space-between; gap: 16px; }
  th { border: 1px solid ${lineColor}; height: 24px;
       padding: 0 ${cellPaddingX}px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid ${lineColor}; border-top: 0; min-height: 22px; padding: 2px ${cellPaddingX}px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  tr.tot td { border-top: 1px solid ${lineColor}; }
  ${extra}`;
};
