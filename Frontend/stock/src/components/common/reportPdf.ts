// reportPdf.ts
// The parts every PDF report has in common - the font, the table style, the title on every page and "Page x of y" -
// built from components/common/reportStyle.ts, so that the look of all the PDFs is changed in that one file.
//
// A report in the shared look (REPORT_LOOKS in reportStyle.ts - "classic" or "inter") needs only this in its PDF:
//
//     const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
//     const look = await registerReportPdfFont(doc, "inter");     // the font, embedded; the sizes of the look
//     ...
//     autoTable(doc, { styles: pdfTableStyles(look), headStyles: pdfHeadStyles(look), ... });
//     drawReportTitle(doc, pageW, margin, report, branch, look);  // company, heading, branch + info - every page
//     addPageNumbers(doc, pageW, margin, look);                   // "Page x of y"
//     // a block heading row:    styles: { ...pdfGroupStyles(look) }
//     // a column-label row in the body:   styles: { fontSize: pdfLabelFontSize(look) }
//
// A report never writes a font name or a size: they all come from the look.
import type { jsPDF } from "jspdf";
import autoTable, { type CellDef, type CellHookData, type UserOptions } from "jspdf-autotable";

import { REPORT_STYLE, reportLook, type ReportLook, type ReportSizes } from "./reportStyle";

export type RGB = [number, number, number];

export const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export const PDF_BLACK: RGB = [0, 0, 0];

// the space inside a cell: 1.2 mm above and below, 2 mm left and right (REPORT_STYLE.pdf)
export const PDF_CELL_PADDING = {
  top: REPORT_STYLE.pdf.cellPadding,
  bottom: REPORT_STYLE.pdf.cellPadding,
  left: REPORT_STYLE.pdf.cellPaddingX,
  right: REPORT_STYLE.pdf.cellPaddingX,
};

/* ---------------------------------------------------------
   THE FONT IN A PDF

   jsPDF cannot use the fonts of the browser or of the system: a font has to be a TrueType file, fetched once and
   embedded in the PDF. The files of a look are named in REPORT_LOOKS (reportStyle.ts) and kept in the public folder
   (served as /fonts/...):

       public/fonts/Inter-Regular.ttf      the normal text
       public/fonts/Inter-Bold.ttf         the bold text (Total rows, block headings)

   Without the files the PDF is still made, in the built-in font of the classic look (a note is written to the
   console), with the sizes of the look.
--------------------------------------------------------- */

// what a PDF report works with: the font to use and the sizes of the look (see reportStyle.ts)
export type PdfLook = { font: string; size: ReportSizes };

// the classic look: the built-in font, the sizes of REPORT_STYLE - what a report gets when it asks for nothing
const CLASSIC: PdfLook = { font: REPORT_STYLE.pdfFont, size: reportLook("classic").size };

const bytesToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

// a real TrueType / OpenType file starts with 00 01 00 00, "true" or "OTTO" - the dev server answers a missing file with
// the web page itself, which must not be embedded
const isFontFile = (buffer: ArrayBuffer) => {
  const head = new Uint8Array(buffer.slice(0, 4));
  const text = String.fromCharCode(...head);
  return (head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0) || text === "true" || text === "OTTO";
};

type LoadedFont = { file: string; style: string; data: string };

// the files of a look, fetched once (and again next time when a file was missing)
const loadedFonts = new Map<ReportLook, Promise<LoadedFont[] | null>>();

const loadLookFonts = (look: ReportLook) => {
  let loading = loadedFonts.get(look);

  if (!loading) {
    const files = reportLook(look).pdf.files ?? [];

    loading = Promise.all(
      files.map(async ({ file, style }) => {
        const response = await fetch(`${import.meta.env.BASE_URL}fonts/${file}`);
        if (!response.ok) throw new Error(`${file} not found (${response.status})`);

        const buffer = await response.arrayBuffer();
        if (!isFontFile(buffer)) throw new Error(`${file} is not a font file`);

        return { file, style, data: bytesToBase64(buffer) };
      })
    ).catch((error) => {
      console.warn(`PDF font of the look "${look}" is not available, the PDF uses the built-in font:`, error);
      loadedFonts.delete(look); // try again next time
      return null;
    });

    loadedFonts.set(look, loading);
  }

  return loading;
};

// Embeds the font of the look in the PDF and returns what the helpers below need: the font to use and the sizes.
// Call it right after  new jsPDF(...)  and keep what it returns.
export const registerReportPdfFont = async (doc: jsPDF, look: ReportLook = "classic"): Promise<PdfLook> => {
  const { pdf, size } = reportLook(look);

  // a look without font files uses a built-in font of jsPDF
  if (!pdf.files) return { font: pdf.font, size };

  const fonts = await loadLookFonts(look);
  if (!fonts) return { font: CLASSIC.font, size };

  for (const { file, style, data } of fonts) {
    doc.addFileToVFS(file, data);
    doc.addFont(file, pdf.font, style);
  }
  return { font: pdf.font, size };
};

