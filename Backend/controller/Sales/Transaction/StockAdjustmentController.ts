import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import {
  validateStockAdjustment,
  validateStockAdjustmentDelete,
  validateStockAdjustmentPrint,
  validateStockAdjustmentPost,
  validateStockAdjustmentPostLines,
} from "../../../validators/StockAdjustmentValidator.js";
import {
  getStockAdjustmentBranchListService,
  getStockAdjustmentDefaultBranchService,
  getStockAdjustmentItemListService,
  getStockAdjustmentItemStockService,
  getStockAdjustmentNextDocNoService,
  getStockAdjustmentService,
  getStockAdjustmentFindListService,
  saveStockAdjustmentService,
  deleteStockAdjustmentService,
  deleteStockAdjustmentLineService,
  postStockAdjustmentService,
  getStockAdjustmentPrintService,
  buildStockAdjustmentAuditNote,
  buildStockAdjustmentDeleteAuditNote,
  buildStockAdjustmentLineDeleteAuditNote,
  buildStockAdjustmentPostAuditNote,
  type StockAdjustmentRowPayload,
} from "../../../services/Sales/Transaction/stockAdjustmentService.js";
import { buildStockAdjustmentWorkbook } from "../../../services/Sales/Transaction/stockAdjustmentExcel.js";
import {
  mapRows,
  mapKeys,
  branchListKeys,
  stockAdjustmentItemKeys,
  stockAdjustmentLineKeys,
  stockAdjustmentHeaderKeys,
  stockAdjustmentPrintHeaderKeys,
  stockAdjustmentPrintLineKeys,
  stockAdjustmentFindKeys,
} from "../../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Stock Adjustment page
const MENU_ID = "020104";
const SCREEN_NAME = "Stock Adjustment";
const DOC_TYPE = "ADJ";

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const reject = (
  res: Response,
  status: number,
  message: string,
  field?: string
): Response =>
  res.status(status).json({
    success: false,
    message,
    ...(field ? { field } : {}),
  });

// the year is sent as digits (the login year)
const isYear = (value: unknown): boolean => /^\d+$/.test(String(value ?? ""));

/* =========================================================
   GET BRANCH LIST (the Branch box)
   Only the branches the logged-in user has a right to, plus the user's own
   default branch (lkpDefaultBranch) when it is one of them. The user comes
   from the SESSION (authenticate), not from the request.
========================================================= */

