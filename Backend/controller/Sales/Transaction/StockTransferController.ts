import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import {
  validateStockTransfer,
  validateStockTransferDelete,
  validateStockTransferPrint,
  validateStockTransferPost,
  validateStockTransferPostLines,
} from "../../../validators/StockTransferValidator.js";
import {
  getStockTransferBranchListService,
  getStockTransferDefaultBranchService,
  getStockTransferToBranchListService,
  getStockTransferItemListService,
  getStockTransferItemStockService,
  getStockTransferNextDocNoService,
  getStockTransferService,
  saveStockTransferService,
  deleteStockTransferService,
  postStockTransferService,
  getStockTransferPrintService,
  buildStockTransferAuditNote,
  buildStockTransferDeleteAuditNote,
  buildStockTransferPostAuditNote,
  type StockTransferRowPayload,
} from "../../../services/Sales/Transaction/stockTransferService.js";
import {
  mapRows,
  mapKeys,
  branchListKeys,
  stockTransferToBranchKeys,
  stockTransferItemKeys,
  stockTransferLineKeys,
  stockTransferHeaderKeys,
  stockTransferPrintHeaderKeys,
  stockTransferPrintLineKeys,
} from "../../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Stock Transfer page
const MENU_ID = "020103";
const SCREEN_NAME = "Stock Transfer";
const DOC_TYPE = "ST";

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/* =========================================================
   GET BRANCH LIST (the Branch box = the From branch)
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

    const branches = await getStockTransferBranchListService(
      String(PstrCoID),
      req.user.userId
    );

    const defaultBranch = await getStockTransferDefaultBranchService(
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
    console.error("getBranchList (stock transfer) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET TO BRANCH LIST (the Transfer To box): every branch of the company
========================================================= */

