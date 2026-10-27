// controller/Sales/Report/RptStockController.ts
// The Stock report (Sales > Report > Stock). The logged-in company and user come from the
// SESSION (authenticate), never from the request.
//
// The body keys are the arguments of the old SP_rptStock (the page sends them as they are):
//   strDetOrSum    D Detailed, S Summary
//   lkpPostStatus  0 All, 1 Posted, 2 Non Posted
//   rdgBranch      0 One Branch, 1 All Branches
//   strBrID        the branch (One Branch)
//   rdgByItem      0 By Item Group, 1 By Item
//   strItemGroupID the item group (By Item Group; empty = every item)
//   rdgItem        0 One Item, 1 Item Range, 2 All Item (By Item only)
//   strItemID      the item (One Item)
//   strFromItemID / strToItemID   the first and the last item (Item Range)
//   strFromDate / strToDate       dd/mm/yyyy
//   blnOrderBy     Order by Txn. No. (Detailed only)
// The company and the user come from the session, never from the body.
import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getBranches,
  getDefaultBranch,
  getItems,
  getItemGroups,
  getBranchName,
  isItemRangeReversed,
  getDetailed,
  getSummary,
  type DetailBranch,
  type SummaryBranch,
  type SummaryTotals,
  type StockParams,
} from "../../../services/Sales/Report/rptStockService.js";
import {
  buildStockWorkbook,
  type StockReport,
} from "../../../services/Sales/Report/rptStockExcel.js";

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

// dd/mm/yyyy text -> yyyy-mm-dd ("" when it is not in that shape)
const toIsoDate = (value: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

// the old objCommon.ReportInfo: "<user>  dd/mm/yyyy hh:mm"
const reportInfo = (userId: string) => {
  const d = new Date();

  return `${userId}  ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      field: error.field,
    });
  }

  console.error(`rptStock ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

/* =========================================================
   GET LOOKUPS (the old FillCombos): the user's branches and the default one, the items
   and the item groups
========================================================= */

export const getLookups = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { CoID, userId } = req.user;

    const [branches, defaultBranch, items, groups] = await Promise.all([
      getBranches(CoID, userId),
      getDefaultBranch(CoID, userId),
      getItems(CoID),
      getItemGroups(CoID),
    ]);

    return res.status(200).json({
      success: true,
      branches: branches.map((b) => ({ lkpBranch: b.brId, txtBranchName: b.brName })),
      lkpDefaultBranch: defaultBranch,
      items: items.map((i) => ({
        lkpItemID: i.itemId,
        txtItemName: i.itemName,
        lkpItemGroupID: i.itemGroupId,
      })),
      groups: groups.map((g) => ({
        lkpItemGroupID: g.groupId,
        txtItemGroupName: g.groupName,
      })),
    });
  } catch (error: unknown) {
    return sendError(res, error, "getLookups");
  }
};

/* =========================================================
   THE REPORT: the old ValidateMe, then the data. Print and Excel share it.
========================================================= */

