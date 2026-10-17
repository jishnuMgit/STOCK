// controller/Purchase/Report/RptItemListController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  getUserBranches,
  getGroupsById,
  getGroupsByName,
  getItemsById,
  getItemsByName,
  getItemList,
} from "../../../services/Purchase/Report/RptItemListService.js";
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

const byName = <T extends { itemName: string }>(list: T[]) =>
  [...list].sort((a, b) => a.itemName.localeCompare(b.itemName));

// ------------------------------------------------------------
// GET /api/RptItemList/lookups
//   -> the user's branches, item groups (by id / by name), items (by id / by name)
// ------------------------------------------------------------
export const getLookups = async (req: AuthenticatedRequest, res: Response) => {
  const { coId, userId } = getSession(req);
  if (!coId) return noCompany(res);
  if (!userId) return noUser(res);

  try {
    const [b, gi, gn, ii, inm] = await Promise.allSettled([
      getUserBranches(coId, userId),
      getGroupsById(coId),
      getGroupsByName(coId),
      getItemsById(coId),
      getItemsByName(coId),
    ]);

    if (b.status === "rejected") console.error("branches error:", b.reason);
    if (gi.status === "rejected") console.error("groups by id error:", gi.reason);
    if (gn.status === "rejected") console.error("groups by name error:", gn.reason);
    if (ii.status === "rejected") console.error("items by id error:", ii.reason);
    if (inm.status === "rejected") console.error("items by name error:", inm.reason);

    if (b.status === "rejected" && ii.status === "rejected") {
      return res
        .status(500)
        .json({ success: false, message: "Failed to load the lookups" });
    }

    const groupsById = gi.status === "fulfilled" ? gi.value : [];
    const itemsById = ii.status === "fulfilled" ? ii.value : [];

    return res.status(200).json({
      success: true,
      branches: b.status === "fulfilled" ? b.value : [],
      groupsById,
      // if the by-name function fails, sort the by-id list instead
      groupsByName:
        gn.status === "fulfilled"
          ? gn.value
          : [...groupsById].sort((x, y) =>
              x.groupName.localeCompare(y.groupName),
            ),
      itemsById,
      itemsByName: inm.status === "fulfilled" ? inm.value : byName(itemsById),
    });
  } catch (error) {
    console.error("rptItemList getLookups error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load the lookups" });
  }
};

// ------------------------------------------------------------
// POST /api/RptItemList/print
// body: { allBranches: boolean, branchId?: string,
//         allGroups: boolean, groupId?: string,
//         itemMode: 0 | 1 | 2   (0 one item, 1 range, 2 all),
//         itemId?, fromItemId?, toItemId?,
//         status: 0 | 1 | 2     (0 active, 1 inactive, 2 hide),
//         salesBelowCost: boolean }
// -> everything the printed page needs
// ------------------------------------------------------------
export const getPrintData = async (req: AuthenticatedRequest, res: Response) => {
  const { coId, userId, coName: sessionCoName } = getSession(req);
  if (!coId) return noCompany(res);
  if (!userId) return noUser(res);

  try {
    // ---- VB ValidateMe ----------------------------------------
    const body = req.body ?? {};
    const allBranches = body.allBranches === true;
    const branchId = String(body.branchId ?? "").trim();
    const allGroups = body.allGroups !== false; // default: all groups
    const groupId = String(body.groupId ?? "").trim();
    const itemMode = Number(body.itemMode ?? 2);
    const itemId = String(body.itemId ?? "").trim();
    const fromItemId = String(body.fromItemId ?? "").trim();
    const toItemId = String(body.toItemId ?? "").trim();
    const status = Number(body.status ?? 0);
    const salesBelowCost = body.salesBelowCost === true;

    if (![0, 1, 2].includes(itemMode)) {
      throw new ApiError(400, "Invalid item selection");
    }
    if (![0, 1, 2].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }

    if (!allBranches && !branchId) {
      throw new ApiError(400, "Please select 'Branch'");
    }
    if (!allGroups && !groupId) {
      throw new ApiError(400, "Please select 'Item Group'");
    }
    if (itemMode === 0 && !itemId) {
      throw new ApiError(400, "Please select 'Item ID'");
    }
    if (itemMode === 1) {
      if (!fromItemId) throw new ApiError(400, "Please select 'Item ID From'");
      if (!toItemId) throw new ApiError(400, "Please select 'Item ID To'");
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
    const rows = await getItemList({
      coId,
      allBranches,
      branchId,
      allGroups,
      groupId,
      itemMode: itemMode as 0 | 1 | 2,
      itemId,
      fromItemId,
      toItemId,
      status: status as 0 | 1 | 2,
      salesBelowCost,
    });

    if (rows.length === 0) {
      throw new ApiError(404, "No records found");
    }

    const coName = sessionCoName || (await getCompanyName(coId));

    // VB: All Branch -> rptItemListAllBrRpt
    //     One Branch + Active -> rptItemListRpt (grouped by item group)
    //     One Branch + Inactive / Hide -> rptItemListStatusRpt
    const variant = allBranches ? "allBranch" : status === 0 ? "branch" : "status";

    const heading =
      status === 1
        ? "Inactive Item List"
        : status === 2
          ? "Hidden Item List"
          : "Item List";

    return res.status(200).json({
      success: true,
      report: {
        variant,
        coName,
        heading,
        branch: allBranches ? "" : `Branch : ${branchName}`,
        reportInfo: reportInfo(userId),
        userId,
        rows,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }
    console.error("rptItemList getPrintData error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to prepare the report" });
  }
};
