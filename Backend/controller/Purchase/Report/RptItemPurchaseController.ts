import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getBranches,
  getDefaultBranch,
  getItemPurchase,
  getItems,
  type ItemPurchaseParams,
} from "../../../services/Purchase/Report/rptItemPurchaseService.js";
import {
  buildItemPurchaseWorkbook,
  type ItemPurchaseReport,
} from "../../../services/Purchase/Report/rptItemPurchaseExcel.js";

// The Item Purchase report (Purchase > Report > Item Purchase). The logged-in company and user come from the
// SESSION (authenticate), never from the request.
//
// The body keys are the element ids of the page (the old rptItemPurchase form):
//   rdgBranch      0 One Branch, 1 All Branch
//   lkpBranch      the branch (One Branch)
//   rdgItem        0 One Item, 1 All Item
//   lkpItemID      the item (One Item)
//   dtpFromDate    yyyy-mm-dd
//   dtpToDate      yyyy-mm-dd

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
const reportInfo = (PstrUserID: string) => {
  const d = new Date();

  return `${PstrUserID}  ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const sendError = (res: Response, error: unknown, what: string) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      field: error.field,
    });
  }

  console.error(`rptItemPurchase ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

/* =========================================================
   GET /RptItemPurchase/lookups  -> what the screen needs to open
   branches            the branches the logged-in user has a right to
   lkpDefaultBranch    the user's default branch ("" when none is set)
   items               the items of every branch, one row per branch and item (Item ID and Item Name
                       boxes): the screen shows the items of the branch that is chosen
========================================================= */

export const getLookups = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { CoID: PstrCoID, userId: PstrUserID } = req.user;

    const [branches, defaultBranch, items] = await Promise.all([
      getBranches(PstrCoID, PstrUserID),
      getDefaultBranch(PstrCoID, PstrUserID),
      getItems(PstrCoID),
    ]);

    return res.status(200).json({
      success: true,
      branches: branches.map((b) => ({ lkpBranch: b.brId, txtBranchName: b.brName })),
      lkpDefaultBranch: defaultBranch,
      items: items.map((i) => ({
        lkpBranch: i.brId,
        lkpItemID: i.itemId,
        txtItemName: i.itemName,
      })),
    });
  } catch (error: unknown) {
    console.error("rptItemPurchase getLookups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the lookups",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   THE REPORT: the old ValidateMe, then the data. Print and Excel share it.
========================================================= */

type Prepared = { report: ItemPurchaseReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgItem = Number(body.rdgItem);

  if (![0, 1].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1].includes(rdgItem)) throw new ApiError(400, "Please select 'Item'", "rdgItem");

  const lkpBranch = String(body.lkpBranch ?? "").trim();
  const lkpItemID = String(body.lkpItemID ?? "").trim();
  const dtpFromDate = String(body.dtpFromDate ?? "").trim();
  const dtpToDate = String(body.dtpToDate ?? "").trim();

  // ---- the old ValidateMe, in its order ----
  if (rdgBranch === 0 && lkpBranch === "") {
    throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  }

  if (rdgItem === 0 && lkpItemID === "") {
    throw new ApiError(400, "Please select 'Item ID'", "lkpItemID");
  }

  if (dtpFromDate === "") throw new ApiError(400, "Please enter 'From Date'", "dtpFromDate");
  if (!isRealDate(dtpFromDate)) {
    throw new ApiError(400, "'From Date' is not a valid date", "dtpFromDate");
  }

  if (dtpToDate === "") throw new ApiError(400, "Please enter 'To Date'", "dtpToDate");
  if (!isRealDate(dtpToDate)) {
    throw new ApiError(400, "'To Date' is not a valid date", "dtpToDate");
  }

  // yyyy-mm-dd texts compare as dates
  if (dtpFromDate > dtpToDate) {
    throw new ApiError(400, "'To Date' should be greater than 'From Date'", "dtpToDate");
  }

  // a branch may only be one the user has a right to
  const allowed = await getBranches(PstrCoID, PstrUserID);

  if (rdgBranch === 0 && !allowed.some((b) => b.brId === lkpBranch)) {
    throw new ApiError(403, "This branch is not allowed", "lkpBranch");
  }

  // an item must be one of the company
  if (rdgItem === 0) {
    const items = await getItems(PstrCoID);

    if (!items.some((i) => i.itemId === lkpItemID)) {
      throw new ApiError(400, "Please select 'Item ID'", "lkpItemID");
    }
  }

  const params: ItemPurchaseParams = {
    PstrCoID,
    rdgBranch: rdgBranch as 0 | 1,
    lkpBranch,
    rdgItem: rdgItem as 0 | 1,
    lkpItemID,
    dtpFromDate,
    dtpToDate,
  };

  const items = await getItemPurchase(params);

  if (items.length === 0) throw new ApiError(404, "No records found");

  const nameOf = (id: string) => allowed.find((b) => b.brId === id)?.brName || id;

  return {
    report: {
      txtCoName: await getCompanyName(PstrCoID),
      txtHeading: `Item Purchase For The Period ${ddmmmyyyy(dtpFromDate)} To ${ddmmmyyyy(dtpToDate)}`,
      txtBranch: rdgBranch === 0 ? `Branch : ${nameOf(lkpBranch)}` : "",
      txtReportInfo: reportInfo(PstrUserID),
      items,
    },
    fileBase: `Item Purchase ${ddmmmyyyy(dtpFromDate)} To ${ddmmmyyyy(dtpToDate)}`,
  };
};

/* =========================================================
   POST /RptItemPurchase/print  -> everything the preview, the printer and the PDF need
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
   POST /RptItemPurchase/excel  -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildItemPurchaseWorkbook(report);

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
