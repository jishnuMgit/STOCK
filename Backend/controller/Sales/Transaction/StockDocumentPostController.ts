import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { validateStockDocumentPost } from "../../../validators/StockDocumentPostValidator.js";
import {
  getBranches,
  getDefaultBranch,
  getDocumentLines,
  getDocumentName,
  getDocuments,
  getItemPostedStock,
  getOriginalDocNo,
  getUnpostedDocuments,
  getYears,
  haveUnitCost,
  isDocumentPosted,
  postDocument,
} from "../../../services/Sales/Transaction/stockDocumentPostService.js";

// The Stock Document Post screen (Sales > Transaction > Stock Document Post, the old frmStDocPost). The
// logged-in company and user come from the SESSION (authenticate), never from the request.
//
// The keys are the element ids of the page:
//   lkpBranch      the branch
//   lkpDocument    the document type (PI, PR, SI, SR, ADJ ...)
//   lkpYear        the year (it has to be the login year)
//   lkpMonth       1 - 12
//   PstrYear       the login year
//   documents      [{ txtDocNo }] the documents that are ticked (POST /post)

// dbo.tblmenu fmenuid of the Stock Document Post page
const MENU_ID = "020105";

const SCREEN_NAME = "Stock Document Post";

// the documents whose post procedure (the old SP_PRPost / SP_SIPost / SP_SRPost) is not built yet
const POST_NOT_BUILT = ["PR", "SI", "SR"];

// the documents that bring stock IN: no stock check (the old strArrDocType: PI, SRC, SRR)
const NO_STOCK_CHECK = ["PI", "SR"];

// The title of each document, as the other screens call it (their SCREEN_TITLE / SCREEN_NAME). The names in
// tbldocument are not used for what the screen shows or says: some are spelled differently there.
const DOCUMENT_TITLE: Record<string, string> = {
  BG: "Beginning Stock",
  PI: "Purchase Invoice",
  PR: "Purchase Return",
  SI: "Sales Invoice",
  SR: "Sales Return",
  ST: "Stock Transfer",
  ADJ: "Stock Adjustment",
};

// the title of a document type (a type that has none above keeps its name from tbldocument)
const documentTitle = (docType: string, docName: string): string =>
  DOCUMENT_TITLE[docType] ?? docName;

const text = (value: unknown): string => String(value ?? "").trim();

