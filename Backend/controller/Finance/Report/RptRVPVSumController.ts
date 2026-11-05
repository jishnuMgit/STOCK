import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getAccounts,
  getBranches,
  getDefaultBranch,
  getDocuments,
  getRVPVSum,
  type RVPVSumParams,
} from "../../../services/Finance/Report/rptRVPVSumService.js";
import {
  buildRVPVSumWorkbook,
  type RVPVSumReport,
} from "../../../services/Finance/Report/rptRVPVSumExcel.js";

// The Receipt / Payment Summary report screen (Finance > Reports > Receipt/Payment Summary). The logged-in company and
// user come from the SESSION (authenticate), never from the request.
//
// The keys are the element ids of the page (the old rptRVPVSum form):
//   rdgBranch         0 One Branch, 1 Selected Branch, 2 All Branch
//   lkpBranch         the branch (One Branch)
//   chkBranch         the ticked branches (Selected Branch), an array of branch ids
//   lkpDocument       the document type: BR, CR, BP, CP ...
//   rdgAccount        0 One Account, 1 All Account
//   lkpAccountID      the account (One Account)
//   dtpFromDate       yyyy-mm-dd
//   dtpToDate         yyyy-mm-dd
//   lkpPostStatus     0 All, 1 Posted, 2 Non Posted (the same as the other reports)
// and, in the lookups:
//   txtBranchName, lkpDefaultBranch, txtDocumentName, txtAccountName

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// the Post Status text of the heading (the old cboPostStatus text), by lkpPostStatus
const POST_STATUS_TEXT = ["All", "Posted", "Non Posted"];