export const getBranchList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID } = req.query;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const branches = await getStockAdjustmentBranchListService(
      String(PstrCoID),
      req.user.userId
    );

    const defaultBranch = await getStockAdjustmentDefaultBranchService(
      String(PstrCoID),
      req.user.userId
    );

    const lkpDefaultBranch = branches.some((row) => row.fbrid === defaultBranch)
      ? defaultBranch
      : "";

    return res.status(200).json({
      success: true,
      data: mapRows(branches, branchListKeys),
      lkpDefaultBranch,
    });
  } catch (error: unknown) {
    console.error("getBranchList (stock adjustment) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET ITEM LIST (the Item ID / Item Name boxes of the branch)
========================================================= */

export const getItemList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, lkpBranch } = req.query;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!lkpBranch) {
      return reject(res, 400, "Branch is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const data = await getStockAdjustmentItemListService(
      String(PstrCoID),
      String(lkpBranch)
    );

    return res.status(200).json({
      success: true,
      data: mapRows(data, stockAdjustmentItemKeys),
    });
  } catch (error: unknown) {
    console.error("getItemList (stock adjustment) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load item list",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET ITEM STOCK (the Out of Stock warning and the unit cost of a chosen item)
   txtStock excludes this document's own lines (txtDocNo).
========================================================= */

export const getItemStock = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch, lkpItemID, txtDocNo } = req.query;

    if (!PstrCoID || !lkpBranch || !lkpItemID) {
      return reject(res, 400, "Company ID, Branch and Item are required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const result = await getStockAdjustmentItemStockService(
      String(PstrCoID),
      Number(PstrYear),
      String(lkpBranch),
      String(lkpItemID),
      String(txtDocNo ?? "")
    );

    return res.status(200).json({
      success: true,
      txtStock: result.stock,
      txtUnitCost: result.unitCost,
    });
  } catch (error: unknown) {
    console.error("getItemStock (stock adjustment) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the stock of the item",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET NEXT ENTRY NO. (dbo.getnextdocno for doc type ADJ of the branch)
========================================================= */

export const getNextDocNo = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch } = req.query;

    if (!PstrCoID || !lkpBranch) {
      return reject(res, 400, "Company ID and Branch are required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const next = await getStockAdjustmentNextDocNoService(
      String(PstrCoID),
      Number(PstrYear),
      String(lkpBranch)
    );

    return res.status(200).json({
      success: true,
      txtDocNo: next.txtDocNo,
      txtPrefix: next.txtPrefix,
      chkStrictSerial: next.chkStrictSerial,
      chkAutoIncrement: next.chkAutoIncrement,
    });
  } catch (error: unknown) {
    // the numbering settings of the branch are missing or incomplete (the
    // database says so in its message)
    console.error("getNextDocNo (stock adjustment) error:", error);

    return reject(
      res,
      400,
      messageOf(error, "The next Entry No. could not be made"),
      "txtDocNo"
    );
  }
};

/* =========================================================
   GET STOCK ADJUSTMENT (the saved document of an Entry No.)
   chkSaved = there is one (the button then says Modify)
   chkPosted = it is posted - the page is then locked
========================================================= */

export const getStockAdjustment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch, txtDocNo } = req.query;

    if (!PstrCoID || !lkpBranch || !txtDocNo) {
      return reject(res, 400, "Company ID, Branch and Entry No. are required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const current = await getStockAdjustmentService(
      String(PstrCoID),
      Number(PstrYear),
      String(lkpBranch),
      String(txtDocNo)
    );

    return res.status(200).json({
      success: true,
      chkSaved: current.lines.length > 0,
      chkPosted: Boolean(current.header?.fpost),
      header: current.header
        ? mapKeys(current.header, stockAdjustmentHeaderKeys)
        : null,
      data: mapRows(current.lines, stockAdjustmentLineKeys),
    });
  } catch (error: unknown) {
    console.error("getStockAdjustment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Stock Adjustment",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET FIND LIST (the Search button): the saved adjustments of the branch in
   the login year, newest first
========================================================= */

export const getFindList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch } = req.query;

    if (!PstrCoID || !lkpBranch) {
      return reject(res, 400, "Company ID and Branch are required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const data = await getStockAdjustmentFindListService(
      String(PstrCoID),
      Number(PstrYear),
      String(lkpBranch)
    );

    return res.status(200).json({
      success: true,
      data: mapRows(data, stockAdjustmentFindKeys),
    });
  } catch (error: unknown) {
    console.error("getFindList (stock adjustment) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Stock Adjustment list",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   SAVE STOCK ADJUSTMENT (the Save / Modify button)
   S: the Entry No. has no document yet   M: it has one
   The logged-in user comes from the SESSION, not from the request body.
========================================================= */

export const saveStockAdjustment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtDocNo,
      dtpDate,
      txtNote = "",
      chkSaved = false,
      rows = [],
    }: {
      PstrCoID: string;
      PstrYear: string;
      lkpBranch: string;
      txtDocNo: string;
      dtpDate: string;
      txtNote?: string;
      chkSaved?: boolean;
      rows: (StockAdjustmentRowPayload & { txtGridRow?: number })[];
    } = req.body;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const PstrUserID = req.user.userId;

    // validators/StockAdjustmentValidator.ts: idle user, year not closed, branch
    // (and the right to it), Entry No., date, then every line - the first rule
    // that fails stops the save
    const check = await validateStockAdjustment({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      txtDocNo,
      dtpDate,
      txtNote,
      rows,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    // Save (S) when the Entry No. has no document yet, Modify (M) when it has
    // one - each needs its own button right
    const current = await getStockAdjustmentService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      String(txtDocNo).trim()
    );

    const wantedMode = chkSaved && current.lines.length > 0 ? "M" : "S";

    if (!(await hasButtonRight(req.user, MENU_ID, wantedMode))) {
      return reject(
        res,
        403,
        `You do not have permission to ${wantedMode === "M" ? "Modify" : "Save"}.`,
        "lkpBranch"
      );
    }

    // a posted Stock Adjustment is locked: it cannot be changed
    if (current.header?.fpost) {
      return reject(
        res,
        409,
        "This Stock Adjustment is already posted and cannot be modified.",
        "txtDocNo"
      );
    }

    const result = await saveStockAdjustmentService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
      txtDocNo: String(txtDocNo).trim(),
      dtpDate,
      txtNote: String(txtNote ?? "").trim(),
      chkSaved: Boolean(chkSaved),
      rows,
      PstrUserID,
    });

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        DOC_TYPE,
        result.txtDocNo,
        SCREEN_NAME,
        result.mode,
        PstrUserID,
        buildStockAdjustmentAuditNote(lkpBranch, dtpDate, result)
      );
    } catch (auditError: unknown) {
      // the document is already saved - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (saveStockAdjustment):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: result.docNoChanged
        ? `Entry No. is changed to ${result.txtDocNo}. Stock Adjustment saved successfully`
        : result.mode === "M"
          ? "Stock Adjustment modified successfully"
          : "Stock Adjustment saved successfully",
      mode: result.mode,
      txtDocNo: result.txtDocNo,
    });
  } catch (error: unknown) {
    console.error("saveStockAdjustment error:", error);

    return reject(res, 400, messageOf(error, "Stock Adjustment could not be saved"));
  }
};

