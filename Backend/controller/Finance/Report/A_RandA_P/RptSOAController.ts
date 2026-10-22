// controller/Finance/Report/RptSOAController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../../middleware/authMiddleware.js";
import {
  getAccounts,
  getBranches,
  getDivisions,
  getReportData,
  SoaValidationError,
  type SoaRequest,
} from "../../../../services/Finance/Report/A_RandA_P/RptSOAService.js";
import {
  buildSoaWorkbook,
  type SoaReport,
} from "../../../../services/Finance/Report/A_RandA_P/RptSOAExcel.js";
// the company name lookup is shared with the other reports
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
// Remove the `src.*` parts once the router has the auth middleware and the
// page sends the login.
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

const fail = (res: Response, error: unknown, what: string, message: string) => {
  if (error instanceof ApiError) {
    return res
      .status(error.status)
      .json({ success: false, message: error.message });
  }
  if (error instanceof SoaValidationError) {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error(`rptSOA ${what} error:`, error);
  return res.status(500).json({ success: false, message });
};

// ------------------------------------------------------------
// LOOKUPS
// GET /api/RptSOA/branches
// GET /api/RptSOA/accounts
// GET /api/RptSOA/divisions/:accountId
// ------------------------------------------------------------
export const getBranchList = async (req: AuthenticatedRequest, res: Response) => {
  const { coId, userId } = getSession(req);
  if (!coId) return noCompany(res);
  try {
    const branches = await getBranches(coId, userId);
    return res.status(200).json({ success: true, branches });
  } catch (error) {
    return fail(res, error, "getBranchList", "Failed to load branches");
  }
};

export const getAccountList = async (req: AuthenticatedRequest, res: Response) => {
  const { coId } = getSession(req);
  if (!coId) return noCompany(res);
  try {
    const { ids, names } = await getAccounts(coId);
    return res.status(200).json({ success: true, ids, names });
  } catch (error) {
    return fail(res, error, "getAccountList", "Failed to load accounts");
  }
};

export const getDivisionList = async (req: AuthenticatedRequest, res: Response) => {
  const { coId } = getSession(req);
  if (!coId) return noCompany(res);
  try {
    const { ids, names } = await getDivisions(coId, String(req.params.accountId ?? ""));
    return res.status(200).json({ success: true, ids, names });
  } catch (error) {
    return fail(res, error, "getDivisionList", "Failed to load divisions");
  }
};

// ------------------------------------------------------------
// The data of the report. Used by Print (preview / printer / PDF) and Excel.
// ------------------------------------------------------------
type Prepared = { report: SoaReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  const { coId, userId, coName: sessionCoName } = getSession(req);
  if (!coId) throw new ApiError(401, "Company not found in session");

  const data = await getReportData(coId, userId, req.body as SoaRequest);

  if (data.accounts.length === 0) {
    throw new ApiError(400, "No data found for the selected criteria");
  }

  // the session may not carry the name, so the database is the fallback
  const coName = sessionCoName || (await getCompanyName(coId));

  // date + time, so a new download never has the name of a file that is
  // still open (Acrobat / Excel lock the file)
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  return {
    report: { ...data, coName, reportInfo: reportInfo(userId), userId },
    fileBase: `StatementOfAccount_${stamp}`,
  };
};

// ------------------------------------------------------------
// POST /api/RptSOA/print   body: the page criteria (see SoaRequest)
// -> everything the preview / printer / PDF needs
// ------------------------------------------------------------
export const getPrintData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileBase } = await prepareReport(req);
    return res.status(200).json({ success: true, report, fileBase });
  } catch (error) {
    return fail(res, error, "getPrintData", "Failed to prepare the report");
  }
};

// ------------------------------------------------------------
// POST /api/RptSOA/excel  (same body as /print) -> the .xlsx file
// ------------------------------------------------------------
export const getExcel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildSoaWorkbook(report);

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
    return fail(res, error, "getExcel", "Failed to prepare the report");
  }
};
