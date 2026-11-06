import type { Response } from "express";
import pool from "../../../DB/db.js";
import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  mapRows,
  matchEnquiryCustomerKeys,
  matchEnquiryDivisionKeys,
  matchEnquiryDocumentKeys,
  matchEnquiryLineKeys,
} from "../../../utils/responseKeys.js";
import {
  getAllowedBranchName,
  getRptMatchEnquiry,
} from "../../../services/Finance/Transaction/rptMatchEnquiryService.js";
import {
  buildRptMatchEnquiryWorkbook,
  type RptMatchEnquiryReport,
} from "../../../services/Finance/Transaction/rptMatchEnquiryExcel.js";

/* =====================================================
   HELPERS
===================================================== */

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || String(v).trim() === "";

const NO_COMPANY_MESSAGE = "Company ID is not available in session";

// the logged-in financial year: the app sends it in the x-year header (utils/session.ts apiFetch); "" when it is not one
const getPstrYear = (req: AuthenticatedRequest): string => {
  const year = String(req.header("x-year") ?? "").trim();

  return /^\d{4}$/.test(year) ? year : "";
};

/* =====================================================
   LOAD DROPDOWN DATA
   GET /getLookups
   -> customers [{ lkpCsAccountID, lkpCsAccountName }]
   (VB: clsMatchEnquiry.FillCombos - the lookups that do not depend on a choice; the divisions and the Document No.
   list follow the Customer and the Division)
   PstrCoID comes from the session.
===================================================== */