// dd-MMM-yyyy of a yyyy-mm-dd text
const ddmmmyyyy = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}-${MONTHS[Number(month) - 1]}-${year}`;
};

// yyyy-mm-dd that is a real date
const isRealDate = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;

  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  return (
    d.getFullYear() === Number(m[1]) &&
    d.getMonth() === Number(m[2]) - 1 &&
    d.getDate() === Number(m[3])
  );
};

// the old objCommon.ReportInfo: "<user>  dd/mm/yyyy hh:mm"
const reportInfo = (PstrUserID: string) => {
  const d = new Date();

  return `${PstrUserID}  ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      field: error.field,
    });
  }

  console.error(`rptRVPVSum ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

/* =========================================================
   GET /RptRVPVSum/lookups   (the old FillCombos)
   -> branches [{ lkpBranch, txtBranchName }], lkpDefaultBranch,
      documents [{ lkpDocument, txtDocumentName }], accounts [{ lkpAccountID, txtAccountName }]
   The branches are the ones the logged-in user has a right to; the old screen starts on the default branch. The
   documents are those of the Finance module without JV / PJ / SJ; the accounts are the head accounts.
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

    const [branches, defaultBranch, documents, accounts] = await Promise.all([
      getBranches(PstrCoID, PstrUserID),
      getDefaultBranch(PstrCoID, PstrUserID),
      getDocuments(PstrCoID),
      getAccounts(PstrCoID),
    ]);

    return res.status(200).json({
      success: true,
      branches: branches.map((b) => ({ lkpBranch: b.brId, txtBranchName: b.brName })),
      lkpDefaultBranch: defaultBranch,
      documents: documents.map((d) => ({ lkpDocument: d.docType, txtDocumentName: d.docName })),
      accounts: accounts.map((a) => ({ lkpAccountID: a.accountId, txtAccountName: a.accountName })),
    });
  } catch (error: unknown) {
    console.error("rptRVPVSum getLookups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the lookups",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   THE REPORT: the checks of the old form, then the data. Print and Excel share it.
========================================================= */

type Prepared = { report: RVPVSumReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgAccount = Number(body.rdgAccount);
  const lkpPostStatus = Number(body.lkpPostStatus);

  const lkpBranch = String(body.lkpBranch ?? "").trim();
  const chkBranch: string[] = Array.isArray(body.chkBranch)
    ? body.chkBranch.map((b: unknown) => String(b ?? "").trim()).filter((b: string) => b !== "")
    : [];
  const lkpDocument = String(body.lkpDocument ?? "").trim();
  const lkpAccountID = String(body.lkpAccountID ?? "").trim();
  const dtpFromDate = String(body.dtpFromDate ?? "").trim();
  const dtpToDate = String(body.dtpToDate ?? "").trim();

  // ---- the checks of the old form, in the order of the screen ----
  if (lkpDocument === "") throw new ApiError(400, "Please select a 'Document'", "lkpDocument");

  if (![0, 1, 2].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");

  if (rdgBranch === 0 && lkpBranch === "") {
    throw new ApiError(400, "Please select a 'Branch'", "lkpBranch");
  }

  if (rdgBranch === 1 && chkBranch.length === 0) {
    throw new ApiError(400, "Please select atleast one 'Branch'", "chkBranch");
  }

  if (![0, 1].includes(rdgAccount)) throw new ApiError(400, "Please select 'Account'", "rdgAccount");

  if (rdgAccount === 0 && lkpAccountID === "") {
    throw new ApiError(400, "Please select an 'Account ID'", "lkpAccountID");
  }

  if (dtpFromDate === "") throw new ApiError(400, "Please select 'From Date'", "dtpFromDate");
  if (!isRealDate(dtpFromDate)) {
    throw new ApiError(400, "'From Date' is not a valid date", "dtpFromDate");
  }

  if (dtpToDate === "") throw new ApiError(400, "Please select 'To Date'", "dtpToDate");
  if (!isRealDate(dtpToDate)) {
    throw new ApiError(400, "'To Date' is not a valid date", "dtpToDate");
  }

  // yyyy-mm-dd texts compare as dates
  if (dtpFromDate > dtpToDate) {
    throw new ApiError(400, "'To Date' should be greater than 'From Date'", "dtpToDate");
  }

  // the report lists the vouchers of the year of the From Date: the period stays inside one year
  if (dtpFromDate.slice(0, 4) !== dtpToDate.slice(0, 4)) {
    throw new ApiError(400, "'From Date' and 'To Date' should be in the same year", "dtpToDate");
  }

  if (![0, 1, 2].includes(lkpPostStatus)) {
    throw new ApiError(400, "Please select 'Post Status'", "lkpPostStatus");
  }

  // the choices must be real: a branch the user has a right to, a document of the list, a head account
  const allowed = await getBranches(PstrCoID, PstrUserID);
  const allowedIds = allowed.map((b) => b.brId);

  if (rdgBranch === 0 && !allowedIds.includes(lkpBranch)) {
    throw new ApiError(403, "This branch is not allowed", "lkpBranch");
  }

  if (rdgBranch === 1 && chkBranch.some((b) => !allowedIds.includes(b))) {
    throw new ApiError(403, "A selected branch is not allowed", "chkBranch");
  }

  const document = (await getDocuments(PstrCoID)).find((d) => d.docType === lkpDocument);

  if (!document) throw new ApiError(400, "This document is not found", "lkpDocument");

  if (rdgAccount === 0) {
    const account = (await getAccounts(PstrCoID)).find((a) => a.accountId === lkpAccountID);

    if (!account) throw new ApiError(400, "This account is not found", "lkpAccountID");
  }

  const params: RVPVSumParams = {
    PstrCoID,
    // All Branch: the branches the user has a right to - never a branch the user may not see
    rdgBranch: (rdgBranch === 2 ? 1 : rdgBranch) as 0 | 1 | 2,
    lkpBranch,
    chkBranch: rdgBranch === 2 ? allowedIds : chkBranch,
    lkpDocument,
    rdgAccount: rdgAccount as 0 | 1,
    lkpAccountID,
    dtpFromDate,
    dtpToDate,
    lkpPostStatus: lkpPostStatus as 0 | 1 | 2,
  };

  const nameOf = (id: string) => allowed.find((b) => b.brId === id)?.brName || id;

  // the old header row: "Branch : X" (one), "Branch : X, Y" (selected), nothing for All Branch
  const txtBranch =
    rdgBranch === 0
      ? `Branch : ${nameOf(lkpBranch)}`
      : rdgBranch === 1
        ? `Branch : ${chkBranch.map(nameOf).join(", ")}`
        : "";

  const { lines, totals } = await getRVPVSum(params);

  if (lines.length === 0) throw new ApiError(404, "No records found");

  return {
    report: {
      txtCoName: await getCompanyName(PstrCoID),
      txtHeading: `${document.docName} Summary For The Period ${ddmmmyyyy(dtpFromDate)} To ${ddmmmyyyy(dtpToDate)} (${POST_STATUS_TEXT[lkpPostStatus]})`,
      txtBranch,
      txtReportInfo: reportInfo(PstrUserID),
      lines,
      totals,
    },
    fileBase: `${document.docName} Summary ${ddmmmyyyy(dtpFromDate)} to ${ddmmmyyyy(dtpToDate)}`,
  };
};

/* =========================================================
   POST /RptRVPVSum/print  -> everything the preview, the printer and the PDF need
========================================================= */

export const getPrintData = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);

    return res.status(200).json({ success: true, report, fileBase });
  } catch (error: unknown) {
    return sendError(res, error, "getPrintData");
  }
};

/* =========================================================
   POST /RptRVPVSum/excel  -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildRVPVSumWorkbook(report);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.xlsx"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    return res.status(200).send(buffer);
  } catch (error: unknown) {
    return sendError(res, error, "getExcel");
  }
};
