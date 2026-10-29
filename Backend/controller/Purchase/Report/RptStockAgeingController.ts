import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getAgeingLabels,
  getAgeingModes,
  getBranches,
  getDefaultBranch,
  getItems,
  getStockAgeing,
  type StockAgeingParams,
} from "../../../services/Purchase/Report/rptStockAgeingService.js";
import {
  buildStockAgeingWorkbook,
  type StockAgeingReport,
} from "../../../services/Purchase/Report/rptStockAgeingExcel.js";

// The Stock Ageing report (Purchase > Report > Stock Ageing). The logged-in company and user come from the
// SESSION (authenticate), never from the request.
//
// The body keys are the element ids of the page (the old rptStockAgeing form):
//   rdgBranch          0 One Branch, 1 All Branch
//   lkpBranch          the branch (One Branch)
//   rdgItem            0 One Item, 1 Range Item, 2 All Item
//   lkpItemID          the item (One Item)
//   lkpFromItem        the first item (Range Item)
//   lkpToItem          the last item (Range Item)
//   dtpAsOnDate        yyyy-mm-dd
//   lkpAgeingMode      'Days' or 'Month' (as tblageingperiod keeps them)
//   lkpPostStatus      0 All, 1 Posted, 2 Non Posted (the same as the other reports)
//   lkpPrint0Balance   1 Yes (the items whose balance is 0 are printed too), 0 No
//   PstrYear           the login year (which stock control row gives the Unit Cost)

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

  console.error(`rptStockAgeing ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

/* =========================================================
   GET /RptStockAgeing/lookups  -> what the screen needs to open
   branches            the branches the logged-in user has a right to
   lkpDefaultBranch    the user's default branch ("" when none is set)
   items               the items of every branch, one row per branch and item (Item ID and Item Name
                       boxes, Item Range): the screen shows the items of the branch that is chosen
   ageingModes         the ageing modes the company has set up (tblageingperiod): Days and/or Month
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

    const [branches, defaultBranch, items, ageingModes] = await Promise.all([
      getBranches(PstrCoID, PstrUserID),
      getDefaultBranch(PstrCoID, PstrUserID),
      getItems(PstrCoID),
      getAgeingModes(PstrCoID),
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
      ageingModes: ageingModes.map((m) => ({ lkpAgeingMode: m.ageingMode })),
    });
  } catch (error: unknown) {
    console.error("rptStockAgeing getLookups error:", error);

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

type Prepared = { report: StockAgeingReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgItem = Number(body.rdgItem);
  const lkpPostStatus = Number(body.lkpPostStatus);
  const lkpPrint0Balance = Number(body.lkpPrint0Balance);

  if (![0, 1].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1, 2].includes(rdgItem)) throw new ApiError(400, "Please select 'Item'", "rdgItem");
  if (![0, 1, 2].includes(lkpPostStatus)) {
    throw new ApiError(400, "Please select 'Post Status'", "lkpPostStatus");
  }
  if (![0, 1].includes(lkpPrint0Balance)) {
    throw new ApiError(400, "Please select 'Print 0 Balance'", "lkpPrint0Balance");
  }

  const lkpBranch = String(body.lkpBranch ?? "").trim();
  const lkpItemID = String(body.lkpItemID ?? "").trim();
  const lkpFromItem = String(body.lkpFromItem ?? "").trim();
  const lkpToItem = String(body.lkpToItem ?? "").trim();
  const dtpAsOnDate = String(body.dtpAsOnDate ?? "").trim();
  const lkpAgeingMode = String(body.lkpAgeingMode ?? "").trim();
  const PstrYear = String(body.PstrYear ?? "").trim();

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

  if (dtpAsOnDate === "") throw new ApiError(400, "Please enter 'As On Date'", "dtpAsOnDate");
  if (!isRealDate(dtpAsOnDate)) {
    throw new ApiError(400, "'As On Date' is not a valid date", "dtpAsOnDate");
  }

  if (lkpAgeingMode === "") throw new ApiError(400, "Please select 'Ageing Mode'", "lkpAgeingMode");

  if (!/^\d{4}$/.test(PstrYear)) throw new ApiError(400, "The login year is missing", "dtpAsOnDate");

  // the mode must be one the company has set up (tblageingperiod)
  const modes = await getAgeingModes(PstrCoID);

  if (!modes.some((m) => m.ageingMode === lkpAgeingMode)) {
    throw new ApiError(
      400,
      `The ageing periods are not set for '${lkpAgeingMode}'`,
      "lkpAgeingMode"
    );
  }

  // a branch may only be one the user has a right to
  const allowed = await getBranches(PstrCoID, PstrUserID);

  if (rdgBranch === 0 && !allowed.some((b) => b.brId === lkpBranch)) {
    throw new ApiError(403, "This branch is not allowed", "lkpBranch");
  }

  const params: StockAgeingParams = {
    PstrCoID,
    PstrYear,
    rdgBranch: rdgBranch as 0 | 1,
    lkpBranch,
    rdgItem: rdgItem as 0 | 1 | 2,
    lkpItemID,
    lkpFromItem,
    lkpToItem,
    dtpAsOnDate,
    lkpAgeingMode,
    lkpPostStatus: lkpPostStatus as 0 | 1 | 2,
    lkpPrint0Balance: lkpPrint0Balance as 0 | 1,
  };

  const lines = await getStockAgeing(params);

  if (lines.length === 0) throw new ApiError(404, "No records found");

  const nameOf = (id: string) => allowed.find((b) => b.brId === id)?.brName || id;

  return {
    report: {
      txtCoName: await getCompanyName(PstrCoID),
      txtHeading: `Ageing Of Stock As On Date : ${ddmmmyyyy(dtpAsOnDate)}`,
      txtBranch: rdgBranch === 0 ? `Branch : ${nameOf(lkpBranch)}` : "",
      txtReportInfo: reportInfo(PstrUserID),
      txtAgeLabels: await getAgeingLabels(PstrCoID, lkpAgeingMode),
      lines,
    },
    fileBase: `Stock Ageing ${ddmmmyyyy(dtpAsOnDate)}`,
  };
};

/* =========================================================
   POST /RptStockAgeing/print  -> everything the preview, the printer and the PDF need
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
   POST /RptStockAgeing/excel  -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildStockAgeingWorkbook(report);

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