export const getMatchEnquiryLookups = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const PstrCoID = req.user?.CoID;

    if (!PstrCoID) {
      return res
        .status(400)
        .json({ success: false, message: NO_COMPANY_MESSAGE });
    }

    const customers = await pool.query(
      `SELECT * FROM dbo.filllookupcustomerid($1)`,
      [PstrCoID],
    );

    return res.status(200).json({
      success: true,
      customers: mapRows(customers.rows, matchEnquiryCustomerKeys),
      message: "Match enquiry lookups loaded successfully",
    });
  } catch (error: unknown) {
    console.error("getMatchEnquiryLookups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load match enquiry lookups",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =====================================================
   DIVISIONS OF A CUSTOMER
   POST /getDivisions
   body: { lkpCsAccountID }
   -> divisions [{ lkpDivision, txtDivisionName }]
   (VB: the Division combo, filled when a Customer is chosen)
   PstrCoID comes from the session.
===================================================== */

export const getMatchEnquiryDivisions = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const PstrCoID = req.user?.CoID;
    const { lkpCsAccountID } = req.body;

    if (!PstrCoID) {
      return res
        .status(400)
        .json({ success: false, message: NO_COMPANY_MESSAGE });
    }

    if (isEmpty(lkpCsAccountID)) {
      return res.status(400).json({
        success: false,
        message: "Please select 'Customer'",
        field: "lkpCsAccountID",
      });
    }

    const result = await pool.query(
      `SELECT * FROM dbo.fillcustomerdivisions($1, $2)`,
      [PstrCoID, String(lkpCsAccountID).trim()],
    );

    return res.status(200).json({
      success: true,
      divisions: mapRows(result.rows, matchEnquiryDivisionKeys),
      message: "Customer divisions loaded successfully",
    });
  } catch (error: unknown) {
    console.error("getMatchEnquiryDivisions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load customer divisions",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =====================================================
   DOCUMENT NO. LIST (the matched documents of a customer)
   POST /getDocumentNos
   body: { lkpCsAccountID, lkpDivision }
   -> documents [{ lkpBranch, lkpDocType, lkpDocNo, txtDocTypeNo, txtDate, txtDescription, txtDebit, txtCredit }]
   Loaded when a Customer and a Division are chosen: every document (of any type) of that customer and division that
   is posted and has matched lines, in the branches the user has a right to, one row for each document
   (dbo.sp_pagematchenquirydocuments). The old Search button
   filtered by one Document Type; the screen has no Document Type box now, so each row carries its own type and the
   page takes the document type from the document that is chosen.
   PstrCoID and the user come from the session, the year from the x-year header.
===================================================== */

export const getMatchEnquiryDocumentNos = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const PstrCoID = req.user?.CoID;
    const PstrUserID = req.user?.userId;
    const PstrYear = getPstrYear(req);
    const { lkpCsAccountID, lkpDivision } = req.body;

    if (!PstrCoID) {
      return res
        .status(400)
        .json({ success: false, message: NO_COMPANY_MESSAGE });
    }

    /* ---------- the checks of the old form ---------- */
    if (PstrYear === "") {
      return res
        .status(400)
        .json({ success: false, message: "Please select 'Year'" });
    }
    if (isEmpty(lkpCsAccountID)) {
      return res.status(400).json({
        success: false,
        message: "Please select 'Customer'",
        field: "lkpCsAccountID",
      });
    }

    // CALL and FETCH must run in ONE transaction
    const client = await pool.connect();

    try {
      const cursorName = "cur_matchenquirydocuments";

      await client.query("BEGIN");

      await client.query(
        `
        CALL dbo.sp_pagematchenquirydocuments(
          p_pstrcoid      => $1::varchar,
          p_pstryear      => $2::varchar,
          p_lkpcsaccountid => $3::varchar,
          p_lkpdivision   => $4::varchar,
          p_pstruserid    => $5::varchar,
          p_result_cursor => $6::refcursor
        )
        `,
        [
          PstrCoID, // 1 p_pstrcoid
          PstrYear, // 2 p_pstryear
          String(lkpCsAccountID).trim(), // 3 p_lkpcsaccountid
          isEmpty(lkpDivision) ? null : String(lkpDivision).trim(), // 4 p_lkpdivision
          PstrUserID, // 5 p_pstruserid
          cursorName, // 6 p_result_cursor
        ],
      );

      const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        documents: mapRows(result.rows, matchEnquiryDocumentKeys),
        message: "Document numbers loaded successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("getMatchEnquiryDocumentNos error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the document numbers",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/* =====================================================
   GET MATCH ENQUIRY
   POST /getMatchEnquiry
   body: { lkpBranch, lkpDocType, lkpDocNo }
   -> data [{ txtPC, lkpBranch, lkpDocType, lkpDocNo, txtDate, lkpAccountID, txtDescription, txtSlNo, txtDebit,
              txtCredit, txtMatchApplyDate }]
   (VB: clsMatchEnquiry.GetData + frmMatchEnquiry.ValidateMe)
   PstrCoID comes from the session, the year from the x-year header.
===================================================== */

export const getMatchEnquiry = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const PstrCoID = req.user?.CoID;
  const PstrYear = getPstrYear(req);
  const { lkpBranch, lkpDocType, lkpDocNo } = req.body;

  if (!PstrCoID) {
    return res
      .status(400)
      .json({ success: false, message: NO_COMPANY_MESSAGE });
  }

  /* ---------- ValidateMe ---------- */
  if (PstrYear === "") {
    return res
      .status(400)
      .json({ success: false, message: "Please select 'Year'" });
  }
  if (isEmpty(lkpBranch)) {
    return res.status(400).json({
      success: false,
      message: "Please select 'Branch'",
      field: "lkpBranch",
    });
  }
  // if (isEmpty(lkpDocType)) {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Please input 'Document'",
  //     field: "lkpDocType",
  //   });
  // }
  if (isEmpty(lkpDocNo)) {
    return res.status(400).json({
      success: false,
      message: "Please input 'Document No.'",
      field: "lkpDocNo",
    });
  }

  const client = await pool.connect();

  try {
    const cursorName = "cur_matchenquiry";

    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_pagematchenquiry(
        p_pstrcoid   => $1::varchar,
        p_pstryear   => $2::varchar,
        p_strbrid    => $3::varchar,
        p_strdoctype => $4::varchar,
        p_strdocno   => $5::varchar,
        p_result     => $6::refcursor
      )
      `,
      [
        PstrCoID, // 1 p_pstrcoid
        PstrYear, // 2 p_pstryear
        String(lkpBranch), // 3 p_strbrid
        String(lkpDocType), // 4 p_strdoctype
        String(lkpDocNo).trim(), // 5 p_strdocno
        cursorName, // 6 p_result
      ],
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      data: mapRows(result.rows, matchEnquiryLineKeys),
      message: "Match enquiry loaded successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("getMatchEnquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get match enquiry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};

/* =====================================================
   PRINT (the old rptMatchEnquiryPrint)
   POST /MatchEnquiry/print  -> everything the preview, the printer and the PDF need
   POST /MatchEnquiry/excel  -> the .xlsx file
   body: { lkpBranch, lkpDocType, lkpDocNo }
   The company and the user come from the SESSION; the financial year is the one the app sends in the x-year header
   (the year the user logged in to), as for the other screens of this group.
===================================================== */

class ApiError extends Error {
  status: number;
  field?: string;

  constructor(status: number, message: string, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

// the old objCommon.ReportInfo: "<user>  dd/mm/yyyy hh:mm"
const reportInfo = (PstrUserID: string) => {
  const d = new Date();

  return `${PstrUserID}  ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const sendPrintError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      field: error.field,
    });
  }

  console.error(`MatchEnquiry ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

const prepareReport = async (req: AuthenticatedRequest): Promise<RptMatchEnquiryReport> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;

  const PstrYear = String(req.header("x-year") ?? "").trim();
  const lkpBranch = String(req.body?.lkpBranch ?? "").trim();
  const lkpDocType = String(req.body?.lkpDocType ?? "").trim();
  const lkpDocNo = String(req.body?.lkpDocNo ?? "").trim();

  // ---- the checks of the old form (ValidateMe), in the order of the screen ----
  if (!/^\d{4}$/.test(PstrYear)) throw new ApiError(400, "Please select 'Year'");
  if (lkpBranch === "") throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  if (lkpDocType === "") throw new ApiError(400, "Please input 'Document'", "lkpDocType");
  if (lkpDocNo === "") throw new ApiError(400, "Please input 'Document No.'", "lkpDocNo");

  // a branch may only be one the user has a right to
  const branchName = await getAllowedBranchName(PstrCoID, PstrUserID, lkpBranch);

  if (branchName === null) throw new ApiError(403, "This branch is not allowed", "lkpBranch");

  const groups = await getRptMatchEnquiry({ PstrCoID, PstrYear, lkpBranch, lkpDocType, lkpDocNo });

  if (groups.length === 0) throw new ApiError(404, "No records found");

  return {
    txtCoName: await getCompanyName(PstrCoID),
    txtHeading: "Match Enquiry",
    txtBranch: `Branch : ${branchName}`,
    txtDocument: `Document : ${lkpDocType} ${lkpDocNo}`,
    txtReportInfo: reportInfo(PstrUserID),
    groups,
  };
};

export const getPrintData = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const report = await prepareReport(req);

    return res.status(200).json({
      success: true,
      report,
      fileBase: `Match Enquiry ${String(req.body?.lkpDocType ?? "").trim()} ${String(req.body?.lkpDocNo ?? "").trim()}`.trim(),
    });
  } catch (error: unknown) {
    return sendPrintError(res, error, "getPrintData");
  }
};

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const report = await prepareReport(req);
    const buffer = await buildRptMatchEnquiryWorkbook(report);
    const fileBase = `Match Enquiry ${String(req.body?.lkpDocType ?? "").trim()} ${String(req.body?.lkpDocNo ?? "").trim()}`
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.xlsx"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    return res.status(200).send(buffer);
  } catch (error: unknown) {
    return sendPrintError(res, error, "getExcel");
  }
};