/* =========================================================
   DELETE STOCK ADJUSTMENT (the Delete button)
   The whole document and its finance rows. Needs the Delete right; a posted
   one cannot be deleted.
========================================================= */

export const deleteStockAdjustment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtDocNo,
    }: { PstrCoID: string; PstrYear: string; lkpBranch: string; txtDocNo: string } =
      req.body;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const PstrUserID = req.user.userId;

    const check = await validateStockAdjustmentDelete({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      txtDocNo,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "D"))) {
      return reject(res, 403, "You do not have permission to Delete.", "txtDocNo");
    }

    const docNo = String(txtDocNo).trim();

    const current = await getStockAdjustmentService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      docNo
    );

    if (current.lines.length === 0) {
      return reject(res, 404, "There is no Stock Adjustment to delete.", "txtDocNo");
    }

    // a posted Stock Adjustment is locked: it cannot be deleted
    if (current.header?.fpost) {
      return reject(
        res,
        409,
        "This Stock Adjustment is already posted and cannot be deleted.",
        "txtDocNo"
      );
    }

    const result = await deleteStockAdjustmentService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
      txtDocNo: docNo,
      PstrUserID,
    });

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        DOC_TYPE,
        docNo,
        SCREEN_NAME,
        "D",
        PstrUserID,
        buildStockAdjustmentDeleteAuditNote(
          lkpBranch,
          docNo,
          result.header?.fdate ?? null,
          result.lines
        )
      );
    } catch (auditError: unknown) {
      console.error("UserAudit error (deleteStockAdjustment):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Stock Adjustment deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteStockAdjustment error:", error);

    return reject(res, 400, messageOf(error, "Stock Adjustment could not be deleted"));
  }
};

/* =========================================================
   DELETE ONE LINE (the x of a row of a saved adjustment)
   The line goes from the database at once. A posted adjustment is locked. Deleting a
   line is a change of the adjustment, so it needs the Modify right (M) - the last line
   of an adjustment takes the whole adjustment with it, which needs the Delete right
   (D) and is audited as a delete.
========================================================= */