type Prepared = { report: StockReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID, userId } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgByItem = Number(body.rdgByItem);
  const rdgItem = Number(body.rdgItem);
  const lkpPostStatus = Number(body.lkpPostStatus);
  const strDetOrSum = String(body.strDetOrSum ?? "");

  if (![0, 1].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1].includes(rdgByItem)) throw new ApiError(400, "Please select 'Item'", "rdgByItem");
  if (rdgByItem === 1 && ![0, 1, 2].includes(rdgItem)) {
    throw new ApiError(400, "Please select 'Item'", "rdgItem");
  }
  if (!["D", "S"].includes(strDetOrSum)) {
    throw new ApiError(400, "Please select 'Detailed' or 'Summary'", "rdgDetSum");
  }
  if (![0, 1, 2].includes(lkpPostStatus)) {
    throw new ApiError(400, "Please select 'Post Status'", "lkpPostStatus");
  }

  const oneBranch = rdgBranch === 0;
  const byGroup = rdgByItem === 0;
  const branchId = String(body.strBrID ?? "").trim();
  const itemId = String(body.strItemID ?? "").trim();
  const itemGroupId = String(body.strItemGroupID ?? "").trim();
  const itemIdFrom = String(body.strFromItemID ?? "").trim();
  const itemIdTo = String(body.strToItemID ?? "").trim();
  const fromDate = toIsoDate(String(body.strFromDate ?? "").trim());
  const toDate = toIsoDate(String(body.strToDate ?? "").trim());

  // the report service takes: 0 one item, 1 one item group, 2 all items, 3 item range
  const itemMode: 0 | 1 | 2 | 3 = byGroup
    ? itemGroupId === ""
      ? 2
      : 1
    : rdgItem === 0
      ? 0
      : rdgItem === 1
        ? 3
        : 2;

  // ---- the old ValidateMe, in its order ----
  if (oneBranch && branchId === "") {
    throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  }

  if (itemMode === 0 && itemId === "") {
    throw new ApiError(400, "Please select 'Item ID'", "lkpOneItemID");
  }

  if (itemMode === 3 && itemIdFrom === "") {
    throw new ApiError(400, "Please select 'From Item ID'", "lkpFromItem");
  }

  if (itemMode === 3 && itemIdTo === "") {
    throw new ApiError(400, "Please select 'To Item ID'", "lkpToItem");
  }

  if (itemMode === 3 && (await isItemRangeReversed(CoID, itemIdFrom, itemIdTo))) {
    throw new ApiError(400, "'To Item ID' should be greater than 'From Item ID'", "lkpToItem");
  }

  if (String(body.strFromDate ?? "").trim() === "") {
    throw new ApiError(400, "Please enter 'From Date'", "dtpFromDate");
  }
  if (String(body.strToDate ?? "").trim() === "") {
    throw new ApiError(400, "Please enter 'To Date'", "dtpToDate");
  }

  if (!isRealDate(fromDate)) throw new ApiError(400, "'From Date' is not a valid date", "dtpFromDate");
  if (!isRealDate(toDate)) throw new ApiError(400, "'To Date' is not a valid date", "dtpToDate");

  // yyyy-mm-dd text compares in date order. The old form allowed the same day.
  if (fromDate > toDate) {
    throw new ApiError(400, "'To Date' should be greater than 'From Date'", "dtpToDate");
  }

  // a branch may only be one the user has a right to
  let branchName = "";

  if (oneBranch) {
    const branches = await getBranches(CoID, userId);
    const branch = branches.find((b) => b.brId === branchId);

    if (!branch) throw new ApiError(403, "This branch is not allowed", "lkpBranch");

    branchName = branch.brName || (await getBranchName(CoID, branchId));
  }

  const detailed = strDetOrSum === "D";

  const params: StockParams = {
    detOrSum: detailed ? "D" : "S",
    postStatus: lkpPostStatus as 0 | 1 | 2, // 0 all, 1 posted, 2 non posted
    coId: CoID,
    oneBranch,
    branchId: oneBranch ? branchId : "",
    itemMode,
    itemId: itemMode === 0 ? itemId : "",
    itemGroupId: itemMode === 1 ? itemGroupId : "",
    itemIdFrom: itemMode === 3 ? itemIdFrom : "",
    itemIdTo: itemMode === 3 ? itemIdTo : "",
    fromDate,
    toDate,
    txnOrder: detailed && body.blnOrderBy === true,
  };

  const detail: DetailBranch[] = detailed ? await getDetailed(params) : [];
  const summary: { branches: SummaryBranch[]; totals: SummaryTotals } = detailed
    ? {
        branches: [],
        totals: { txtQtyOpening: 0, txtQtyIn: 0, txtQtyOut: 0, txtQtyClosing: 0 },
      }
    : await getSummary(params);

  if (detailed ? detail.length === 0 : summary.branches.length === 0) {
    throw new ApiError(404, "No records found");
  }

  // one section per branch, in the order of the Branch screen (Jeddah, then Meccah ...), each with
  // the name of its branch
  const allowed = await getBranches(CoID, userId);

  const position = (id: string) => {
    const index = allowed.findIndex((b) => b.brId === id);
    return index < 0 ? allowed.length : index;
  };

  const byPosition = (a: { lkpBranch: string }, b: { lkpBranch: string }) =>
    position(a.lkpBranch) - position(b.lkpBranch) || a.lkpBranch.localeCompare(b.lkpBranch);

  const nameOf = (id: string) => allowed.find((b) => b.brId === id)?.brName || id;

  for (const branch of [...detail, ...summary.branches]) {
    branch.txtBranchName = nameOf(branch.lkpBranch);
  }

  detail.sort(byPosition);
  summary.branches.sort(byPosition);

  const stamp = (() => {
    const d = new Date();

    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  })();

  return {
    report: {
      txtMode: detailed ? "D" : "S",
      txtCoName: await getCompanyName(CoID),
      txtHeading: `Stock ${detailed ? "Detail" : "Summary"} For The Period ${ddmmmyyyy(fromDate)} To ${ddmmmyyyy(toDate)}`,
      txtBranch: oneBranch ? `Branch : ${branchName}` : "",
      txtReportInfo: reportInfo(userId),
      detail,
      summary,
    },
    fileBase: `Stock${detailed ? "Detail" : "Summary"}_${stamp}`,
  };
};

/* =========================================================
   POST /RptStock/print  -> everything the preview, the printer and the PDF need
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
   POST /RptStock/excel  (the same body) -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildStockWorkbook(report);

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
