import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import {
  validateBeginningStock,
  validateBeginningStockDelete,
  validateBeginningStockPost,
  validateBeginningStockPrint,
} from "../../../validators/BeginningStockValidator.js";
import {
  getBeginningStockBranchListService,
  getBeginningStockDefaultBranchService,
  getBeginningStockItemListService,
  getBeginningStockService,
  saveBeginningStockService,
  deleteBeginningStockService,
  deleteBeginningStockLineService,
  postBeginningStockService,
  getBeginningStockPrintService,
  buildBeginningStockAuditNote,
  buildBeginningStockDeleteAuditNote,
  buildBeginningStockLineDeleteAuditNote,
  buildBeginningStockPostAuditNote,
  type BeginningStockRowPayload,
} from "../../../services/Purchase/Transaction/beginningStockService.js";
import { buildBeginningStockWorkbook } from "../../../services/Purchase/Transaction/beginningStockExcel.js";
import {
  mapRows,
  mapKeys,
  branchListKeys,
  beginningStockItemKeys,
  beginningStockLineKeys,
  beginningStockHeaderKeys,
  beginningStockPrintHeaderKeys,
  beginningStockPrintLineKeys,
} from "../../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Beginning Stock page
const MENU_ID = "010104";

// yyyy-mm-dd -> dd/mm/yyyy, for the audit note
const showDate = (value: string): string =>
  value ? value.split("-").reverse().join("/") : "";

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
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const branches = await getBeginningStockBranchListService(
      String(PstrCoID),
      req.user.userId
    );

    // the default branch counts only while the user still has a right to it
    const defaultBranch = await getBeginningStockDefaultBranchService(
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
    console.error("getBranchList (beginning stock) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET ITEM LIST (the Item ID / Item Name boxes of a branch)
========================================================= */

export const getItemList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, lkpBranch } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const data = await getBeginningStockItemListService(
      String(PstrCoID),
      String(lkpBranch)
    );

    return res.status(200).json({
      success: true,
      data: mapRows(data, beginningStockItemKeys),
    });
  } catch (error: unknown) {
    console.error("getItemList (beginning stock) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load item list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET BEGINNING STOCK (the saved document of a branch)
   chkSaved = there is one (the button then says Modify)
   chkPosted = it is posted - the page is then locked
========================================================= */

export const getBeginningStock = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const current = await getBeginningStockService(
      String(PstrCoID),
      Number(PstrYear) || 0,
      String(lkpBranch)
    );

    return res.status(200).json({
      success: true,
      chkSaved: current.lines.length > 0,
      chkPosted: current.posted,
      header: current.header
        ? mapKeys(current.header, beginningStockHeaderKeys)
        : null,
      data: mapRows(current.lines, beginningStockLineKeys),
    });
  } catch (error: unknown) {
    console.error("getBeginningStock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Beginning Stock",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE BEGINNING STOCK (the Save / Modify button)
   S: the branch has no Beginning Stock yet   M: it has one
   The logged-in user comes from the SESSION, not from the request body.
========================================================= */

export const saveBeginningStock = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      dtpDate,
      txtNote = "",
      rows = [],
    }: {
      PstrCoID: string;
      PstrYear: string;
      lkpBranch: string;
      dtpDate: string;
      txtNote?: string;
      rows: (BeginningStockRowPayload & { txtGridRow?: number })[];
    } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d+$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const PstrUserID = req.user.userId;

    // validators/BeginningStockValidator.ts: idle user, year not closed, branch
    // (and the right to it), date inside the Active Period, then every line -
    // the first rule that fails stops the save
    const check = await validateBeginningStock({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      dtpDate,
      txtNote,
      rows,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    // Save (S) when the branch has no Beginning Stock yet, Modify (M) when it
    // has one - each needs its own button right
    const current = await getBeginningStockService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch
    );

    const wantedMode = current.lines.length > 0 ? "M" : "S";

    if (!(await hasButtonRight(req.user, MENU_ID, wantedMode))) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${wantedMode === "M" ? "Modify" : "Save"}.`,
        field: "lkpBranch",
      });
    }

    // a posted Beginning Stock is locked: it cannot be changed
    if (current.posted) {
      return res.status(409).json({
        success: false,
        message: "This Beginning Stock is already posted and cannot be modified.",
        field: "lkpBranch",
      });
    }

    const result = await saveBeginningStockService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
      dtpDate,
      txtNote: String(txtNote ?? "").trim(),
      rows,
      PstrUserID,
    });

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // =====================================================

    try {
      // the note says WHAT was added, changed and removed, line by line
      const note = buildBeginningStockAuditNote(lkpBranch, dtpDate, result);

      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        "BG",
        "BG",
        "Beginning Stock",
        result.mode,
        PstrUserID,
        note
      );
    } catch (auditError: unknown) {
      // the document is already saved - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (saveBeginningStock):", auditError);
    }

    return res.status(200).json({
      success: true,
      message:
        result.mode === "M"
          ? "Beginning Stock modified successfully"
          : "Beginning Stock saved successfully",
      mode: result.mode,
    });
  } catch (error: unknown) {
    console.error("saveBeginningStock error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Beginning Stock could not be saved",
    });
  }
};

/* =========================================================
   DELETE BEGINNING STOCK (the Delete button)
   The whole Beginning Stock of the branch. Needs the Delete right; a posted
   one cannot be deleted. The logged-in user comes from the SESSION.
========================================================= */

export const deleteBeginningStock = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
    }: { PstrCoID: string; PstrYear: string; lkpBranch: string } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d+$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const PstrUserID = req.user.userId;

    // validators/BeginningStockValidator.ts: idle user, year not closed, branch
    // (and the right to it) - the first rule that fails stops the delete
    const check = await validateBeginningStockDelete({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "D"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Delete.",
        field: "lkpBranch",
      });
    }

    const current = await getBeginningStockService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch
    );

    if (current.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "There is no Beginning Stock to delete.",
        field: "lkpBranch",
      });
    }

    // a posted Beginning Stock is locked: it cannot be deleted
    if (current.posted) {
      return res.status(409).json({
        success: false,
        message: "This Beginning Stock is already posted and cannot be deleted.",
        field: "lkpBranch",
      });
    }

    const result = await deleteBeginningStockService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
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
        "BG",
        "BG",
        "Beginning Stock",
        "D",
        PstrUserID,
        buildBeginningStockDeleteAuditNote(lkpBranch, result.date, result.lines)
      );
    } catch (auditError: unknown) {
      // the document is already deleted - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (deleteBeginningStock):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Beginning Stock deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteBeginningStock error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Beginning Stock could not be deleted",
    });
  }
};

/* =========================================================
   DELETE ONE LINE (the x of a row of a saved Beginning Stock)
   The line goes from the database at once. A posted Beginning Stock is locked.
   Deleting a line is a change of the document, so it needs the Modify right (M) - the
   last line takes the whole Beginning Stock with it, which needs the Delete right (D)
   and is audited as a delete.
========================================================= */

export const deleteBeginningStockLine = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtSlNo,
    }: {
      PstrCoID: string;
      PstrYear: string;
      lkpBranch: string;
      txtSlNo: number | string;
    } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d+$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const slNo = Number(txtSlNo);

    if (!Number.isInteger(slNo) || slNo < 1) {
      return res.status(400).json({
        success: false,
        message: "The line to delete is not valid.",
        field: "txtSlNo",
      });
    }

    const PstrUserID = req.user.userId;

    // idle user, year not closed, branch (and the right to it)
    const check = await validateBeginningStockDelete({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    const current = await getBeginningStockService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch
    );

    if (current.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "There is no Beginning Stock to delete.",
        field: "lkpBranch",
      });
    }

    // a posted Beginning Stock is locked
    if (current.posted) {
      return res.status(409).json({
        success: false,
        message: "This Beginning Stock is already posted and cannot be changed.",
        field: "lkpBranch",
      });
    }

    if (!current.lines.some((line) => Number(line.fslno) === slNo)) {
      return res.status(404).json({
        success: false,
        message: "This line is not in the Beginning Stock any more.",
        field: "txtSlNo",
      });
    }

    // the last line takes the whole Beginning Stock with it
    const wholeDocument = current.lines.length === 1;

    if (!(await hasButtonRight(req.user, MENU_ID, wholeDocument ? "D" : "M"))) {
      return res.status(403).json({
        success: false,
        message: wholeDocument
          ? "You do not have permission to Delete."
          : "You do not have permission to Modify.",
        field: "lkpBranch",
      });
    }

    const result = await deleteBeginningStockLineService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
      txtSlNo: slNo,
      PstrUserID,
    });

    if (result.line === null) {
      return res.status(404).json({
        success: false,
        message: "This line is not in the Beginning Stock any more.",
        field: "txtSlNo",
      });
    }

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        "BG",
        "BG",
        "Beginning Stock",
        result.documentDeleted ? "D" : "M",
        PstrUserID,
        result.documentDeleted
          ? buildBeginningStockDeleteAuditNote(lkpBranch, result.date, result.lines)
          : buildBeginningStockLineDeleteAuditNote(
              lkpBranch,
              result.line,
              result.lines.length
            )
      );
    } catch (auditError: unknown) {
      console.error("UserAudit error (deleteBeginningStockLine):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Deleted",
      chkDocumentDeleted: result.documentDeleted,
    });
  } catch (error: unknown) {
    console.error("deleteBeginningStockLine error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "The line could not be deleted",
    });
  }
};

/* =========================================================
   POST BEGINNING STOCK (the Post button)
   Adds the lines into the stock (dbo.sp_pagebeginningstockpost) and marks them posted. Needs
   the Post right (T). Once posted, the document is locked. The logged-in user
   comes from the SESSION.
========================================================= */

export const postBeginningStock = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
    }: { PstrCoID: string; PstrYear: string; lkpBranch: string } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d+$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const PstrUserID = req.user.userId;

    // validators/BeginningStockValidator.ts: idle user, year not closed, branch
    // (and the right to it) - the first rule that fails stops the post
    const check = await validateBeginningStockPost({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "T"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Post.",
        field: "lkpBranch",
      });
    }

    const current = await getBeginningStockService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch
    );

    // the old ValidateMe("T"): "Beginning Stock not found"
    if (current.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Beginning Stock not found",
        field: "lkpBranch",
      });
    }

    // posting twice would add the stock twice
    if (current.posted) {
      return res.status(409).json({
        success: false,
        message: "This Beginning Stock is already posted.",
        field: "lkpBranch",
      });
    }

    const result = await postBeginningStockService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
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
        "BG",
        "BG",
        "Beginning Stock",
        "T",
        PstrUserID,
        buildBeginningStockPostAuditNote(
          lkpBranch,
          result.date,
          result.before,
          result.after
        )
      );
    } catch (auditError: unknown) {
      // the document is already posted - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (postBeginningStock):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Beginning Stock posted successfully",
    });
  } catch (error: unknown) {
    console.error("postBeginningStock error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Beginning Stock could not be posted",
    });
  }
};

/* =========================================================
   PRINT BEGINNING STOCK (the Print button)
   The branch's Beginning Stock, for the Print Preview (preview, printer, PDF) - and,
   with the same body, the Excel file. A POST: the page asks for the data itself.
   Needs the Print right (P). A posted one can be printed too.
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
      report: Awaited<ReturnType<typeof getBeginningStockPrintService>>;
      reportInfo: string;
    }
  | { ok: false; status: number; body: Record<string, unknown> };

// the checks and the data of Print and Excel
const preparePrint = async (req: AuthenticatedRequest): Promise<PreparedPrint> => {
  const {
    PstrCoID,
    PstrYear,
    lkpBranch,
  }: { PstrCoID: string; PstrYear: string; lkpBranch: string } = req.body;

  const stop = (status: number, message: string, field?: string): PreparedPrint => ({
    ok: false,
    status,
    body: { success: false, message, ...(field ? { field } : {}) },
  });

  if (!PstrCoID) {
    return stop(400, "Company ID is required");
  }

  if (!PstrYear || !/^\d+$/.test(String(PstrYear))) {
    return stop(400, "Year is required");
  }

  if (!req.user) {
    return stop(401, "Authentication required");
  }

  // validators/BeginningStockValidator.ts: idle user, year not closed, branch (and the
  // right to it) - the branch is checked BEFORE it goes into the print procedure's filter
  const check = await validateBeginningStockPrint({
    PstrCoID,
    PstrYear,
    PstrUserID: req.user.userId,
    lkpBranch,
  });

  if (!check.valid) {
    return stop(check.status, check.message, check.field);
  }

  if (!(await hasButtonRight(req.user, MENU_ID, "P"))) {
    return stop(403, "You do not have permission to Print.", "lkpBranch");
  }

  const report = await getBeginningStockPrintService(PstrCoID, lkpBranch);

  if (report.lines.length === 0) {
    return stop(404, "Beginning Stock not found", "lkpBranch");
  }

  return { ok: true, report, reportInfo: reportInfoOf(req.user.userId) };
};

export const printBeginningStock = async (
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
        ...mapKeys(prepared.report.header, beginningStockPrintHeaderKeys),
        txtReportInfo: prepared.reportInfo,
      },
      data: mapRows(prepared.report.lines, beginningStockPrintLineKeys),
    });
  } catch (error: unknown) {
    console.error("printBeginningStock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Beginning Stock print",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   EXCEL BEGINNING STOCK (Download in the Print Preview, File Format Excel)
   The same body and the same checks as Print; answers with the .xlsx file.
========================================================= */

export const downloadBeginningStockExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await preparePrint(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    const buffer = await buildBeginningStockWorkbook({
      report: prepared.report,
      heading: "Beginning Stock",
      reportInfo: prepared.reportInfo,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="BeginningStock.xlsx"');
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    return res.status(200).send(buffer);
  } catch (error: unknown) {
    console.error("downloadBeginningStockExcel error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create the Beginning Stock Excel file",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
