import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getBranches,
  getCostCenters,
  getDefaultBranch,
  getIncomeSum,
  getIncomeSumMonthly,
  type IncomeSumParams,
} from "../../../services/Finance/Report/rptIncomeSumService.js";
import {
  buildIncomeSumMonthWorkbook,
  buildIncomeSumWorkbook,
  type IncomeSumMonthReport,
  type IncomeSumReport,
} from "../../../services/Finance/Report/rptIncomeSumExcel.js";

// The Income Summary report screen (Finance > Reports > Income Summary). The logged-in company and user come from the
// SESSION (authenticate), never from the request.
//
// The keys are the element ids of the page (the old rptIncomeSum form):
//   rdgBranch         0 One Branch, 1 All Branch
//   lkpBranch         the branch (One Branch)
//   rdgCostCenter     0 One Cost Center, 1 All Cost Center
//   lkpCostCenter     the cost center (One Cost Center)
//   rdgDate           0 Up to Month (the monthly report), 1 For a Period (Opening / Current / Closing)
//   dtpMonth          yyyy-mm (Up to Month)
//   dtpFromDate       yyyy-mm-dd (For a Period)
//   dtpToDate         yyyy-mm-dd (For a Period)
//   txtAccountLevel   1 to 4
//   lkpPostStatus     0 All, 1 Posted, 2 Non Posted (the same as the other reports)
//   lkpPrint0Balance  0 No, 1 Yes
//   lkpPrintACGroup   0 No, 1 Yes
// and, in the lookups:
//   txtBranchName, lkpDefaultBranch, txtCostCenterName

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

  console.error(`rptIncomeSum ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

/* =========================================================
   GET /RptIncomeSum/lookups   (the old FillCombos)
   -> branches [{ lkpBranch, txtBranchName }], lkpDefaultBranch, costCenters [{ lkpCostCenter, txtCostCenterName }]
   The branches are the ones the logged-in user has a right to; the old screen starts on the default branch. The cost
   centers are the company's (dbo.fillcostcenters).
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

    const [branches, defaultBranch, costCenters] = await Promise.all([
      getBranches(PstrCoID, PstrUserID),
      getDefaultBranch(PstrCoID, PstrUserID),
      getCostCenters(PstrCoID),
    ]);

    return res.status(200).json({
      success: true,
      branches: branches.map((b) => ({ lkpBranch: b.brId, txtBranchName: b.brName })),
      lkpDefaultBranch: defaultBranch,
      costCenters: costCenters.map((c) => ({
        lkpCostCenter: c.ccId,
        txtCostCenterName: c.ccName,
      })),
    });
  } catch (error: unknown) {
    console.error("rptIncomeSum getLookups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the lookups",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   THE REPORT: the checks of the old form, then the data. Print and Excel share it.
========================================================= */

// rdgDate 1: Opening / Current / Closing; rdgDate 0: the monthly report. The report carries its rdgDate for the page.
type Prepared =
  | { report: IncomeSumReport & { rdgDate: 1 }; fileBase: string }
  | { report: IncomeSumMonthReport & { rdgDate: 0 }; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgCostCenter = Number(body.rdgCostCenter);
  const rdgDate = Number(body.rdgDate);
  const lkpPostStatus = Number(body.lkpPostStatus);
  const lkpPrint0Balance = Number(body.lkpPrint0Balance);
  const lkpPrintACGroup = Number(body.lkpPrintACGroup);

  if (![0, 1].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1].includes(rdgCostCenter)) {
    throw new ApiError(400, "Please select 'Cost Center'", "rdgCostCenter");
  }
  if (![0, 1].includes(rdgDate)) throw new ApiError(400, "Please select 'Date'", "rdgDate");
  if (![0, 1, 2].includes(lkpPostStatus)) {
    throw new ApiError(400, "Please select 'Post Status'", "lkpPostStatus");
  }
  if (![0, 1].includes(lkpPrint0Balance)) {
    throw new ApiError(400, "Please select 'Print 0 Balance'", "lkpPrint0Balance");
  }
  if (![0, 1].includes(lkpPrintACGroup)) {
    throw new ApiError(400, "Please select 'Print A/c Group'", "lkpPrintACGroup");
  }

  const lkpBranch = String(body.lkpBranch ?? "").trim();
  const lkpCostCenter = String(body.lkpCostCenter ?? "").trim();
  const dtpMonth = String(body.dtpMonth ?? "").trim();
  let dtpFromDate = String(body.dtpFromDate ?? "").trim();
  let dtpToDate = String(body.dtpToDate ?? "").trim();
  const txtAccountLevel = Number(body.txtAccountLevel);

  // ---- the checks of the old form, in the order of the screen ----
  if (rdgBranch === 0 && lkpBranch === "") {
    throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  }

  if (rdgCostCenter === 0 && lkpCostCenter === "") {
    throw new ApiError(400, "Please select 'Cost Center'", "lkpCostCenter");
  }

  if (rdgDate === 0) {
    // Up to Month: from the 1st of January of the year to the end of the month
    const m = /^(\d{4})-(\d{2})$/.exec(dtpMonth);

    if (dtpMonth === "") throw new ApiError(400, "Please enter 'Month'", "dtpMonth");
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
      throw new ApiError(400, "'Month' is not a valid month", "dtpMonth");
    }

    dtpFromDate = `${m[1]}-01-01`;
    dtpToDate = `${m[1]}-${m[2]}-${pad(new Date(Number(m[1]), Number(m[2]), 0).getDate())}`;
  } else {
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

    // the report works inside one year: the opening is the part of that year before the From Date
    if (dtpFromDate.slice(0, 4) !== dtpToDate.slice(0, 4)) {
      throw new ApiError(400, "'From Date' and 'To Date' should be in the same year", "dtpToDate");
    }
  }

  if (!Number.isInteger(txtAccountLevel) || txtAccountLevel < 1 || txtAccountLevel > 4) {
    throw new ApiError(400, "'Account Level' should be from 1 to 4", "txtAccountLevel");
  }

  // a branch may only be one the user has a right to
  const allowed = await getBranches(PstrCoID, PstrUserID);

  if (rdgBranch === 0 && !allowed.some((b) => b.brId === lkpBranch)) {
    throw new ApiError(403, "This branch is not allowed", "lkpBranch");
  }

  const costCenters = await getCostCenters(PstrCoID);
  const costCenter = costCenters.find((c) => c.ccId === lkpCostCenter);

  if (rdgCostCenter === 0 && !costCenter) {
    throw new ApiError(400, "This cost center is not found", "lkpCostCenter");
  }

  const params: IncomeSumParams = {
    PstrCoID,
    rdgBranch: rdgBranch as 0 | 1,
    lkpBranch,
    rdgCostCenter: rdgCostCenter as 0 | 1,
    lkpCostCenter,
    dtpFromDate,
    dtpToDate,
    txtAccountLevel,
    lkpPostStatus: lkpPostStatus as 0 | 1 | 2,
    lkpPrint0Balance: lkpPrint0Balance as 0 | 1,
    lkpPrintACGroup: lkpPrintACGroup as 0 | 1,
  };

  const branchName = allowed.find((b) => b.brId === lkpBranch)?.brName || lkpBranch;

  // the old header rows: the branch and the cost center, each only when one is chosen
  const txtBranch = [
    rdgBranch === 0 ? `Branch : ${branchName}` : "",
    rdgCostCenter === 0 && costCenter ? `Cost Center : ${costCenter.ccId} - ${costCenter.ccName}` : "",
  ]
    .filter((part) => part !== "")
    .join("    ");

  if (rdgDate === 0) {
    // the monthly report: page 1 is January to June, page 2 is July to December (with the January to June total as its
    // Opening) - page 2 only when the month is after June
    const { lines, totals } = await getIncomeSumMonthly(params);

    if (lines.length === 0) throw new ApiError(404, "No records found");

    const year = dtpToDate.slice(0, 4);
    const monthIndex = Number(dtpToDate.slice(5, 7)) - 1;
    const upTo = `Income Summary Up to ${MONTH_NAMES[monthIndex]} - ${year}`;

    return {
      report: {
        rdgDate: 0,
        txtCoName: await getCompanyName(PstrCoID),
        // up to June: ONE table (January to June), headed "Up to <Month>". After June: table 1 (January to June) is headed
        // "Up to June" and table 2 (July to December, with the January to June total as its Opening) "Up to <Month>"
        txtHeading: monthIndex > 5 ? `Income Summary Up to June - ${year}` : upTo,
        txtHeadingJulToDec: monthIndex > 5 ? upTo : "",
        txtBranch,
        txtReportInfo: reportInfo(PstrUserID),
        lines,
        totals,
      },
      fileBase: `Income Summary Up to ${MONTH_NAMES[monthIndex]} ${year}`,
    };
  }

  const { lines, totals } = await getIncomeSum(params);

  if (lines.length === 0) throw new ApiError(404, "No records found");

  return {
    report: {
      rdgDate: 1,
      txtCoName: await getCompanyName(PstrCoID),
      txtHeading: `Income Summary For The Period ${ddmmmyyyy(dtpFromDate)} To ${ddmmmyyyy(dtpToDate)}`,
      txtBranch,
      txtReportInfo: reportInfo(PstrUserID),
      lines,
      totals,
    },
    fileBase: `Income Summary ${ddmmmyyyy(dtpFromDate)} to ${ddmmmyyyy(dtpToDate)}`,
  };
};

/* =========================================================
   POST /RptIncomeSum/print  -> everything the preview, the printer and the PDF need
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
   POST /RptIncomeSum/excel  -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer =
      report.rdgDate === 0
        ? await buildIncomeSumMonthWorkbook(report)
        : await buildIncomeSumWorkbook(report);

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