export type PdfMargin = { top: number; right: number; bottom: number; left: number };

// the margins of a page: the top, right and bottom are the same on every report, the left is the report's own
export const pdfMargin = (left: number): PdfMargin => ({ ...REPORT_STYLE.pdf.margin, left });

// where the table starts: below the company, the heading and the branch line
export const pdfTableTop = (margin: PdfMargin) => margin.top + REPORT_STYLE.pdf.headerHeight + REPORT_STYLE.pdf.tableGap;

// the `styles` of jspdf-autotable: the font, its size, the padding, the thin light lines
export const pdfTableStyles = (look: PdfLook = CLASSIC) => ({
  font: look.font,
  fontSize: look.size.pdfBody,
  cellPadding: PDF_CELL_PADDING,
  lineColor: hexToRgb(REPORT_STYLE.lineColor),
  lineWidth: REPORT_STYLE.pdf.lineWidth,
  minCellHeight: REPORT_STYLE.pdf.minCellHeight,
  valign: "middle" as const,
  overflow: "linebreak" as const,
  textColor: PDF_BLACK,
});

// the size of a column label: the look's own, or the table text when the look has none
export const pdfLabelFontSize = (look: PdfLook = CLASSIC) => look.size.columnHead ?? look.size.pdfBody;

// the `headStyles` of jspdf-autotable: the column labels
export const pdfHeadStyles = (look: PdfLook = CLASSIC) => ({
  textColor: PDF_BLACK,
  fontStyle: "normal" as const,
  fontSize: pdfLabelFontSize(look),
});

// THE STOCK DOCUMENT LOOK for the PDF (the preview has the same look in reportStyle.ts: STOCK_DOCUMENT_CSS). A stock document PDF
// (Stock Transfer first) takes its table from stockDocumentTable(look) and its note from drawNoteAfterTotal().
export const STOCK_DOCUMENT_PDF = {
  cellPaddingX: 1.3, // mm, left and right inside a cell (the common one is 2 mm)
  lineCellPaddingX: 0.8, // mm, the first column (Line) is narrow: less space on each side
  lineWidth: 0.1, // mm - the table lines are thin ...
  lineColor: [226, 232, 242] as RGB, // ... and light (#e2e8f2)
  infoSize: 8.25, // pt = 11 px, the line under the heading
  entrySize: 12, // pt = 16 px, the Entry No. itself
  spaceAfterHeading: 3, // mm - the room under the heading for the line of "Page x of y"
  shiftLeft: 4, // mm - the Date and "Page x of y" end this far to the left of the right edge of the table
  footerSize: 6.75, // pt = 9 px, the "Created By : ..." line at the bottom right ("Page x of y" stays 11 px)
};

// the table options of a stock document: the styles, the column heading styles and didParseCell. Every line is drawn ONCE (a cell draws
// only its right and bottom side; the first column also its left, the heading row its top) - when each cell drew all four sides, a
// line shared by two cells was drawn twice and showed darker than the outer lines.
export const stockDocumentTable = (
  look: PdfLook = CLASSIC,
  cellPaddingX: number = STOCK_DOCUMENT_PDF.cellPaddingX,
  // the space in the first column: the narrow Line column has less (default); a document whose first column holds text passes `cellPaddingX`
  lineCellPaddingX: number = STOCK_DOCUMENT_PDF.lineCellPaddingX
) => {
  const { lineWidth, lineColor } = STOCK_DOCUMENT_PDF;
  const padding = REPORT_STYLE.pdf.cellPadding;

  return {
    styles: {
      ...pdfTableStyles(look),
      cellPadding: { top: padding, bottom: padding, left: cellPaddingX, right: cellPaddingX },
      overflow: "ellipsize" as const,
      lineWidth,
      lineColor,
    },
    // the column headings are the size of the rows
    headStyles: { ...pdfHeadStyles(look), fontSize: look.size.pdfBody, lineWidth, lineColor },
    didParseCell: (hook: CellHookData) => {
      // a cell that names its own line width (a text row with no lines: lineWidth 0, or its own sides) keeps it
      const own = (hook.cell.raw as { styles?: { lineWidth?: unknown } } | null | undefined)?.styles?.lineWidth;
      if (own !== undefined) {
        hook.cell.styles.lineWidth = own as never;
        return;
      }

      const first = hook.column.index === 0;
      if (first) hook.cell.styles.cellPadding = { top: padding, bottom: padding, left: lineCellPaddingX, right: lineCellPaddingX };
      const topRow = hook.section === "head" && hook.row.index === 0;
      hook.cell.styles.lineWidth = { top: topRow ? lineWidth : 0, right: lineWidth, bottom: lineWidth, left: first ? lineWidth : 0 };
    },
  };
};

