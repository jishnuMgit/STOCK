// controller/Stock/Report/RptItemHistoryController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  getUserBranches,
  getItemLookup,
  getItemHistory,
} from "../../../services/Purchase/Report/RptItemHistoryService.js";
import {
  buildItemHistoryWorkbook,
  type ItemHistoryReport,
} from "../../../services/Purchase/Report/RptItemHistoryExcel.js";
import { getCompanyName } from "../../../utils/companyName.js";

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

// ------------------------------------------------------------
// GET /api/RptItemHistory/lookups  -> the user's branches + the items
// ------------------------------------------------------------
export const getLookups = async (req: AuthenticatedRequest, res: Response) => {
  const { coId, userId } = getSession(req);
  if (!coId) return noCompany(res);
  if (!userId) return noUser(res);

  try {
    const [b, i] = await Promise.allSettled([
      getUserBranches(coId, userId),
      getItemLookup(coId),
    ]);

    if (b.status === "rejected") console.error("branches error:", b.reason);
    if (i.status === "rejected") console.error("items error:", i.reason);

    if (b.status === "rejected" && i.status === "rejected") {
      return res
        .status(500)
        .json({ success: false, message: "Failed to load branches and items" });
    }

    return res.status(200).json({
      success: true,
      branches: b.status === "fulfilled" ? b.value : [],
      items: i.status === "fulfilled" ? i.value : [],
    });
  } catch (error) {
    console.error("rptItemHistory getLookups error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load branches and items" });
  }
};

// ------------------------------------------------------------
// VB ValidateMe + the data of the report. Used by Print and Excel.
// ------------------------------------------------------------
type Prepared = {
  report: ItemHistoryReport & { userId: string };
  fileBase: string;
};

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  const { coId, userId, coName: sessionCoName } = getSession(req);
  if (!coId) throw new ApiError(401, "Company not found in session");
  if (!userId) throw new ApiError(401, "User not found in session");

  const body = req.body ?? {};
  const allBranches = body.allBranches === true;
  const branchId = String(body.branchId ?? "").trim();
  const itemId = String(body.itemId ?? "").trim();
  const asOnDate = String(body.asOnDate ?? "").trim();

  if (!allBranches && !branchId) {
    throw new ApiError(400, "Please select 'Branch'");
  }
  if (!itemId) throw new ApiError(400, "Please select an Item");
  if (!asOnDate) throw new ApiError(400, "Please select Date");

  const date = parseDMY(asOnDate);
  if (!date) throw new ApiError(400, "Date must be DD/MM/YYYY");

  // a branch may only be one the user has
  let branchName = "";
  if (!allBranches) {
    const branches = await getUserBranches(coId, userId);
    const branch = branches.find((b) => b.brId === branchId);
    if (!branch) throw new ApiError(403, "This branch is not allowed");
    branchName = branch.brName;
  }

  // ---- the report -------------------------------------------
  const groups = await getItemHistory({
    coId,
    allBranches,
    branchId,
    itemId,
    asOnDate,
  });

  if (groups.length === 0) {
    throw new ApiError(404, "No records found for this item");
  }

  const coName = sessionCoName || (await getCompanyName(coId));

  // date + time, so a new download never has the name of a file that is
  // still open (Acrobat / Excel lock the file)
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const safe = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, "_");

  return {
    report: {
      coName,
      heading: `Item History As On Date : ${pad(date.d)}-${MONTHS[date.mo - 1]}-${date.y}`,
      branch: allBranches ? "" : `Branch : ${branchName}`,
      reportInfo: reportInfo(userId),
      userId,
      groups,
    },
    fileBase: `ItemHistory_${safe(itemId)}_${allBranches ? "AllBranches" : safe(branchId)}_${stamp}`,
  };
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res
      .status(error.status)
      .json({ success: false, message: error.message });
  }
  console.error(`rptItemHistory ${what} error:`, error);
  return res
    .status(500)
    .json({ success: false, message: "Failed to prepare the report" });
};

// ------------------------------------------------------------
// POST /api/RptItemHistory/print
// body: { allBranches: boolean, branchId?: string, itemId: string,
//         asOnDate: "DD/MM/YYYY" }
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
// POST /api/RptItemHistory/excel  (same body as /print) -> the .xlsx file
// ------------------------------------------------------------
export const getExcel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildItemHistoryWorkbook(report);

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
