// utils/reportStyle.ts
// THE LOOK OF THE EXCEL REPORTS in ONE place: the font, its sizes, the line colour, the page and the title rows.
// Change them here and every Excel report that uses this file changes with it.
//
// The print and the PDF are made in the browser: Frontend/stock/src/components/common/reportStyle.ts. The browser
// and the server are two projects and cannot share a file, so keep these two files in step (the same font, the
// same sizes, the same line colour).
//
// A report still decides what it shows (its columns, its blocks, its numbers and their formats); this file
// decides how it looks.
import ExcelJS from "exceljs";

export const REPORT_FONT_NAME = "Times New Roman";

// sizes in points
export const REPORT_FONT_SIZE = {
  company: 14, // the company name
  heading: 12, // the heading of the report
  body: 10, // the table
  small: 8, // the report info (user and time)
} as const;

// THE LOOKS OF THE EXCEL REPORTS - the font and EVERY size, the same two looks as the print, the Print Preview and the
// PDF of the browser (Frontend/stock/src/components/common/reportStyle.ts, REPORT_LOOKS - keep the two in step):
//
//     classic   the old look: Times New Roman, the sizes above
//     inter     the app font and a text hierarchy:
//                   company 13.5 pt (18 px) / heading 12 pt (16 px) / column labels 10.5 pt (14 px) /
//                   block heading 9 pt (12 px) / table text 8.25 pt (11 px) / report info 8 pt
//
// A report picks its look in ONE word - "inter" - in addReportTitle, applyReportFont and levelFont, and never writes a font
// name or a size:
//
//     addReportTitle(ws, report, branch, columns, undefined, "inter");
//     head.eachCell((cell) => { cell.font = levelFont("columnHead", true, "inter"); ... });   // the column labels
//     heading.getCell(1).font = levelFont("group", true, "inter");                           // a block heading
//     applyReportFont(ws, "inter");                                                          // LAST: the font on every cell
//
// (Excel does not carry a font inside the file: the person who opens it sees Inter when Inter is installed on that
// computer, and the closest font Excel has when it is not.)
export type ReportLook = "classic" | "inter";

export type ReportLevel = "company" | "heading" | "columnHead" | "group" | "body" | "small";

type LookSizes = Record<ReportLevel, number>;

export const REPORT_LOOKS: Record<ReportLook, { fontName: string; size: LookSizes }> = {
  classic: {
    fontName: REPORT_FONT_NAME,
    // the classic look has no own column-label or block-heading size: they take the table text size
    size: { ...REPORT_FONT_SIZE, columnHead: REPORT_FONT_SIZE.body, group: REPORT_FONT_SIZE.body },
  },
  inter: {
    fontName: "Inter",
    size: { company: 13.5, heading: 12, columnHead: 10.5, group: 9, body: 8.25, small: 8 },
  },
};

// the font of one level of the text (a column label, a block heading ...) in a look
export const levelFont = (level: ReportLevel, bold = false, look: ReportLook = "classic") => ({
  name: REPORT_LOOKS[look].fontName,
  size: REPORT_LOOKS[look].size[level],
  bold,
});

const lookFont = (look: ReportLook) => REPORT_LOOKS[look].fontName;
const lookSize = (look: ReportLook) => REPORT_LOOKS[look].size;

// the colour of the thin lines of the tables (the print's #c7d1e4)
export const REPORT_LINE_COLOR = { argb: "FFC7D1E4" };

export const thin = {
  top: { style: "thin" as const, color: REPORT_LINE_COLOR },
  left: { style: "thin" as const, color: REPORT_LINE_COLOR },
  bottom: { style: "thin" as const, color: REPORT_LINE_COLOR },
  right: { style: "thin" as const, color: REPORT_LINE_COLOR },
};

export const font = (size: number = REPORT_FONT_SIZE.body, bold = false, look: ReportLook = "classic") => ({
  name: lookFont(look),
  size,
  bold,
});

// a worksheet on A4, fitted to one page wide
export const addReportSheet = (
  wb: ExcelJS.Workbook,
  name: string,
  orientation: "portrait" | "landscape"
) =>
  wb.addWorksheet(name, {
    pageSetup: { paperSize: 9, orientation, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

// the letter of a column number (1 = A)
const columnLetter = (n: number) => String.fromCharCode(64 + n);

type TitleText = { txtCoName: string; txtHeading: string; txtReportInfo: string };

// rows 1-3: the company, the heading, and the branch (left) with the report info (right)
export const addReportTitle = (
  ws: ExcelJS.Worksheet,
  report: TitleText,
  branch: string,
  columns: number,
  branchColumns: number = Math.floor(columns / 2),
  look: ReportLook = "classic"
) => {
  const size = lookSize(look);
  const last = columnLetter(columns);
  const infoFrom = columnLetter(branchColumns + 1);

  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = report.txtCoName;
  ws.getCell("A1").font = font(size.company, true, look);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(`A2:${last}2`);
  ws.getCell("A2").value = report.txtHeading;
  ws.getCell("A2").font = font(size.heading, false, look);
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells(`A3:${columnLetter(branchColumns)}3`);
  ws.getCell("A3").value = branch;
  ws.getCell("A3").font = font(size.body, false, look);
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells(`${infoFrom}3:${last}3`);
  ws.getCell(`${infoFrom}3`).value = report.txtReportInfo;
  ws.getCell(`${infoFrom}3`).font = font(size.small, false, look);
  ws.getCell(`${infoFrom}3`).alignment = { horizontal: "right" };
};

// Call it LAST, when the worksheet is full: every cell gets the report font, so the table is in the same font
// as the title (a cell keeps its own size and bold; one without a size gets the body size).
export const applyReportFont = (ws: ExcelJS.Worksheet, look: ReportLook = "classic") => {
  ws.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = {
        ...cell.font,
        name: lookFont(look),
        size: cell.font?.size ?? lookSize(look).body,
      };
    });
  });
};
