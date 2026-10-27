import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getBranches,
  getDefaultBranch,
  getItemGroups,
  getStockValuation,
  round4,
  type StockValuationBranch,
  type StockValuationParams,
} from "../../../services/Purchase/Report/rptStockValuationService.js";
import {
  buildStockValuationWorkbook,
  type StockValuationReport,
} from "../../../services/Purchase/Report/rptStockValuationExcel.js";

// The Stock Valuation report (Purchase > Report > Stock Valuation). The logged-in company and user come
// from the SESSION (authenticate), never from the request.
//
// The body keys are the element ids of the page (the old rptStockValue form):
//   rdgBranch          0 One Branch, 1 Selected Branch, 2 All Branch
//   lkpBranch          the branch (One Branch)
//   chkBranch          the ticked branches (Selected Branch), a list of branch ids
//   rdgItemGroup       0 One Item Group, 1 All Item Group
//   lkpOneItemGroupID  the item group (One Item Group)
//   lkpPostStatus      0 All, 1 Posted, 2 Non Posted (the same as the Stock report)
//   dtpAsOnDate        yyyy-mm-dd
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

  console.error(`rptStockValuation ${what} error:`, error);

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
    console.error("rptStockValuation getLookups error:", error);

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

type Prepared = { report: StockValuationReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgItemGroup = Number(body.rdgItemGroup);
  const lkpPostStatus = Number(body.lkpPostStatus);

  if (![0, 1, 2].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1].includes(rdgItemGroup)) throw new ApiError(400, "Please select 'Item Group'", "rdgItemGroup");
  if (![0, 1, 2].includes(lkpPostStatus)) {
    throw new ApiError(400, "Please select 'Post Status'", "lkpPostStatus");
  }

  const lkpBranch = String(body.lkpBranch ?? "").trim();
  const chkBranch: string[] = Array.isArray(body.chkBranch)
    ? body.chkBranch.map((id: unknown) => String(id).trim()).filter((id: string) => id !== "")
    : [];
  const lkpOneItemGroupID = String(body.lkpOneItemGroupID ?? "").trim();
  const dtpAsOnDate = String(body.dtpAsOnDate ?? "").trim();
  const PstrYear = String(body.PstrYear ?? "").trim();

  // ---- the old ValidateMe, in its order ----
  if (rdgBranch === 0 && lkpBranch === "") {
    throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  }

  if (rdgBranch === 1 && chkBranch.length === 0) {
    throw new ApiError(400, "Please select atleast one 'Branch'", "chkBranchList");
  }

  if (rdgItemGroup === 0 && lkpOneItemGroupID === "") {
    throw new ApiError(400, "Please select 'Item Group ID'", "lkpOneItemGroupID");
  }

  if (dtpAsOnDate === "") throw new ApiError(400, "Please enter 'Date'", "dtpAsOnDate");
  if (!isRealDate(dtpAsOnDate)) throw new ApiError(400, "'Date' is not a valid date", "dtpAsOnDate");

  if (!/^\d{4}$/.test(PstrYear)) throw new ApiError(400, "The login year is missing", "dtpAsOnDate");

  // a branch may only be one the user has a right to
  const allowed = await getBranches(PstrCoID, PstrUserID);
  const chosen = rdgBranch === 0 ? [lkpBranch] : rdgBranch === 1 ? chkBranch : [];

  for (const id of chosen) {
    if (!allowed.some((b) => b.brId === id)) {
      throw new ApiError(
        403,
        "This branch is not allowed",
        rdgBranch === 0 ? "lkpBranch" : "chkBranchList"
      );
    }
  }

  // the heading line: "Branch : X", "Branch : X, Y" or nothing (All Branch)
  const names = chosen.map((id) => allowed.find((b) => b.brId === id)?.brName || id);
  const txtBranch = chosen.length > 0 ? `Branch : ${names.join(", ")}` : "";

  const params: StockValuationParams = {
    PstrCoID,
    PstrYear,
    rdgBranch: rdgBranch as 0 | 1 | 2,
    lkpBranch,
    chkBranch,
    rdgItemGroup: rdgItemGroup as 0 | 1,
    lkpOneItemGroupID,
    dtpAsOnDate,
    lkpPostStatus: lkpPostStatus as 0 | 1 | 2,
  };

  const { lines, totals } = await getStockValuation(params);

  if (lines.length === 0) throw new ApiError(404, "No records found");

  // one section per branch, in the order of the Branch screen: Jeddah and its items, then Meccah ...
  // (the lines already come ordered by item group and item)
  const position = (id: string) => {
    const index = allowed.findIndex((b) => b.brId === id);
    return index < 0 ? allowed.length : index;
  };

  const branchIds = [...new Set(lines.map((l) => l.lkpBranch))].sort(
    (a, b) => position(a) - position(b) || a.localeCompare(b)
  );

  const branches: StockValuationBranch[] = branchIds.map((id) => {
    const branchLines = lines.filter((l) => l.lkpBranch === id);

    return {
      lkpBranch: id,
      txtBranchName: allowed.find((b) => b.brId === id)?.brName || id,
      lines: branchLines,
      totals: {
        txtStock: round4(branchLines.reduce((sum, l) => sum + l.txtStock, 0)),
        txtStockValue: round4(branchLines.reduce((sum, l) => sum + l.txtStockValue, 0)),
      },
    };
  });

  return {
    report: {
      txtCoName: await getCompanyName(PstrCoID),
      txtHeading: `Stock Value As On Date : ${ddmmmyyyy(dtpAsOnDate)}`,
      txtBranch,
      txtReportInfo: reportInfo(PstrUserID),
      branches,
      totals,
    },
    fileBase: `Stock Value ${ddmmmyyyy(dtpAsOnDate)}`,
  };
};

/* =========================================================
   POST /RptStockValuation/print  -> everything the preview, the printer and the PDF need
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
   POST /RptStockValuation/excel  (the same body) -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildStockValuationWorkbook(report);

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
