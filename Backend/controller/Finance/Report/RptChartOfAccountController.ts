// controller/Finance/Report/RptChartOfAccountController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  getAccountTree,
  getReportRows,
  getCompanyName,
} from "../../../services/Finance/Report/RptChartOfAccountService.js";
import {
  buildChartOfAccountWorkbook,
  type ChartOfAccountReport,
} from "../../../services/Finance/Report/RptChartOfAccountExcel.js";

type Session = { coId: string; userId: string; coName: string };

const pick = (...values: unknown[]): string => {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s !== "") return s;
  }
  return "";
};

// Company and user come from the logged-in user (auth middleware).
// The token key spelling differs between projects, so the usual ones are tried.
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

// ------------------------------------------------------------
// GET /api/RptChartOfAccount  -> every account of the company (the tree)
// ------------------------------------------------------------
export const getTree = async (req: AuthenticatedRequest, res: Response) => {
  const { coId } = getSession(req);
  if (!coId) return noCompany(res);

  try {
    const accounts = await getAccountTree(coId);
    return res.status(200).json({ success: true, accounts });
  } catch (error) {
    console.error("rptChartOfAccount getTree error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load chart of accounts" });
  }
};

// ------------------------------------------------------------
// The data of the report. Used by Print (preview / printer / PDF) and Excel.
// ------------------------------------------------------------
type Prepared = { report: ChartOfAccountReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  const { coId, userId, coName: sessionCoName } = getSession(req);
  if (!coId) throw new ApiError(401, "Company not found in session");

  // the session may not carry the name, so the database is the fallback
  const coName = sessionCoName || (await getCompanyName(coId));

  let rows;
  try {
    rows = await getReportRows(coId, req.body?.accountIds);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "accountIds must be a list" ||
        error.message === "Too many accounts selected")
    ) {
      throw new ApiError(400, error.message);
    }
    throw error;
  }

  if (rows.length === 0) {
    throw new ApiError(400, "Select at least one account");
  }

  // date + time, so a new download never has the name of a file that is
  // still open (Acrobat / Excel lock the file)
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  return {
    report: {
      coName,
      heading: "Chart Of Accounts",
      reportInfo: reportInfo(userId),
      rows,
    },
    fileBase: `ChartOfAccounts_${stamp}`,
  };
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res
      .status(error.status)
      .json({ success: false, message: error.message });
  }
  console.error(`rptChartOfAccount ${what} error:`, error);
  return res
    .status(500)
    .json({ success: false, message: "Failed to prepare the report" });
};

// ------------------------------------------------------------
// POST /api/RptChartOfAccount/print   body: { accountIds: string[] }
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
// POST /api/RptChartOfAccount/excel  (same body as /print) -> the .xlsx file
// ------------------------------------------------------------
export const getExcel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildChartOfAccountWorkbook(report);

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
