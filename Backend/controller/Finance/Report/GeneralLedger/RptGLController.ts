// controller/Finance/Report/RptGLController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../../middleware/authMiddleware.js";
import {
  getUserBranches,
  getCostCenters,
  getAccountsById,
  getAccountsByName,
  getGL,
} from "../../../../services/Finance/Report/GeneralLedger/RptGLService.js";
import {
  buildGLWorkbook,
  type GLReport,
} from "../../../../services/Finance/Report/GeneralLedger/RptGLExcel.js";
import { getCompanyName } from "../../../../utils/companyName.js";

type Session = { coId: string; userId: string; coName: string };

const pick = (...values: unknown[]): string => {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s !== "") return s;
  }
  return "";
};

// Company and user come from the logged-in user (auth middleware).
// STOPGAP: if the session is empty, the values the page sends are used.
// Remove the `src.*` parts once the page sends the login.
const getSession = (req: AuthenticatedRequest): Session => {
  const u = (req.user ?? {}) as Record<string, unknown>;
  const src = { ...(req.query ?? {}), ...(req.body ?? {}) } as Record<
    string,
    unknown
  >;

  return {
    coId: pick(u.CoID, u.coId, u.CoId, u.coID, src.coId),
    userId: pick(u.userId, u.UserID, u.userID, u.UserId, src.userId),
    coName: pick(u.CoName, u.coName, src.coName),
  };
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

// VB objCommon.ReportInfo - assumed: "<user>  dd/mm/yyyy hh:mm"
const reportInfo = (userId: string) => {
  const d = new Date();
  return `${userId}  ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "DD/MM/YYYY" -> { d, mo, y } or null when it is not a real date
const parseDMY = (s: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  return { d, mo, y };
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res
      .status(error.status)
      .json({ success: false, message: error.message });
  }
  console.error(`rptGL ${what} error:`, error);
  return res
    .status(500)
    .json({ success: false, message: "Failed to prepare the report" });
};

// ------------------------------------------------------------
// GET /api/RptGL/lookups
//   -> branches (the user's), cost centers, accounts by id, accounts by name
// ------------------------------------------------------------
export const getLookups = async (req: AuthenticatedRequest, res: Response) => {
  const { coId, userId } = getSession(req);
  if (!coId) {
    return res
      .status(401)
      .json({ success: false, message: "Company not found in session" });
  }
  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not found in session" });
  }

  try {
    const [branches, costCenters, accountsById, accountsByName] =
      await Promise.all([
        getUserBranches(coId, userId),
        getCostCenters(coId),
        getAccountsById(coId),
        getAccountsByName(coId),
      ]);
    return res
      .status(200)
      .json({ success: true, branches, costCenters, accountsById, accountsByName });
  } catch (error) {
    console.error("rptGL getLookups error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load the lookups" });
  }
};

// ------------------------------------------------------------
// VB ValidateMe + the data of the report. Used by Print and Excel.
// ------------------------------------------------------------
type Prepared = { report: GLReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  const { coId, userId, coName: sessionCoName } = getSession(req);
  if (!coId) throw new ApiError(401, "Company not found in session");
  if (!userId) throw new ApiError(401, "User not found in session");

  const body = req.body ?? {};
  const allBranches = body.allBranches === true;
  const branchId = String(body.branchId ?? "").trim();
  const accountMode = Number(body.accountMode ?? 0); // 0 one, 1 range, 2 all
  const accountId = String(body.accountId ?? "").trim();
  const fromAccountId = String(body.fromAccountId ?? "").trim();
  const toAccountId = String(body.toAccountId ?? "").trim();
  const ccId = String(body.ccId ?? "").trim(); // "" = All C.C.
  const fromText = String(body.fromDate ?? "").trim();
  const toText = String(body.toDate ?? "").trim();
  const withOpening = body.withOpening !== false; // With OP is the default
  const postStatus = Number(body.postStatus ?? 2);
  const transType = Number(body.transType ?? 2);
  const print0Bal = body.print0Bal === true;

  if (!allBranches && !branchId) {
    throw new ApiError(400, "Please select a 'Branch'");
  }
  if (![0, 1, 2].includes(accountMode)) {
    throw new ApiError(400, "Invalid 'Account' option");
  }
  if (accountMode === 0 && !accountId) {
    throw new ApiError(400, "Please select an 'Account ID'");
  }
  if (accountMode === 1) {
    if (!fromAccountId) throw new ApiError(400, "Please select 'From Account ID'");
    if (!toAccountId) throw new ApiError(400, "Please select 'To Account ID'");
  }
  if (accountId.length > 12 || fromAccountId.length > 12 || toAccountId.length > 12) {
    throw new ApiError(400, "Invalid 'Account ID'");
  }
  if (ccId.length > 8) throw new ApiError(400, "Invalid 'Cost Center'");
  if (!fromText) throw new ApiError(400, "Please select 'From Date'");
  if (!toText) throw new ApiError(400, "Please select 'To Date'");

  const from = parseDMY(fromText);
  const to = parseDMY(toText);
  if (!from || !to) throw new ApiError(400, "Date must be DD/MM/YYYY");
  if (
    new Date(from.y, from.mo - 1, from.d).getTime() >
    new Date(to.y, to.mo - 1, to.d).getTime()
  ) {
    throw new ApiError(400, "'To Date' should be greater than 'From Date'");
  }

  if (![0, 1, 2].includes(postStatus)) {
    throw new ApiError(400, "Invalid 'Post Status'");
  }
  if (![0, 1, 2].includes(transType)) {
    throw new ApiError(400, "Invalid 'Transaction Type'");
  }

  // a branch may only be one the user has
  let branchName = "";
  if (!allBranches) {
    const branches = await getUserBranches(coId, userId);
    const branch = branches.find((b) => b.brId === branchId);
    if (!branch) throw new ApiError(403, "This branch is not allowed");
    branchName = branch.brName;
  }

  // ---- the report -------------------------------------------
  const data = await getGL({
    coId,
    allBranches,
    branchId,
    accountMode: accountMode as 0 | 1 | 2,
    accountId,
    fromAccountId,
    toAccountId,
    ccId,
    fromDate: fromText,
    toDate: toText,
    withOpening,
    postStatus: postStatus as 0 | 1 | 2,
    print0Bal,
    transType: transType as 0 | 1 | 2,
  });

  if (data.accounts.length === 0) throw new ApiError(404, "No records found");

  const coName = sessionCoName || (await getCompanyName(coId));

  // date + time, so a new download never has the name of a file that is
  // still open (Acrobat / Excel lock the file)
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  return {
    report: {
      coName,
      heading: `General Ledger For The Period ${pad(from.d)}-${MONTHS[from.mo - 1]}-${from.y} To ${pad(to.d)}-${MONTHS[to.mo - 1]}-${to.y}`,
      branch: allBranches ? "" : `Branch : ${branchName}`,
      reportInfo: reportInfo(userId),
      ...data,
    },
    fileBase: `GeneralLedger_${from.y}${pad(from.mo)}${pad(from.d)}_${to.y}${pad(to.mo)}${pad(to.d)}_${stamp}`,
  };
};

// ------------------------------------------------------------
// POST /api/RptGL/print
// body: { allBranches: boolean, branchId?: string,
//         accountMode: 0 one | 1 range | 2 all,
//         accountId?: string, fromAccountId?: string, toAccountId?: string,
//         ccId: string,                  ("" = all cost centers)
//         fromDate: "DD/MM/YYYY", toDate: "DD/MM/YYYY",
//         withOpening: boolean,          (With OP / Without OP)
//         postStatus: 0 non posted | 1 posted | 2 all,
//         transType: 0 generated | 1 manual | 2 all,
//         print0Bal: boolean }
// -> everything the preview / printer / PDF needs
// ------------------------------------------------------------
export const getPrintData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileBase } = await prepareReport(req);
    return res.status(200).json({ success: true, report, fileBase });
  } catch (error) {
    return sendError(res, error, "getPrintData");
  }
};

// ------------------------------------------------------------
// POST /api/RptGL/excel  (same body as /print) -> the .xlsx file
// ------------------------------------------------------------
export const getExcel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildGLWorkbook(report);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileBase}.xlsx"`,
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    return res.status(200).send(buffer);
  } catch (error) {
    return sendError(res, error, "getExcel");
  }
};