export const getToBranchList = async (
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

    const branches = await getStockTransferToBranchListService(String(PstrCoID));

    return res.status(200).json({
      success: true,
      data: mapRows(branches, stockTransferToBranchKeys),
    });
  } catch (error: unknown) {
    console.error("getToBranchList (stock transfer) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Transfer To branches",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET ITEM LIST (the Item ID / Item Name boxes of the From branch)
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

    const data = await getStockTransferItemListService(
      String(PstrCoID),
      String(lkpBranch)
    );

    return res.status(200).json({
      success: true,
      data: mapRows(data, stockTransferItemKeys),
    });
  } catch (error: unknown) {
    console.error("getItemList (stock transfer) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load item list",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET ITEM STOCK (the "Stock :" box and the unit cost of a chosen item)
   txtStock excludes this document's own OUT lines (txtDocNo).
========================================================= */

export const getItemStock = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch, lkpItemID, txtDocNo } = req.query;

    if (!PstrCoID || !lkpBranch || !lkpItemID) {
      return res.status(400).json({
        success: false,
        message: "Company ID, Branch and Item are required",
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

    const result = await getStockTransferItemStockService(
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
    console.error("getItemStock (stock transfer) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the stock of the item",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET NEXT ENTRY NO. (dbo.getnextdocno for doc type ST of the branch)
========================================================= */

export const getNextDocNo = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch } = req.query;

    if (!PstrCoID || !lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Company ID and Branch are required",
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

    const next = await getStockTransferNextDocNoService(
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
    console.error("getNextDocNo (stock transfer) error:", error);

    return res.status(400).json({
      success: false,
      message: messageOf(error, "The next Entry No. could not be made"),
      field: "txtDocNo",
    });
  }
};

/* =========================================================
   GET STOCK TRANSFER (the saved document of an Entry No.)
   chkSaved = there is one (the button then says Modify)
   chkPosted = it is posted - the page is then locked
========================================================= */

export const getStockTransfer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch, txtDocNo } = req.query;

    if (!PstrCoID || !lkpBranch || !txtDocNo) {
      return res.status(400).json({
        success: false,
        message: "Company ID, Branch and Entry No. are required",
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

    const current = await getStockTransferService(
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
        ? mapKeys(current.header, stockTransferHeaderKeys)
        : null,
      data: mapRows(current.lines, stockTransferLineKeys),
    });
  } catch (error: unknown) {
    console.error("getStockTransfer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Stock Transfer",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   SAVE STOCK TRANSFER (the Save / Modify button)
   S: the Entry No. has no document yet   M: it has one
   The logged-in user comes from the SESSION, not from the request body.
========================================================= */

export const saveStockTransfer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtDocNo,
      lkpToBranch,
      dtpDate,
      txtNote = "",
      chkSaved = false,
      rows = [],
    }: {
      PstrCoID: string;
      PstrYear: string;
      lkpBranch: string;
      txtDocNo: string;
      lkpToBranch: string;
      dtpDate: string;
      txtNote?: string;
      chkSaved?: boolean;
      rows: (StockTransferRowPayload & { txtGridRow?: number })[];
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

    // validators/StockTransferValidator.ts: idle user, year not closed, branch
    // (and the right to it), Entry No., To branch, date, then every line - the
    // first rule that fails stops the save
    const check = await validateStockTransfer({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      txtDocNo,
      lkpToBranch,
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

    // Save (S) when the Entry No. has no document yet, Modify (M) when it has
    // one - each needs its own button right
    const current = await getStockTransferService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      String(txtDocNo).trim()
    );

    const wantedMode = chkSaved && current.lines.length > 0 ? "M" : "S";

    if (!(await hasButtonRight(req.user, MENU_ID, wantedMode))) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${wantedMode === "M" ? "Modify" : "Save"}.`,
        field: "lkpBranch",
      });
    }

    // a posted Stock Transfer is locked: it cannot be changed
    if (current.header?.fpost) {
      return res.status(409).json({
        success: false,
        message: "This Stock Transfer is already posted and cannot be modified.",
        field: "txtDocNo",
      });
    }

    const result = await saveStockTransferService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
      txtDocNo: String(txtDocNo).trim(),
      lkpToBranch,
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
        buildStockTransferAuditNote(lkpBranch, lkpToBranch, dtpDate, result)
      );
    } catch (auditError: unknown) {
      // the document is already saved - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (saveStockTransfer):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: result.docNoChanged
        ? `Entry No. is changed to ${result.txtDocNo}. Stock Transfer saved successfully`
        : result.mode === "M"
          ? "Stock Transfer modified successfully"
          : "Stock Transfer saved successfully",
      mode: result.mode,
      txtDocNo: result.txtDocNo,
    });
  } catch (error: unknown) {
    console.error("saveStockTransfer error:", error);

    return res.status(400).json({
      success: false,
      message: messageOf(error, "Stock Transfer could not be saved"),
    });
  }
};

/* =========================================================
   DELETE STOCK TRANSFER (the Delete button)
   The whole transfer, both sets of rows. Needs the Delete right; a posted one
   cannot be deleted.
========================================================= */

export const deleteStockTransfer = async (
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

    const check = await validateStockTransferDelete({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      txtDocNo,
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
        field: "txtDocNo",
      });
    }

    const current = await getStockTransferService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      String(txtDocNo).trim()
    );

    if (current.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "There is no Stock Transfer to delete.",
        field: "txtDocNo",
      });
    }

    // a posted Stock Transfer is locked: it cannot be deleted
    if (current.header?.fpost) {
      return res.status(409).json({
        success: false,
        message: "This Stock Transfer is already posted and cannot be deleted.",
        field: "txtDocNo",
      });
    }

    const result = await deleteStockTransferService({
      PstrCoID,
      PstrYear: Number(PstrYear),
      lkpBranch,
      txtDocNo: String(txtDocNo).trim(),
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
        String(txtDocNo).trim(),
        SCREEN_NAME,
        "D",
        PstrUserID,
        buildStockTransferDeleteAuditNote(
          lkpBranch,
          String(txtDocNo).trim(),
          result.header?.fsttobrid ?? null,
          result.header?.fdate ?? null,
          result.lines
        )
      );
    } catch (auditError: unknown) {
      console.error("UserAudit error (deleteStockTransfer):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Stock Transfer deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteStockTransfer error:", error);

    return res.status(400).json({
      success: false,
      message: messageOf(error, "Stock Transfer could not be deleted"),
    });
  }
};

/* =========================================================
   PRINT STOCK TRANSFER (the Print button)
   The saved document, for the print page. A POST: the print page asks for the
   data itself. Needs the Print right (P). A posted one can be printed too.
========================================================= */

export const printStockTransfer = async (
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

    const check = await validateStockTransferPrint({
      PstrCoID,
      PstrYear,
      PstrUserID: req.user.userId,
      lkpBranch,
      txtDocNo,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "P"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Print.",
        field: "txtDocNo",
      });
    }

    const report = await getStockTransferPrintService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      String(txtDocNo).trim()
    );

    if (report.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stock Transfer not found",
        field: "txtDocNo",
      });
    }

    return res.status(200).json({
      success: true,
      header: mapKeys(report.header, stockTransferPrintHeaderKeys),
      data: mapRows(report.lines, stockTransferPrintLineKeys),
    });
  } catch (error: unknown) {
    console.error("printStockTransfer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Stock Transfer print",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   POST STOCK TRANSFER (the Post button)
   The From branch's stock goes down, the To branch's up, and the transfer is
   locked. Needs the Post right (T); a posted one can't be posted again. The
   logged-in user comes from the SESSION.
========================================================= */

export const postStockTransfer = async (
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

    // the old ValidateMe("T"): the user, the year, the branch, the Entry No.
    const check = await validateStockTransferPost({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      txtDocNo,
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
        field: "txtDocNo",
      });
    }

    const docNo = String(txtDocNo).trim();

    const current = await getStockTransferService(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      docNo
    );

    if (current.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stock Transfer not found",
        field: "txtDocNo",
      });
    }

    // posting twice would move the stock twice
    if (current.header?.fpost) {
      return res.status(409).json({
        success: false,
        message: "This Stock Transfer is already posted.",
        field: "txtDocNo",
      });
    }

    // the old ValidateGrid("T"): enough posted stock, and a unit cost
    const lineCheck = await validateStockTransferPostLines(
      PstrCoID,
      Number(PstrYear),
      lkpBranch,
      docNo,
      current.lines,
      current.header?.fsttobrid ?? null
    );

    if (!lineCheck.valid) {
      return res.status(lineCheck.status).json({
        success: false,
        message: lineCheck.message,
        field: lineCheck.field,
      });
    }

    const result = await postStockTransferService({
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
        buildStockTransferPostAuditNote(
          lkpBranch,
          docNo,
          result.header?.fsttobrid ?? null,
          result.header?.fdate ?? null,
          result.after
        )
      );
    } catch (auditError: unknown) {
      // the transfer is already posted - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (postStockTransfer):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Stock Transfer posted successfully",
    });
  } catch (error: unknown) {
    console.error("postStockTransfer error:", error);

    return res.status(400).json({
      success: false,
      message: messageOf(error, "Stock Transfer could not be posted"),
    });
  }
};