export const deleteStockAdjustmentLine = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtDocNo,
      txtSlNo,
    }: {
      PstrCoID: string;
      PstrYear: string;
      lkpBranch: string;
      txtDocNo: string;
      txtSlNo: number | string;
    } = req.body;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const slNo = Number(txtSlNo);

    if (!Number.isInteger(slNo) || slNo < 1) {
      return reject(res, 400, "The line to delete is not valid.", "txtSlNo");
    }

    const PstrUserID = req.user.userId;

    // idle user, the branch (and the right to it), the Entry No.
    const check = await validateStockAdjustmentDelete({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      txtDocNo,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    const docNo = String(txtDocNo).trim();

    const current = await getStockAdjustmentService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      docNo
    );

    if (current.lines.length === 0) {
      return reject(res, 404, "There is no Stock Adjustment to delete.", "txtDocNo");
    }

    // a posted Stock Adjustment is locked
    if (current.header?.fpost) {
      return reject(
        res,
        409,
        "This Stock Adjustment is already posted and cannot be changed.",
        "txtDocNo"
      );
    }

    if (!current.lines.some((line) => Number(line.fslno) === slNo)) {
      return reject(res, 404, "This line is not in the Stock Adjustment any more.", "txtSlNo");
    }

    // the last line takes the whole adjustment with it
    const wholeDocument = current.lines.length === 1;

    if (!(await hasButtonRight(req.user, MENU_ID, wholeDocument ? "D" : "M"))) {
      return reject(
        res,
        403,
        wholeDocument
          ? "You do not have permission to Delete."
          : "You do not have permission to Modify.",
        "txtDocNo"
      );
    }

    const result = await deleteStockAdjustmentLineService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
      txtDocNo: docNo,
      txtSlNo: slNo,
      PstrUserID,
    });

    if (result.line === null) {
      return reject(res, 404, "This line is not in the Stock Adjustment any more.", "txtSlNo");
    }

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        DOC_TYPE,
        docNo,
        SCREEN_NAME,
        result.documentDeleted ? "D" : "M",
        PstrUserID,
        result.documentDeleted
          ? buildStockAdjustmentDeleteAuditNote(
              lkpBranch,
              docNo,
              result.header?.fdate ?? null,
              result.lines
            )
          : buildStockAdjustmentLineDeleteAuditNote(
              lkpBranch,
              docNo,
              result.line,
              result.lines.length
            )
      );
    } catch (auditError: unknown) {
      console.error("UserAudit error (deleteStockAdjustmentLine):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Deleted",
      chkDocumentDeleted: result.documentDeleted,
    });
  } catch (error: unknown) {
    console.error("deleteStockAdjustmentLine error:", error);

    return reject(
      res,
      400,
      error instanceof Error ? error.message : "The line could not be deleted"
    );
  }
};

/* =========================================================
   PRINT STOCK ADJUSTMENT (the Print button)
   The saved document, for the Print Preview (preview, printer, PDF) - and, with the
   same body, the Excel file. A POST: the page asks for the data itself. Needs the
   Print right (P). A posted one can be printed too.
========================================================= */

const pad = (n: number) => String(n).padStart(2, "0");

