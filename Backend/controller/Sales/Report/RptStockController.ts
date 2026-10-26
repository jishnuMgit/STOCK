// controller/Sales/Report/RptStockController.ts
// The Stock report (Sales > Report > Stock). The logged-in company and user come from the
// SESSION (authenticate), never from the request.
//
// The body keys follow the page's element ids (the old rptStock form):
//   rdgBranch      0 One Branch, 1 All Branch
//   lkpBranch      the branch (One Branch)
//   rdgItem        0 One Item, 1 One Item Group, 2 All Item, 3 Item Range
//   lkpItemID      the item (One Item)
//   lkpItemGroupID the item group (One Item Group)
//   lkpItemIDFrom / lkpItemIDTo   the first and the last item (Item Range)
//   lkpPostStatus  0 Non Posted, 1 Posted, 2 All
//   rdgDetOrSum    0 Detailed, 1 Summary
//   dtpFromDate / dtpToDate   yyyy-mm-dd
//   chkTxnNo       Order by Txn. No. (Detailed only)
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
  const rdgItem = Number(body.rdgItem);
  const rdgDetOrSum = Number(body.rdgDetOrSum);
  const lkpPostStatus = Number(body.lkpPostStatus);

  if (![0, 1].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1, 2, 3].includes(rdgItem)) throw new ApiError(400, "Please select 'Item'", "rdgItem");
  if (![0, 1].includes(rdgDetOrSum)) {
    throw new ApiError(400, "Please select 'Detailed' or 'Summary'", "rdgDetOrSum");
  }
  if (![0, 1, 2].includes(lkpPostStatus)) {
    throw new ApiError(400, "Please select 'Post Status'", "lkpPostStatus");
  }

  const oneBranch = rdgBranch === 0;
  const branchId = String(body.lkpBranch ?? "").trim();
  const itemId = String(body.lkpItemID ?? "").trim();
  const itemGroupId = String(body.lkpItemGroupID ?? "").trim();
  const itemIdFrom = String(body.lkpItemIDFrom ?? "").trim();
  const itemIdTo = String(body.lkpItemIDTo ?? "").trim();
  const fromDate = String(body.dtpFromDate ?? "").trim();
  const toDate = String(body.dtpToDate ?? "").trim();

  // ---- the old ValidateMe, in its order ----
  if (oneBranch && branchId === "") {
    throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  }

  if (rdgItem === 0 && itemId === "") {
    throw new ApiError(400, "Please select 'Item ID'", "lkpItemID");
  }

  if (rdgItem === 1 && itemGroupId === "") {
    throw new ApiError(400, "Please select 'Item Group'", "lkpItemGroupID");
  }

  if (rdgItem === 3 && itemIdFrom === "") {
    throw new ApiError(400, "Please select 'From Item ID'", "lkpItemIDFrom");
  }

  if (rdgItem === 3 && itemIdTo === "") {
    throw new ApiError(400, "Please select 'To Item ID'", "lkpItemIDTo");
  }

  if (rdgItem === 3 && (await isItemRangeReversed(CoID, itemIdFrom, itemIdTo))) {
    throw new ApiError(400, "'To Item ID' should be greater than 'From Item ID'", "lkpItemIDTo");
  }

  if (fromDate === "") throw new ApiError(400, "Please enter 'From Date'", "dtpFromDate");
  if (toDate === "") throw new ApiError(400, "Please enter 'To Date'", "dtpToDate");

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

  const detailed = rdgDetOrSum === 0;

  const params: StockParams = {
    detOrSum: detailed ? "D" : "S",
    postStatus: lkpPostStatus as 0 | 1 | 2,
    coId: CoID,
    oneBranch,
    branchId: oneBranch ? branchId : "",
    itemMode: rdgItem as 0 | 1 | 2 | 3,
    itemId: rdgItem === 0 ? itemId : "",
    itemGroupId: rdgItem === 1 ? itemGroupId : "",
    itemIdFrom: rdgItem === 3 ? itemIdFrom : "",
    itemIdTo: rdgItem === 3 ? itemIdTo : "",
    fromDate,
    toDate,
    txnOrder: detailed && body.chkTxnNo === true,
  };

  const detail = detailed ? await getDetailed(params) : [];
  const summary = detailed
    ? {
        lines: [],
        totals: { txtQtyOpening: 0, txtQtyIn: 0, txtQtyOut: 0, txtQtyClosing: 0 },
      }
    : await getSummary(params);

  if (detailed ? detail.length === 0 : summary.lines.length === 0) {
    throw new ApiError(404, "No records found");
  }

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
