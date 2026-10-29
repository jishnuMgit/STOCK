import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getBranches,
  getDefaultBranch,
  getItemGroups,
  getStockVerification,
  round4,
  type StockVerificationParams,
} from "../../../services/Purchase/Report/rptStockVerificationService.js";
import {
  buildStockVerificationWorkbook,
  type StockVerificationReport,
} from "../../../services/Purchase/Report/rptStockVerificationExcel.js";

// The Stock Verification report (Purchase > Report > Stock Verification). The logged-in company and user
// come from the SESSION (authenticate), never from the request.
//
// The body keys are the element ids of the page (the old rptStockVerfication form):
//   rdgBranch          0 One Branch, 1 All Branch
//   lkpBranch          the branch (One Branch)
//   rdgItemGroup       0 One Item Group, 1 All Item Group
//   lkpOneItemGroupID  the item group (One Item Group)
//   lkpPostStatus      0 All, 1 Posted, 2 Non Posted (the same as the other reports)
//   dtpAsOnDate        yyyy-mm-dd

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

  console.error(`rptStockVerification ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

export const getLookups = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { CoID: PstrCoID, userId: PstrUserID } = req.user;

    const [branches, defaultBranch, groups] = await Promise.all([
      getBranches(PstrCoID, PstrUserID),
      getDefaultBranch(PstrCoID, PstrUserID),
      getItemGroups(PstrCoID),
    ]);

    return res.status(200).json({
      success: true,
      branches: branches.map((b) => ({ lkpBranch: b.brId, txtBranchName: b.brName })),
      lkpDefaultBranch: defaultBranch,
      groups: groups.map((g) => ({
        lkpItemGroupID: g.groupId,
        txtItemGroupName: g.groupName,
      })),
    });
  } catch (error: unknown) {
    console.error("rptStockVerification getLookups error:", error);

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

type Prepared = { report: StockVerificationReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgItemGroup = Number(body.rdgItemGroup);
  const lkpPostStatus = Number(body.lkpPostStatus);

  if (![0, 1].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1].includes(rdgItemGroup)) {
    throw new ApiError(400, "Please select 'Item Group'", "rdgItemGroup");
  }
  if (![0, 1, 2].includes(lkpPostStatus)) {
    throw new ApiError(400, "Please select 'Post Status'", "lkpPostStatus");
  }

  const lkpBranch = String(body.lkpBranch ?? "").trim();
  const lkpOneItemGroupID = String(body.lkpOneItemGroupID ?? "").trim();
  const dtpAsOnDate = String(body.dtpAsOnDate ?? "").trim();

  // ---- the old ValidateMe, in its order ----
  if (rdgBranch === 0 && lkpBranch === "") {
    throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  }

  if (rdgItemGroup === 0 && lkpOneItemGroupID === "") {
    throw new ApiError(400, "Please select 'Item Group ID'", "lkpOneItemGroupID");
  }

  if (dtpAsOnDate === "") throw new ApiError(400, "Please enter 'Date'", "dtpAsOnDate");
  if (!isRealDate(dtpAsOnDate)) throw new ApiError(400, "'Date' is not a valid date", "dtpAsOnDate");

  // a branch may only be one the user has a right to
  const allowed = await getBranches(PstrCoID, PstrUserID);

  if (rdgBranch === 0 && !allowed.some((b) => b.brId === lkpBranch)) {
    throw new ApiError(403, "This branch is not allowed", "lkpBranch");
  }

  const params: StockVerificationParams = {
    PstrCoID,
    rdgBranch: rdgBranch as 0 | 1,
    lkpBranch,
    rdgItemGroup: rdgItemGroup as 0 | 1,
    lkpOneItemGroupID,
    dtpAsOnDate,
    lkpPostStatus: lkpPostStatus as 0 | 1 | 2,
  };

  const { branches, totals } = await getStockVerification(params);

  if (branches.length === 0) throw new ApiError(404, "No records found");

  // the branches in the order of the Branch screen, each with its name (a branch the user has no right to
  // - in the data but not in the list - comes last, under its id)
  const position = (id: string) => {
    const i = allowed.findIndex((b) => b.brId === id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  branches.sort((a, b) => position(a.lkpBranch) - position(b.lkpBranch));

  for (const branch of branches) {
    branch.txtBranchName = allowed.find((b) => b.brId === branch.lkpBranch)?.brName || branch.lkpBranch;
  }

  return {
    report: {
      txtCoName: await getCompanyName(PstrCoID),
      txtHeading: `Stock Verification As On Date : ${ddmmmyyyy(dtpAsOnDate)}`,
      txtBranch: rdgBranch === 0 ? `Branch : ${branches[0].txtBranchName}` : "",
      txtReportInfo: reportInfo(PstrUserID),
      branches,
      totals,
    },
    fileBase: `Stock Verification ${ddmmmyyyy(dtpAsOnDate)}`,
  };
};

/* =========================================================
   POST /RptStockVerification/print  -> everything the preview, the printer and the PDF need
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
   POST /RptStockVerification/excel  (the same body) -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildStockVerificationWorkbook(report);

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
