// controller/Finance/Report/RptCustomerListController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  getCustomerTree,
  getReportRows,
} from "../../../services/Finance/Report/RptCustomerListService.js";
import {
  buildCustomerListWorkbook,
  type CustomerListReport,
} from "../../../services/Finance/Report/RptCustomerListExcel.js";
// the company name lookup is shared with the other reports
import { getCompanyName } from "../../../services/Finance/Report/RptChartOfAccountService.js";

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

// ------------------------------------------------------------
// GET /api/RptCustomerList  -> the customer group tree
// ------------------------------------------------------------
export const getTree = async (req: AuthenticatedRequest, res: Response) => {
  const { coId } = getSession(req);
  if (!coId) return noCompany(res);

  try {
    const accounts = await getCustomerTree(coId);
    return res.status(200).json({ success: true, accounts });
  } catch (error) {
    console.error("rptCustomerList getTree error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load customers" });
  }
};

// ------------------------------------------------------------
// The data of the report. Used by Print (preview / printer / PDF) and Excel.
// ------------------------------------------------------------
type Prepared = { report: CustomerListReport; fileBase: string };

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
    throw new ApiError(400, "Select at least one customer");
  }

  // date + time, so a new download never has the name of a file that is
  // still open (Acrobat / Excel lock the file)
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  return {
    report: {
      coName,
      heading: "Customer List",
      reportInfo: reportInfo(userId),
      rows,
    },
    fileBase: `CustomerList_${stamp}`,
  };
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res
      .status(error.status)
      .json({ success: false, message: error.message });
  }
  console.error(`rptCustomerList ${what} error:`, error);
  return res
    .status(500)
    .json({ success: false, message: "Failed to prepare the report" });
};

// ------------------------------------------------------------
// POST /api/RptCustomerList/print   body: { accountIds: string[] }
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
// POST /api/RptCustomerList/excel  (same body as /print) -> the .xlsx file
// ------------------------------------------------------------
export const getExcel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildCustomerListWorkbook(report);

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
