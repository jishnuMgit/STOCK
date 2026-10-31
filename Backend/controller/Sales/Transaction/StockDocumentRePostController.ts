import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { validateStockDocumentRePost } from "../../../validators/StockDocumentRePostValidator.js";
import { rePostDocuments } from "../../../services/Sales/Transaction/stockDocumentRePostService.js";

// The Stock Document Re-Post screen (Sales > Transaction > Stock Document Re-Post). The logged-in company and user come
// from the SESSION (authenticate), never from the request.
//
// The keys are the element ids of the page:
//   txtFromTxnNo   the first posting number
//   txtToTxnNo     the last posting number

// dbo.tblmenu fmenuid of the Stock Document Re-Post page
const MENU_ID = "020106";

const SCREEN_NAME = "Stock Document Re-Post";

const text = (value: unknown): string => String(value ?? "").trim();

/* =========================================================
   POST /StockDocumentRePost/repost   (the Post button)
   body: { txtFromTxnNo, txtToTxnNo }
   Needs the Post right (T). The stock is built again from the posted documents between the two posting numbers
   (dbo.sp_pagestockdocumentrepost). It refuses, before changing anything, when it cannot do it safely: the range holds a
   document type that cannot be re-posted yet, or a branch has posted documents outside the range. The procedure's own
   message says which.
   -> message, txtRePostedCount
========================================================= */

export const rePost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { CoID: PstrCoID, userId: PstrUserID } = req.user;
    const body = (req.body ?? {}) as { txtFromTxnNo?: unknown; txtToTxnNo?: unknown };

    const txtFromTxnNo = text(body.txtFromTxnNo);
    const txtToTxnNo = text(body.txtToTxnNo);

    const check = await validateStockDocumentRePost({ PstrUserID, txtFromTxnNo, txtToTxnNo });

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
        field: "txtFromTxnNo",
      });
    }

    let result;

    try {
      result = await rePostDocuments({ PstrCoID, PstrUserID, txtFromTxnNo, txtToTxnNo });
    } catch (error: unknown) {
      // the procedure's own messages ("The re-post of the document type(s) PI is not available yet", "No posted
      // document found ...") are for the user: nothing was changed
      console.error("stockDocumentRePost rePost error:", error);

      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : `${SCREEN_NAME} could not be done`,
        field: "txtFromTxnNo",
      });
    }

    // USER AUDIT (only after the re-post has actually succeeded)
    try {
      await UserAudit(
        PstrCoID,
        null,
        null,
        null,
        `${txtFromTxnNo}-${txtToTxnNo}`,
        SCREEN_NAME,
        "T",
        PstrUserID,
        `Re-posted ${result.count} document(s) from Txn. No. ${txtFromTxnNo} to ${txtToTxnNo}`
      );
    } catch (auditError: unknown) {
      // the stock is already built again - don't fail the request over an audit-logging problem
      console.error("UserAudit error (rePost):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: `${SCREEN_NAME} posted successfully\n${result.message}`,
      txtRePostedCount: result.count,
    });
  } catch (error: unknown) {
    console.error("stockDocumentRePost error:", error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Request failed",
    });
  }
};
