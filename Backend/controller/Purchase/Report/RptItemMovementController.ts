import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getBranches,
  getDefaultBranch,
  getItemMovement,
  getItems,
  type ItemMovementParams,
} from "../../../services/Purchase/Report/rptItemMovementService.js";
import {
  buildItemMovementWorkbook,
  type ItemMovementReport,
} from "../../../services/Purchase/Report/rptItemMovementExcel.js";

// The Item Movement report (Purchase > Report > Item Movement): Fast Moving, Slow Moving and Non Moving items. The
// logged-in company and user come from the SESSION (authenticate), never from the request.
//
// The body keys are the element ids of the page (the old rptItemMovement form):
//   rdgBranch         0 One Branch, 1 All Branch
//   lkpBranch         the branch (One Branch)
//   rdgItem           0 One Item, 1 Range Item, 2 All Item
//   lkpItemID         the item (One Item)
//   lkpFromItem       the first item (Range Item)
//   lkpToItem         the last item (Range Item)
//   lkpPostStatus     0 All, 1 Posted, 2 Non Posted (the same as the other reports)
//   dtpFromDate       yyyy-mm-dd
//   dtpToDate         yyyy-mm-dd
//   rdgItemMovement   0 Fast Moving, 1 Slow Moving, 2 Non Moving
//   rdgOrderBy        0 Order by Qty., 1 Order by Value (Fast / Slow Moving only)

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

  console.error(`rptItemMovement ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

/* =========================================================
   GET /RptItemMovement/lookups  -> what the screen needs to open
   branches            the branches the logged-in user has a right to
   lkpDefaultBranch    the user's default branch ("" when none is set)
   items               the items of every branch, one row per branch and item (Item ID and Item Name boxes, Item
                       Range): the screen shows the items of the branch that is chosen
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
    console.error("rptItemMovement getLookups error:", error);

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

type Prepared = { report: ItemMovementReport; fileBase: string };

const HEADINGS = ["Fast Moving Items", "Slow Moving Items", "Non Moving Items"];

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgItem = Number(body.rdgItem);
  const lkpPostStatus = Number(body.lkpPostStatus);
  const rdgItemMovement = Number(body.rdgItemMovement);
  const rdgOrderBy = Number(body.rdgOrderBy);

  if (![0, 1].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1, 2].includes(rdgItem)) throw new ApiError(400, "Please select 'Item'", "rdgItem");
  if (![0, 1, 2].includes(lkpPostStatus)) {
    throw new ApiError(400, "Please select 'Post Status'", "lkpPostStatus");
  }
  if (![0, 1, 2].includes(rdgItemMovement)) {
    throw new ApiError(400, "Please select 'Item Movement'", "rdgItemMovement");
  }
  if (![0, 1].includes(rdgOrderBy)) throw new ApiError(400, "Please select 'Order by'", "rdgOrderBy");

  const lkpBranch = String(body.lkpBranch ?? "").trim();
  const lkpItemID = String(body.lkpItemID ?? "").trim();
  const lkpFromItem = String(body.lkpFromItem ?? "").trim();
  const lkpToItem = String(body.lkpToItem ?? "").trim();
  const dtpFromDate = String(body.dtpFromDate ?? "").trim();
  const dtpToDate = String(body.dtpToDate ?? "").trim();

  // ---- the old ValidateMe, in its order ----
  if (rdgBranch === 0 && lkpBranch === "") {
    throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  }

  if (rdgItem === 0 && lkpItemID === "") {
    throw new ApiError(400, "Please select 'Item ID'", "lkpItemID");
  }

  if (rdgItem === 1 && lkpFromItem === "") {
    throw new ApiError(400, "Please select 'Item ID From'", "lkpFromItem");
  }

  if (rdgItem === 1 && lkpToItem === "") {
    throw new ApiError(400, "Please select 'Item ID To'", "lkpToItem");
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

  const params: ItemMovementParams = {
    PstrCoID,
    rdgBranch: rdgBranch as 0 | 1,
    lkpBranch,
    rdgItem: rdgItem as 0 | 1 | 2,
    lkpItemID,
    lkpFromItem,
    lkpToItem,
    dtpFromDate,
    dtpToDate,
    lkpPostStatus: lkpPostStatus as 0 | 1 | 2,
    rdgItemMovement: rdgItemMovement as 0 | 1 | 2,
    rdgOrderBy: rdgOrderBy as 0 | 1,
  };

  const { lines, totals } = await getItemMovement(params);

  if (lines.length === 0) throw new ApiError(404, "No records found");

  const nameOf = (id: string) => allowed.find((b) => b.brId === id)?.brName || id;

  const heading = `${HEADINGS[rdgItemMovement]} For The Period ${ddmmmyyyy(dtpFromDate)} To ${ddmmmyyyy(dtpToDate)}`;

  return {
    report: {
      txtCoName: await getCompanyName(PstrCoID),
      txtHeading: heading,
      txtBranch: rdgBranch === 0 ? `Branch : ${nameOf(lkpBranch)}` : "",
      txtReportInfo: reportInfo(PstrUserID),
      rdgItemMovement: rdgItemMovement as 0 | 1 | 2,
      lines,
      totals,
    },
    fileBase: `${HEADINGS[rdgItemMovement].replace(" Items", "")} Items ${ddmmmyyyy(dtpFromDate)} to ${ddmmmyyyy(dtpToDate)}`,
  };
};

/* =========================================================
   POST /RptItemMovement/print  -> everything the preview, the printer and the PDF need
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
   POST /RptItemMovement/excel  -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildItemMovementWorkbook(report);

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