// the "Note :" line after the Total row, at the left - printed even when the note is empty. It goes on a new page (with the title
// drawn again, and the note at `tableTop`) when it does not fit under the table.
export const drawNoteAfterTotal = (
  doc: jsPDF,
  look: PdfLook,
  note: string | null | undefined,
  where: { x: number; width: number; bottom: number; tableTop: number; drawTitle: () => void }
) => {
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const noteLines = doc.splitTextToSize(`Note : ${note ?? ""}`.trimEnd() || "Note :", where.width) as string[];
  let noteY = finalY + 7;

  if (noteY + noteLines.length * 5 > doc.internal.pageSize.getHeight() - where.bottom) {
    doc.addPage();
    where.drawTitle();
    noteY = where.tableTop;
  }

  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.pdfBody);
  doc.setTextColor(0, 0, 0);
  doc.text(noteLines, where.x, noteY);
};

// The info line of a stock document: Branch at the left, Entry No. in the middle of the page (the entry number itself bigger), Date at the
// right end. A branch name can be up to 40 characters (30 are common): a Branch too long for the space before the Entry No. is cut
// short with "...". `y` is the baseline; `left` and `right` are the edges of the table (mm).
export const drawStockInfoLine = (
  doc: jsPDF,
  // dateRight: where the Date ends (default: the right edge of the table) - a little to the left of it when the page wants it
  o: { y: number; left: number; right: number; dateRight?: number; branch: string; entryNo?: string; date: string }
) => {
  const { infoSize: small, entrySize: big } = STOCK_DOCUMENT_PDF;
  const width = (text: string, size: number = small) => {
    doc.setFontSize(size);
    return doc.getTextWidth(text);
  };
  const cut = (text: string, max: number) => {
    let out = text;
    while (out.length > 1 && width(`${out}...`) > max) out = out.slice(0, -1);
    return `${out}...`;
  };

  const entryLabel = "Entry No. : ";
  const hasEntry = o.entryNo !== undefined;
  const entryWidth = hasEntry ? width(entryLabel) + width(o.entryNo as string, big) : 0;
  const entryX = o.left + (o.right - o.left) / 2 - entryWidth / 2;
  let branchText = `Branch : ${o.branch}`;
  // with an Entry No. the Branch ends before it; without one (Beginning Stock) it ends before the Date
  const branchMax = hasEntry ? entryX - o.left - 5 : o.right - o.left - width(`Date : ${o.date}`) - 10;
  if (width(branchText) > branchMax) branchText = cut(branchText, branchMax);

  doc.setFontSize(small);
  doc.text(branchText, o.left, o.y);
  if (hasEntry) {
    doc.text(entryLabel, entryX, o.y);
    doc.setFontSize(big);
    doc.text(o.entryNo as string, entryX + width(entryLabel, small), o.y);
    doc.setFontSize(small);
  }
  doc.text(`Date : ${o.date}`, o.dateRight ?? o.right, o.y, { align: "right" });
};

// The stock look for a REPORT PDF (Supplier Purchase first): the company and the heading as on every report, the line under the heading
// (the branch) 11 px, "Page x of y" on a line of its own (addStockDocumentPageNumbers) and the table from stockDocumentTable().
// Drawn on every page, like drawReportTitle (which the old look uses); the "Printed : ..." line is drawn at the end with the page numbers.
export const drawStockReportTitle = (
  doc: jsPDF,
  pageW: number,
  margin: PdfMargin,
  report: { txtCoName: string; txtHeading: string },
  branch: string,
  look: PdfLook = CLASSIC
) => {
  const gap = REPORT_STYLE.pdf.titleGap; // the gap between the company name and the heading

  doc.setTextColor(0, 0, 0);
  doc.setFont(look.font, "normal");

  doc.setFontSize(look.size.company);
  doc.text(report.txtCoName, pageW / 2, margin.top + 8, { align: "center" });

  doc.setFontSize(look.size.heading);
  doc.text(report.txtHeading, pageW / 2, margin.top + 15 + gap, { align: "center" });

  doc.setFontSize(STOCK_DOCUMENT_PDF.infoSize);
  if (branch) {
    // "Branch : Jeddah" - the name in bold
    const y = margin.top + 22 + STOCK_DOCUMENT_PDF.spaceAfterHeading + gap;
    const i = branch.indexOf(" : ");

    if (i < 0) {
      doc.text(branch, margin.left, y);
    } else {
      const label = `${branch.slice(0, i)} : `;
      doc.text(label, margin.left, y);
      doc.setFont(look.font, "bold");
      doc.text(branch.slice(i + 3), margin.left + doc.getTextWidth(label), y);
      doc.setFont(look.font, "normal");
    }
  }
};