const sendError = (res: Response, error: unknown, what: string) => {
  console.error(`stockDocumentPost ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : "Request failed",
  });
};

/* =========================================================
   GET /StockDocumentPost/lookups  -> what the screen needs to open
   branches            the branches the logged-in user has a right to
   lkpDefaultBranch    the user's default branch ("" when none is set)
   documents           the documents that are posted here
   years               the years of the company
========================================================= */

export const getLookups = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { CoID: PstrCoID, userId: PstrUserID } = req.user;

    const [branches, defaultBranch, documents, years] = await Promise.all([
      getBranches(PstrCoID, PstrUserID),
      getDefaultBranch(PstrCoID, PstrUserID),
      getDocuments(PstrCoID),
      getYears(PstrCoID),
    ]);

    return res.status(200).json({
      success: true,
      branches: branches.map((b) => ({ lkpBranch: b.brId, txtBranchName: b.brName })),
      lkpDefaultBranch: defaultBranch,
      documents: documents.map((d) => ({
        lkpDocument: d.docType,
        txtDocumentName: documentTitle(d.docType, d.docName),
      })),
      years: years.map((y) => ({ lkpYear: y })),
    });
  } catch (error: unknown) {
    return sendError(res, error, "getLookups");
  }
};

/* =========================================================
   GET /StockDocumentPost/list?lkpBranch=&lkpDocument=&lkpYear=&lkpMonth=&PstrYear=
   (the old GetData) -> the documents that are not posted yet:
   txtDocNo, txtDate (yyyy-mm-dd), txtAccountID, txtDocAmt
========================================================= */

export const getList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { CoID: PstrCoID, userId: PstrUserID } = req.user;
    const q = req.query as Record<string, string | undefined>;

    const check = await validateStockDocumentPost({
      PstrCoID,
      PstrYear: q.PstrYear,
      PstrUserID,
      lkpBranch: q.lkpBranch,
      lkpDocument: q.lkpDocument,
      lkpYear: q.lkpYear,
      lkpMonth: q.lkpMonth,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    const documents = await getUnpostedDocuments({
      PstrCoID,
      lkpBranch: text(q.lkpBranch),
      lkpDocument: text(q.lkpDocument),
      lkpYear: text(q.lkpYear),
      lkpMonth: Number(q.lkpMonth),
    });

    return res.status(200).json({
      success: true,
      rows: documents.map((d) => ({
        txtDocNo: d.docNo,
        txtDate: d.date,
        txtAccountID: d.accountId,
        txtDocAmt: d.docAmt,
      })),
    });
  } catch (error: unknown) {
    return sendError(res, error, "getList");
  }
};

/* =========================================================
   POST /StockDocumentPost/post   (the Post button, the old cmdPost_Click)
   body: { PstrYear, lkpBranch, lkpDocument, lkpYear, lkpMonth, documents: [{ txtDocNo }] }
   Needs the Post right (T). Every ticked document is checked and posted on its own, one transaction each:
     - a Purchase Return needs its Purchase Invoice posted first, a Sales Return its Sales Invoice
     - a document that takes stock OUT is skipped when an item has less stock than the quantity
     - every line needs a unit cost - the post STOPS at the first line that has none
   -> txtPostedCount, txtOutOfStockCount, txtStopMessage / txtStopDocNo (when it stopped), and the message
========================================================= */

export const postDocuments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { CoID: PstrCoID, userId: PstrUserID } = req.user;
    const body = (req.body ?? {}) as {
      PstrYear?: unknown;
      lkpBranch?: unknown;
      lkpDocument?: unknown;
      lkpYear?: unknown;
      lkpMonth?: unknown;
      documents?: { txtDocNo?: unknown }[];
    };

    const lkpBranch = text(body.lkpBranch);
    const lkpDocument = text(body.lkpDocument);
    const lkpYear = text(body.lkpYear);

    const check = await validateStockDocumentPost({
      PstrCoID,
      PstrYear: body.PstrYear,
      PstrUserID,
      lkpBranch,
      lkpDocument,
      lkpYear,
      lkpMonth: body.lkpMonth,
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
        field: "lkpDocument",
      });
    }

    // the document has to be one of those posted here
    const dbDocName = await getDocumentName(PstrCoID, lkpDocument);

    if (dbDocName === "") {
      return res.status(400).json({
        success: false,
        message: `'${lkpDocument}' cannot be posted here`,
        field: "lkpDocument",
      });
    }

    const docName = documentTitle(lkpDocument, dbDocName);

    if (POST_NOT_BUILT.includes(lkpDocument)) {
      return res.status(400).json({
        success: false,
        message: `The post of ${docName} is not available yet`,
        field: "lkpDocument",
      });
    }

    const docNos = (Array.isArray(body.documents) ? body.documents : [])
      .map((d) => text(d.txtDocNo))
      .filter((d) => d !== "");

    if (docNos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select a Document to post",
        field: "lkpDocument",
      });
    }

    let postedCount = 0;
    let outOfStockCount = 0;
    let alreadyPostedCount = 0;
    let stopMessage = "";
    let stopDocNo = "";
    // the documents the database refused to post, with its reason (one line each)
    const failedMessages: string[] = [];

    for (const txtDocNo of docNos) {
      const doc = { PstrCoID, lkpBranch, lkpDocument, lkpYear, txtDocNo };

      // a document that is posted already (the list on the screen was old, or another user posted it): it is
      // not posted again and not counted
      if (await isDocumentPosted(doc)) {
        alreadyPostedCount += 1;
        continue;
      }

      // a Purchase Return against a Purchase Invoice: post that Purchase Invoice first
      if (lkpDocument === "PR") {
        const piNo = await getOriginalDocNo(doc);

        if (!(await isDocumentPosted({ ...doc, lkpDocument: "PI", txtDocNo: piNo }))) {
          stopMessage = `Purchase Return No.: ${txtDocNo} - Please post 'Purchase Invoice  No.: ${piNo} first.`;
          stopDocNo = txtDocNo;
          break;
        }
      }

      // a Sales Return against a Sales Invoice: post that Sales Invoice first
      if (lkpDocument === "SR") {
        const siNo = await getOriginalDocNo(doc);

        if (!(await isDocumentPosted({ ...doc, lkpDocument: "SI", txtDocNo: siNo }))) {
          stopMessage = `Sales Return No.: ${txtDocNo} - Please post Sales Invoice No. :${siNo} first.`;
          stopDocNo = txtDocNo;
          break;
        }
      }

      const lines = await getDocumentLines(doc);
      let canProcess = true;

      for (const line of lines) {
        // STOCK CHECKING: a document that takes stock out needs the stock
        if (!NO_STOCK_CHECK.includes(lkpDocument)) {
          const stock = await getItemPostedStock({
            PstrCoID,
            lkpYear,
            lkpBranch,
            lkpItemID: line.itemId,
          });

          if (line.qtyOut > stock) {
            canProcess = false;
            outOfStockCount += 1;
            break;
          }
        }

        // UNIT COST CHECKING
        const haveCost = await haveUnitCost({
          PstrCoID,
          lkpBranch,
          lkpItemID: line.itemId,
          lkpYear: line.year,
          lkpDocument,
          txtDocNo,
          qtyIn: line.qtyIn,
          qtyOut: line.qtyOut,
        });

        if (!haveCost) {
          canProcess = false;
          stopMessage = `Doc. No.: ${lkpDocument}  ${txtDocNo}: Check Unit Cost for the Item : ${line.itemId}`;
          stopDocNo = txtDocNo;
          break;
        }
      }

      // the old "Exit For" on a unit cost problem: the post stops there
      if (stopMessage !== "") {
        break;
      }

      if (!canProcess) {
        continue;
      }

      try {
        postedCount += await postDocument({ ...doc, PstrUserID });
      } catch (error: unknown) {
        // a document that could not be posted: the others go on, as the old form did. The reason is the
        // database's own message (e.g. "The Stock Account of the Branch SA is not set"), and it is shown
        console.error(`stockDocumentPost post ${lkpDocument} ${txtDocNo} error:`, error);
        failedMessages.push(
          `Doc. No.: ${lkpDocument}  ${txtDocNo}: ${error instanceof Error ? error.message : String(error)}`
        );
        continue;
      }

      // USER AUDIT (only after the post has actually succeeded)
      try {
        await UserAudit(
          PstrCoID,
          lkpYear,
          lkpBranch,
          lkpDocument,
          txtDocNo,
          SCREEN_NAME,
          "T",
          PstrUserID,
          `${docName} No. ${txtDocNo} posted`
        );
      } catch (auditError: unknown) {
        // the document is already posted - don't fail the request over an audit-logging problem
        console.error("UserAudit error (postDocuments):", auditError);
      }
    }

    // the same success message as the other screens ("<screen title> posted successfully"), and what was
    // left out, one line each
    const lines: string[] = [];

    if (postedCount > 0) {
      lines.push(`${SCREEN_NAME} posted successfully`);
    }

    if (outOfStockCount > 0) {
      lines.push(`There are ${outOfStockCount} Document(s) with Out of Stock Item(s)`);
    }

    if (alreadyPostedCount > 0) {
      lines.push(`${alreadyPostedCount} Document(s) were already posted`);
    }

    const message = lines.length > 0 ? lines.join("\n") : `${SCREEN_NAME} could not be posted`;

    return res.status(200).json({
      success: true,
      message,
      txtPostedCount: postedCount,
      txtOutOfStockCount: outOfStockCount,
      txtAlreadyPostedCount: alreadyPostedCount,
      txtStopMessage: stopMessage,
      txtStopDocNo: stopDocNo,
      txtErrorMessage: failedMessages.join("\n"),
    });
  } catch (error: unknown) {
    return sendError(res, error, "postDocuments");
  }
};