// the old objCommon.ReportInfo: "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
const reportInfoOf = (userId: string): string => {
  const d = new Date();

  return `${userId}  ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type PreparedPrint =
  | {
      ok: true;
      report: Awaited<ReturnType<typeof getStockAdjustmentPrintService>>;
      reportInfo: string;
    }
  | { ok: false; status: number; body: Record<string, unknown> };

// the checks and the data of Print and Excel
const preparePrint = async (req: AuthenticatedRequest): Promise<PreparedPrint> => {
  const {
    PstrCoID,
    PstrYear,
    lkpBranch,
    txtDocNo,
  }: { PstrCoID: string; PstrYear: string; lkpBranch: string; txtDocNo: string } =
    req.body;

  const stop = (status: number, message: string, field?: string): PreparedPrint => ({
    ok: false,
    status,
    body: { success: false, message, ...(field ? { field } : {}) },
  });

  if (!PstrCoID) {
    return stop(400, "Company ID is required");
  }

  if (!isYear(PstrYear)) {
    return stop(400, "Year is required");
  }

  if (!req.user) {
    return stop(401, "Authentication required");
  }

  const check = await validateStockAdjustmentPrint({
    PstrCoID,
    PstrYear,
    PstrUserID: req.user.userId,
    lkpBranch,
    txtDocNo,
  });

  if (!check.valid) {
    return stop(check.status, check.message, check.field);
  }

  if (!(await hasButtonRight(req.user, MENU_ID, "P"))) {
    return stop(403, "You do not have permission to Print.", "txtDocNo");
  }

  const report = await getStockAdjustmentPrintService(
    PstrCoID,
    Number(PstrYear),
    lkpBranch,
    String(txtDocNo).trim()
  );

  if (report.lines.length === 0) {
    return stop(404, "Stock Adjustment not found", "txtDocNo");
  }

  return { ok: true, report, reportInfo: reportInfoOf(req.user.userId) };
};

export const printStockAdjustment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await preparePrint(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    return res.status(200).json({
      success: true,
      header: {
        ...mapKeys(prepared.report.header, stockAdjustmentPrintHeaderKeys),
        txtReportInfo: prepared.reportInfo,
      },
      data: mapRows(prepared.report.lines, stockAdjustmentPrintLineKeys),
    });
  } catch (error: unknown) {
    console.error("printStockAdjustment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Stock Adjustment print",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   EXCEL STOCK ADJUSTMENT (Download in the Print Preview, File Format Excel)
   The same body and the same checks as Print; answers with the .xlsx file.
========================================================= */

export const downloadStockAdjustmentExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await preparePrint(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    const buffer = await buildStockAdjustmentWorkbook({
      report: prepared.report,
      heading: SCREEN_NAME,
      reportInfo: prepared.reportInfo,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="StockAdjustment.xlsx"');
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    return res.status(200).send(buffer);
  } catch (error: unknown) {
    console.error("downloadStockAdjustmentExcel error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create the Stock Adjustment Excel file",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   POST STOCK ADJUSTMENT (the Post button)
   The branch's stock moves, the finance lines are written and the document is
   locked. Needs the Post right (T); a posted one can't be posted again. The
   logged-in user comes from the SESSION.
========================================================= */

export const postStockAdjustment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtDocNo,
    }: { PstrCoID: string; PstrYear: string; lkpBranch: string; txtDocNo: string } =
      req.body;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const PstrUserID = req.user.userId;

    // the old ValidateMe("T"): the user, the year, the branch, the Entry No.
    const check = await validateStockAdjustmentPost({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      txtDocNo,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "T"))) {
      return reject(res, 403, "You do not have permission to Post.", "txtDocNo");
    }

    const docNo = String(txtDocNo).trim();

    const current = await getStockAdjustmentService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      docNo
    );

    if (current.lines.length === 0) {
      return reject(res, 404, "Stock Adjustment not found", "txtDocNo");
    }

    // posting twice would move the stock twice
    if (current.header?.fpost) {
      return reject(res, 409, "This Stock Adjustment is already posted.", "txtDocNo");
    }

    // the old ValidateGrid("T"): the accounts, enough posted stock, a unit cost
    const lineCheck = await validateStockAdjustmentPostLines(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      docNo,
      current.lines
    );

    if (!lineCheck.valid) {
      return reject(res, lineCheck.status, lineCheck.message, lineCheck.field);
    }

    const result = await postStockAdjustmentService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
      txtDocNo: docNo,
      PstrUserID,
    });

    // =====================================================
    // USER AUDIT (only after the post has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        DOC_TYPE,
        docNo,
        SCREEN_NAME,
        "T",
        PstrUserID,
        buildStockAdjustmentPostAuditNote(
          lkpBranch,
          docNo,
          result.header?.fdate ?? null,
          result.after
        )
      );
    } catch (auditError: unknown) {
      // the document is already posted - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (postStockAdjustment):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Stock Adjustment posted successfully",
    });
  } catch (error: unknown) {
    console.error("postStockAdjustment error:", error);

    return reject(res, 400, messageOf(error, "Stock Adjustment could not be posted"));
  }
};
