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

// the colour of the thin lines of the tables (the print's #c7d1e4)
export const REPORT_LINE_COLOR = { argb: "FFC7D1E4" };

export const thin = {
  top: { style: "thin" as const, color: REPORT_LINE_COLOR },
  left: { style: "thin" as const, color: REPORT_LINE_COLOR },
  bottom: { style: "thin" as const, color: REPORT_LINE_COLOR },
  right: { style: "thin" as const, color: REPORT_LINE_COLOR },
};

export const font = (size: number = REPORT_FONT_SIZE.body, bold = false) => ({
  name: REPORT_FONT_NAME,
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
  branchColumns: number = Math.floor(columns / 2)
) => {
  const last = columnLetter(columns);
  const infoFrom = columnLetter(branchColumns + 1);

  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = report.txtCoName;
  ws.getCell("A1").font = font(REPORT_FONT_SIZE.company, true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(`A2:${last}2`);
  ws.getCell("A2").value = report.txtHeading;
  ws.getCell("A2").font = font(REPORT_FONT_SIZE.heading);
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells(`A3:${columnLetter(branchColumns)}3`);
  ws.getCell("A3").value = branch;
  ws.getCell("A3").font = font(REPORT_FONT_SIZE.body);
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells(`${infoFrom}3:${last}3`);
  ws.getCell(`${infoFrom}3`).value = report.txtReportInfo;
  ws.getCell(`${infoFrom}3`).font = font(REPORT_FONT_SIZE.small);
  ws.getCell(`${infoFrom}3`).alignment = { horizontal: "right" };
};

// Call it LAST, when the worksheet is full: every cell gets the report font, so the table is in the same font
// as the title (a cell keeps its own size and bold; one without a size gets the body size).
export const applyReportFont = (ws: ExcelJS.Worksheet) => {
  ws.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = {
        ...cell.font,
        name: REPORT_FONT_NAME,
        size: cell.font?.size ?? REPORT_FONT_SIZE.body,
      };
    });
  });
};
