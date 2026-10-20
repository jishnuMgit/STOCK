// controller/Sales/Report/RptSalesPriceListController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  getUserBranches,
  getItemGroups,
  getItems,
  getPriceList,
} from "../../../services/Purchase/Report/RptSalesPriceListService.js";
import {
  buildPriceListWorkbook,
  type PriceListReport,
} from "../../../services/Purchase/Report/RptSalesPriceListExcel.js";
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

// ------------------------------------------------------------
// VB ValidateMe + the data of the report. Used by Print and Excel.
// ------------------------------------------------------------
type Prepared = { report: PriceListReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  const { coId, userId, coName: sessionCoName } = getSession(req);
  if (!coId) throw new ApiError(401, "Company not found in session");
  if (!userId) throw new ApiError(401, "User not found in session");

  const body = req.body ?? {};
  const branchId = String(body.branchId ?? "").trim();
  if (!branchId) throw new ApiError(400, "Please select 'Branch'");

  // Item Group: One Item Group / All Item Group
  const groupOne = body.groupMode === "One";
  const groupId = String(body.groupId ?? "").trim();
  if (groupOne && !groupId) throw new ApiError(400, "Please select 'Item Group'");

  // Item: One Item / Range Item / All Item
  const itemMode =
    body.itemMode === "One" || body.itemMode === "Range" ? body.itemMode : "All";
  let itemFrom = "";
  let itemTo = "";
  if (itemMode === "One") {
    itemFrom = String(body.itemId ?? "").trim();
    itemTo = itemFrom;
    if (!itemFrom) throw new ApiError(400, "Please select 'Item'");
  } else if (itemMode === "Range") {
    itemFrom = String(body.itemFrom ?? "").trim();
    itemTo = String(body.itemTo ?? "").trim();
    if (!itemFrom) throw new ApiError(400, "Please select 'From Item'");
    if (!itemTo) throw new ApiError(400, "Please select 'To Item'");
    if (itemFrom > itemTo) {
      throw new ApiError(400, "'To Item' should be greater than 'From Item'");
    }
  }

  // a branch may only be one the user has
  const branches = await getUserBranches(coId, userId);
  const branch = branches.find((b) => b.brId === branchId);
  if (!branch) throw new ApiError(403, "This branch is not allowed");

  const groups = await getPriceList({
    coId,
    branchId,
    groupId: groupOne ? groupId : null,
    itemFrom: itemMode === "All" ? null : itemFrom,
    itemTo: itemMode === "All" ? null : itemTo,
  });
  if (groups.length === 0) throw new ApiError(404, "No records found");

  const coName = sessionCoName || (await getCompanyName(coId));

  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  return {
    report: {
      coName,
      heading: "Price List",
      branch: `Branch : ${branch.brName}`,
      reportInfo: reportInfo(userId),
      groups,
    },
    fileBase: `PriceList_${branchId.replace(/[^A-Za-z0-9_-]/g, "_")}_${stamp}`,
  };
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res
      .status(error.status)
      .json({ success: false, message: error.message });
  }
  console.error(`rptSalesPriceList ${what} error:`, error);
  return res
    .status(500)
    .json({ success: false, message: "Failed to prepare the report" });
};

// ------------------------------------------------------------
// GET /api/RptSalesPriceList/lookups  -> the user's branches, item groups, items
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
    const [branches, itemGroups, items] = await Promise.all([
      getUserBranches(coId, userId),
      getItemGroups(),
      getItems(coId),
    ]);
    return res.status(200).json({ success: true, branches, itemGroups, items });
  } catch (error) {
    console.error("rptSalesPriceList getLookups error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load the lookups" });
  }
};

// ------------------------------------------------------------
// POST /api/RptSalesPriceList/print
// body: { branchId: string,
//         groupMode: "One" | "All", groupId?: string,
//         itemMode: "One" | "Range" | "All",
//         itemId?: string, itemFrom?: string, itemTo?: string }
// -> everything the preview / PDF needs
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
// POST /api/RptSalesPriceList/excel  (same body) -> the .xlsx file
// ------------------------------------------------------------
export const getExcel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildPriceListWorkbook(report);

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