// where the table of a stock look report starts: the room for the "Page x of y" line is added, the info line is 25 px high
export const stockReportTableTop = (margin: PdfMargin) => pdfTableTop(margin) + STOCK_DOCUMENT_PDF.spaceAfterHeading - 1.5;

// "Page x of y" on a line of its own (under the heading, at the right) and the "Created By : ..." / "Printed : ..." line at the bottom
// right of every page - they need the final page count, so they are added at the end.
export const addStockDocumentPageNumbers = (
  doc: jsPDF,
  look: PdfLook,
  // pageRight: where "Page x of y" ends (default: `right`, the right edge of the table, where the footer line ends)
  // ranges: a report whose parts number their pages on their own (the General Ledger: every account restarts at "Page 1")
  o: { right: number; pageRight?: number; pageY: number; bottomY: number; footer: string; ranges?: { start: number; end: number }[] }
) => {
  const pages = doc.getNumberOfPages();
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.pdfBody); // 11 px
  doc.setTextColor(0, 0, 0);

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(look.size.pdfBody);
    const part = o.ranges?.find((r) => i >= r.start && i <= r.end);
    const label = part ? `Page ${i - part.start + 1} of ${part.end - part.start + 1}` : `Page ${i} of ${pages}`;
    doc.text(label, o.pageRight ?? o.right, o.pageY, { align: "right" });
    doc.setFontSize(STOCK_DOCUMENT_PDF.footerSize);
    doc.text(o.footer, o.right, h - o.bottomY, { align: "right" });
  }
};

// the `styles` of a block heading row ("Supplier : ...", "Item : ...")
export const pdfGroupStyles = (look: PdfLook = CLASSIC) => ({
  fontStyle: "bold" as const,
  fontSize: look.size.group,
});

type TitleText = { txtCoName: string; txtHeading: string; txtReportInfo: string };

// the company, the heading, the branch (left) - drawn at the top of every page; the report info at the bottom right
export const drawReportTitle = (
  doc: jsPDF,
  pageW: number,
  margin: PdfMargin,
  report: TitleText,
  branch: string,
  look: PdfLook = CLASSIC
) => {
  const { font, size } = look;
  const gap = REPORT_STYLE.pdf.titleGap; // the gap between the company name and the heading

  doc.setTextColor(0, 0, 0);
  doc.setFont(font, "normal");

  doc.setFontSize(size.company);
  doc.text(report.txtCoName, pageW / 2, margin.top + 8, { align: "center" });

  doc.setFontSize(size.heading);
  doc.text(report.txtHeading, pageW / 2, margin.top + 15 + gap, { align: "center" });

  doc.setFontSize(size.pdfBody);
  if (branch) doc.text(branch, margin.left, margin.top + 22 + gap);

  // the user and the time: bottom right of every page
  doc.setFontSize(size.small);
  doc.text(`Printed : ${report.txtReportInfo}`, pageW - margin.right, doc.internal.pageSize.getHeight() - margin.bottom + 6, {
    align: "right",
  });
};

// "Page x of y" top right of every page - it needs the final page count, so it is added at the end
export const addPageNumbers = (doc: jsPDF, pageW: number, margin: PdfMargin, look: PdfLook = CLASSIC) => {
  const pages = doc.getNumberOfPages();

  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.small);
  doc.setTextColor(0, 0, 0);

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, pageW - margin.right, margin.top + 22 + REPORT_STYLE.pdf.titleGap, { align: "right" });
  }
};

// A table made of BLOCKS that must not be split over two pages (a document, a branch, a supplier ...): every block is its
// own table, and a block that does not fit in what is left of the page starts on the next page (a block taller than a
// whole page still splits). `options` are the options of the table (styles, margin, column styles ...); `drawTitle`
// draws the title once on every page - also on a page that a block opened.
export const autoTableKeepBlocks = (
  doc: jsPDF,
  blocks: CellDef[][][],
  options: UserOptions,
  drawTitle: () => void,
  // true: every block starts on a new page (the first one stays on the first page)
  pagePerBlock = false
) => {
  const titled = new Set<number>();
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  blocks.forEach((body, index) => {
    autoTable(doc, {
      ...options,
      body,
      startY: index === 0 ? options.startY : lastY(),
      pageBreak: pagePerBlock && index > 0 ? "always" : "avoid",
      didDrawPage: () => {
        const page = doc.getCurrentPageInfo().pageNumber;
        if (titled.has(page)) return;
        titled.add(page);
        drawTitle();
      },
    });
  });
};
