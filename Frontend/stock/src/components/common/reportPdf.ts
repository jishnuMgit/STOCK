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

import { REPORT_STYLE, reportLook, type ReportLook, type ReportSizes } from "./reportStyle";

export type RGB = [number, number, number];

export const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export const PDF_BLACK: RGB = [0, 0, 0];

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
export const pdfTableTop = (margin: PdfMargin) => margin.top + REPORT_STYLE.pdf.headerHeight;

// the `styles` of jspdf-autotable: the font, its size, the padding, the thin light lines
export const pdfTableStyles = (look: PdfLook = CLASSIC) => ({
  font: look.font,
  fontSize: look.size.pdfBody,
  cellPadding: REPORT_STYLE.pdf.cellPadding,
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

// the `styles` of a block heading row ("Supplier : ...", "Item : ...")
export const pdfGroupStyles = (look: PdfLook = CLASSIC) => ({
  fontStyle: "bold" as const,
  fontSize: look.size.group,
});

type TitleText = { txtCoName: string; txtHeading: string; txtReportInfo: string };

// the company, the heading, the branch (left) and the report info (right) - drawn at the top of every page
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

  doc.setFontSize(size.small);
  doc.text(report.txtReportInfo, pageW - margin.right, margin.top + 22 + gap, { align: "right" });
};

// "Page x of y" top right of every page - it needs the final page count, so it is added at the end
export const addPageNumbers = (doc: jsPDF, pageW: number, margin: PdfMargin, look: PdfLook = CLASSIC) => {
  const pages = doc.getNumberOfPages();

  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.small);
  doc.setTextColor(0, 0, 0);

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, pageW - margin.right, margin.top, { align: "right" });
  }
};
