// controller/Finance/Report/FinalAccounts/RptTBController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../../middleware/authMiddleware.js";
import {
  getUserBranches,
  getTrialBalance,
  sumTotals,
} from "../../../../services/Finance/Report/FinalAccounts/RptTBService.js";
import {
  buildTrialBalanceWorkbook,
  type TBReport,
} from "../../../../services/Finance/Report/FinalAccounts/RptTBExcel.js";
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

const noCompany = (res: Response) =>
  res
    .status(401)
    .json({ success: false, message: "Company not found in session" });

const noUser = (res: Response) =>
  res
    .status(401)
    .json({ success: false, message: "User not found in session" });

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

// "DD/MM/YYYY" -> { d, mo, y, time } or null when it is not a real date
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
  return { d, mo, y, time: dt.getTime() };
};

// dd-MMM-yyyy (VB .ToString("dd-MMM-yyyy"))
const dmmy = (x: { d: number; mo: number; y: number }) =>
  `${pad(x.d)}-${MONTHS[x.mo - 1]}-${x.y}`;

// ------------------------------------------------------------
// VB ValidateMe + the data of the report. Used by Print and Excel.
// ------------------------------------------------------------
type Prepared = { report: TBReport & { userId: string }; fileName: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  const { coId, userId, coName: sessionCoName } = getSession(req);
  if (!coId) throw new ApiError(401, "Company not found in session");
  if (!userId) throw new ApiError(401, "User not found in session");

  const body = req.body ?? {};
  const allBranches = body.allBranches === true;
  const branchId = String(body.branchId ?? "").trim();
  const fromText = String(body.fromDate ?? "").trim();
  const toText = String(body.toDate ?? "").trim();
  const accountLevel = Number(body.accountLevel);
  const postStatus = Number(body.postStatus ?? 2);
  const transType = Number(body.transType ?? 2);
  const print0Bal = body.print0Bal === true;
  const printAcGroup = body.printAcGroup === true;

  if (!allBranches && !branchId) {
    throw new ApiError(400, "Please select a 'Branch'");
  }
  if (!fromText) throw new ApiError(400, "Please select 'From Date'");
  if (!toText) throw new ApiError(400, "Please select 'To Date'");

  const from = parseDMY(fromText);
  if (!from) throw new ApiError(400, "From Date must be DD/MM/YYYY");
  const to = parseDMY(toText);
  if (!to) throw new ApiError(400, "To Date must be DD/MM/YYYY");

  if (from.time > to.time) {
    throw new ApiError(400, "'To Date' should be greater than 'From Date'");
  }

  if (!Number.isInteger(accountLevel)) {
    throw new ApiError(400, "Please input an 'Account Level'");
  }
  if (accountLevel < 1 || accountLevel > 4) {
    throw new ApiError(400, "'Account Level' must be from 1 to 4");
  }
  if (![0, 1, 2].includes(postStatus)) {
    throw new ApiError(400, "Invalid 'Post Status'");
  }
  if (![0, 1, 2].includes(transType)) {
    throw new ApiError(400, "Invalid entry type");
  }

  // a branch may only be one the user has
  let branchName = "";
  if (!allBranches) {
    const branches = await getUserBranches(coId, userId);
    const branch = branches.find((b) => b.brId === branchId);
    if (!branch) throw new ApiError(403, "This branch is not allowed");
    branchName = branch.brName;
  }

  const rows = await getTrialBalance({
    coId,
    allBranches,
    branchId,
    fromDate: fromText,
    toDate: toText,
    accountLevel,
    postStatus: postStatus as 0 | 1 | 2,
    print0Bal,
    transType: transType as 0 | 1 | 2,
    printAcGroup,
  });

  if (rows.length === 0) throw new ApiError(404, "No records found");

  const coName = sessionCoName || (await getCompanyName(coId));

  return {
    report: {
      coName,
      heading: `Trial Balance For The Period ${dmmy(from)} To ${dmmy(to)}`,
      branch: allBranches ? "" : `Branch : ${branchName}`,
      reportInfo: reportInfo(userId),
      userId,
      accountLevel,
      rows,
      totals: sumTotals(rows, accountLevel),
    },
    fileName: `TrialBalance_${from.y}${pad(from.mo)}${pad(from.d)}_${to.y}${pad(to.mo)}${pad(to.d)}.xlsx`,
  };
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res
      .status(error.status)
      .json({ success: false, message: error.message });
  }
  console.error(`rptTB ${what} error:`, error);
  return res
    .status(500)
    .json({ success: false, message: "Failed to prepare the report" });
};

// ------------------------------------------------------------
// GET /api/RptTB/lookups  -> the user's branches
// ------------------------------------------------------------
export const getLookups = async (req: AuthenticatedRequest, res: Response) => {
  const { coId, userId } = getSession(req);
  if (!coId) return noCompany(res);
  if (!userId) return noUser(res);

  try {
    const branches = await getUserBranches(coId, userId);
    return res.status(200).json({ success: true, branches });
  } catch (error) {
    console.error("rptTB getLookups error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load the branches" });
  }
};

// ------------------------------------------------------------
// POST /api/RptTB/print
// body: { allBranches: boolean, branchId?: string,
//         fromDate: "DD/MM/YYYY", toDate: "DD/MM/YYYY",
//         accountLevel: 1-4,
//         postStatus: 0 unposted | 1 posted | 2 all,
//         print0Bal: boolean,
//         transType: 0 manual | 1 generated | 2 all,
//         printAcGroup: boolean }
// -> everything the printed page needs
// ------------------------------------------------------------
export const getPrintData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report } = await prepareReport(req);
    return res.status(200).json({ success: true, report });
  } catch (error) {
    return sendError(res, error, "getPrintData");
  }
};

// ------------------------------------------------------------
// POST /api/RptTB/excel  (same body as /print) -> the .xlsx file
// ------------------------------------------------------------
export const getExcel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileName } = await prepareReport(req);
    const buffer = await buildTrialBalanceWorkbook(report);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    return res.status(200).send(buffer);
  } catch (error) {
    return sendError(res, error, "getExcel");
  }
};
