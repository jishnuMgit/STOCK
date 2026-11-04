import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { validateStockDocumentRePost } from "../../../validators/StockDocumentRePostValidator.js";
import { rePostDocuments, getPostingRange } from "../../../services/Sales/Transaction/stockDocumentRePostService.js";

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

// the document being posted right now, for each user (the page asks for it while the re-post runs)
const progressByUser = new Map<string, { running: boolean; current: string }>();

// the procedure does RAISE NOTICE 'POSTING:<posting no.>' for every document it posts
const NOTICE_PREFIX = "POSTING:";

/* =========================================================
   GET /StockDocumentRePost/getProgress   (the page asks every half second while posting)
   -> running, current (the posting no. of the document being posted)
========================================================= */

export const getProgress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const progress = progressByUser.get(req.user.userId) ?? { running: false, current: "" };

  return res.status(200).json({ success: true, ...progress });
};

/* =========================================================
   POST /StockDocumentRePost/repost   (the Post button)
   body: { txtFromTxnNo, txtToTxnNo }
   Needs the Post right (T). The stock is built again from the posted documents between the two posting numbers
   (dbo.sp_pagestockdocumentrepost). It refuses, before changing anything, when it cannot do it safely: the range holds a
   document type that cannot be re-posted yet, or a branch has posted documents outside the range. The procedure's own
   message says which.
   -> message, txtRePostedCount, txtProcessingDoc (the last document processed), txtTimeTakenSec
========================================================= */

/* =========================================================
   GET /StockDocumentRePost/getRange?PstrYear=2026   (page load)
   The first and the last posting number and the count of the posted documents of the logged-in company and year
   (dbo.sp_getpostingrange).
   -> minPostingNo, maxPostingNo, totalPostedCount
========================================================= */

export const getRange = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const PstrCoID = req.user.CoID;

    // the year is sent as digits (the login year), the same as the other screens
    const PstrYear = text(req.query.PstrYear);

    if (!/^\d+$/.test(PstrYear)) {
      return res.status(400).json({ success: false, message: "Year is required" });
    }

    const range = await getPostingRange({ PstrCoID, PstrYear });

    return res.status(200).json({ success: true, ...range });
  } catch (error: unknown) {
    console.error("stockDocumentRePost getRange error:", error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Request failed",
    });
  }
};

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

    progressByUser.set(PstrUserID, { running: true, current: "" });

    let lastDoc = "";

    try {
      result = await rePostDocuments({
        PstrCoID,
        PstrUserID,
        txtFromTxnNo,
        txtToTxnNo,
        onNotice: (message) => {
          if (message.startsWith(NOTICE_PREFIX)) {
            lastDoc = message.slice(NOTICE_PREFIX.length).trim();
            progressByUser.set(PstrUserID, { running: true, current: lastDoc });
          }
        },
      });
    } catch (error: unknown) {
      // the procedure's own messages ("The re-post of the document type(s) PI is not available yet", "No posted
      // document found ...") are for the user: nothing was changed
      console.error("stockDocumentRePost rePost error:", error);

      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : `${SCREEN_NAME} could not be done`,
        field: "txtFromTxnNo",
      });
    } finally {
      progressByUser.set(PstrUserID, { running: false, current: "" });
    }

    // the total time of the re-post, in seconds: the procedure's own clock
    const timeTakenSec = result.timeTakenSec;

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
        `Re-posted ${result.count} document(s) from Txn. No. ${txtFromTxnNo} to ${txtToTxnNo} in ${timeTakenSec} sec`
      );
    } catch (auditError: unknown) {
      // the stock is already built again - don't fail the request over an audit-logging problem
      console.error("UserAudit error (rePost):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: `${SCREEN_NAME} posted successfully\n${result.count} document(s) in ${timeTakenSec} sec`,
      txtRePostedCount: result.count,
      txtProcessingDoc: result.processingDoc || lastDoc,
      txtTimeTakenSec: timeTakenSec,
    });
  } catch (error: unknown) {
    console.error("stockDocumentRePost error:", error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Request failed",
    });
  }
};
