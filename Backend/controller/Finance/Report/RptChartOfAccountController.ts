// controller/Finance/Report/RptChartOfAccountController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  getAccountTree,
  getReportRows,
  getCompanyName,
} from "../../../services/Finance/Report/RptChartOfAccountService.js";

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
// POST /api/RptChartOfAccount/print   body: { accountIds: string[] }
// -> everything the printed page needs
// ------------------------------------------------------------
export const getPrintData = async (req: AuthenticatedRequest, res: Response) => {
  const { coId, userId, coName: sessionCoName } = getSession(req);
  if (!coId) return noCompany(res);

  try {
    // the session may not carry the name, so the database is the fallback
    const coName = sessionCoName || (await getCompanyName(coId));

    const rows = await getReportRows(coId, req.body?.accountIds);

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Select at least one account" });
    }

    return res.status(200).json({
      success: true,
      report: {
        coName,
        heading: "Chart Of Accounts",
        reportInfo: reportInfo(userId),
        rows,
      },
    });
  } catch (error) {
    console.error("rptChartOfAccount getPrintData error:", error);
    const message =
      error instanceof Error &&
      (error.message === "accountIds must be a list" ||
        error.message === "Too many accounts selected")
        ? error.message
        : "Failed to prepare the report";
    return res
      .status(message === "Failed to prepare the report" ? 500 : 400)
      .json({ success: false, message });
  }
};