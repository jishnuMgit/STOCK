import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { getCompanyName } from "../../../utils/companyName.js";
import {
  getBranches,
  getDefaultBranch,
  getSuppliers,
  getSupplierPurchaseDetailed,
  getSupplierPurchaseSummary,
  type SupplierPurchaseParams,
} from "../../../services/Purchase/Report/rptSupplierPurchaseService.js";
import {
  buildSupplierPurchaseWorkbook,
  type SupplierPurchaseReport,
} from "../../../services/Purchase/Report/rptSupplierPurchaseExcel.js";

// The Supplier Purchase report (Purchase > Report > Supplier Purchase). The logged-in company and user come
// from the SESSION (authenticate), never from the request.
//
// The body keys are the element ids of the page (the old rptSupplierPurchase form):
//   rdgBranch      0 One Branch, 1 All Branch
//   lkpBranch      the branch (One Branch)
//   rdgSupplier    0 One Supplier, 1 All Supplier
//   lkpSupplierID  the supplier (One Supplier)
//   dtpFromDate    yyyy-mm-dd
//   dtpToDate      yyyy-mm-dd
//   rdgDetOrSum    0 Detailed, 1 Summary
//   rdgDocType     'PI' Purchase Invoice, 'PR' Purchase Return (Detailed only)

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

  console.error(`rptSupplierPurchase ${what} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Failed to prepare the report",
    error: error instanceof Error ? error.message : String(error),
  });
};

/* =========================================================
   GET /RptSupplierPurchase/lookups  -> what the screen needs to open
   branches            the branches the logged-in user has a right to
   lkpDefaultBranch    the user's default branch ("" when none is set)
   suppliers           the suppliers of the company (Supplier ID and Supplier Name boxes)
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

    const [branches, defaultBranch, suppliers] = await Promise.all([
      getBranches(PstrCoID, PstrUserID),
      getDefaultBranch(PstrCoID, PstrUserID),
      getSuppliers(PstrCoID),
    ]);

    return res.status(200).json({
      success: true,
      branches: branches.map((b) => ({ lkpBranch: b.brId, txtBranchName: b.brName })),
      lkpDefaultBranch: defaultBranch,
      suppliers: suppliers.map((s) => ({
        lkpSupplierID: s.supplierId,
        txtSupplierName: s.supplierName,
      })),
    });
  } catch (error: unknown) {
    console.error("rptSupplierPurchase getLookups error:", error);

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

type Prepared = { report: SupplierPurchaseReport; fileBase: string };

const prepareReport = async (req: AuthenticatedRequest): Promise<Prepared> => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const { CoID: PstrCoID, userId: PstrUserID } = req.user;
  const body = req.body ?? {};

  const rdgBranch = Number(body.rdgBranch);
  const rdgSupplier = Number(body.rdgSupplier);
  const rdgDetOrSum = Number(body.rdgDetOrSum);
  const rdgDocType = String(body.rdgDocType ?? "PI").trim();

  if (![0, 1].includes(rdgBranch)) throw new ApiError(400, "Please select 'Branch'", "rdgBranch");
  if (![0, 1].includes(rdgSupplier)) {
    throw new ApiError(400, "Please select 'Supplier'", "rdgSupplier");
  }
  if (![0, 1].includes(rdgDetOrSum)) {
    throw new ApiError(400, "Please select 'Detailed' or 'Summary'", "rdgDetOrSum");
  }
  if (rdgDetOrSum === 0 && !["PI", "PR"].includes(rdgDocType)) {
    throw new ApiError(400, "Please select 'Purchase Invoice' or 'Purchase Return'", "rdgDocType");
  }

  const lkpBranch = String(body.lkpBranch ?? "").trim();
  const lkpSupplierID = String(body.lkpSupplierID ?? "").trim();
  const dtpFromDate = String(body.dtpFromDate ?? "").trim();
  const dtpToDate = String(body.dtpToDate ?? "").trim();

  // ---- the old ValidateMe, in its order ----
  if (rdgBranch === 0 && lkpBranch === "") {
    throw new ApiError(400, "Please select 'Branch'", "lkpBranch");
  }

  if (rdgSupplier === 0 && lkpSupplierID === "") {
    throw new ApiError(400, "Please select 'Supplier ID'", "lkpSupplierID");
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

  // a supplier must be one of the company
  if (rdgSupplier === 0) {
    const suppliers = await getSuppliers(PstrCoID);

    if (!suppliers.some((s) => s.supplierId === lkpSupplierID)) {
      throw new ApiError(400, "Please select 'Supplier ID'", "lkpSupplierID");
    }
  }

  const params: SupplierPurchaseParams = {
    PstrCoID,
    rdgBranch: rdgBranch as 0 | 1,
    lkpBranch,
    rdgSupplier: rdgSupplier as 0 | 1,
    lkpSupplierID,
    dtpFromDate,
    dtpToDate,
  };

  const period = `For The Period ${ddmmmyyyy(dtpFromDate)} To ${ddmmmyyyy(dtpToDate)}`;
  const txtCoName = await getCompanyName(PstrCoID);
  const txtReportInfo = reportInfo(PstrUserID);

  const nameOf = (id: string) => allowed.find((b) => b.brId === id)?.brName || id;

  // ---- Summary: a block per supplier ----
  if (rdgDetOrSum === 1) {
    const suppliers = await getSupplierPurchaseSummary(params);

    if (suppliers.length === 0) throw new ApiError(404, "No records found");

    return {
      report: {
        rdgDetOrSum: 1,
        txtCoName,
        txtHeading: `Supplier Purchase Summary ${period}`,
        txtBranch: rdgBranch === 0 ? `Branch : ${nameOf(lkpBranch)}` : "",
        txtReportInfo,
        suppliers,
      },
      fileBase: `Supplier Purchase Summary ${ddmmmyyyy(dtpFromDate)} To ${ddmmmyyyy(dtpToDate)}`,
    };
  }

  // ---- Detailed: a block per document ----
  const documents = await getSupplierPurchaseDetailed(params, rdgDocType as "PI" | "PR");

  if (documents.length === 0) throw new ApiError(404, "No records found");

  const isInvoice = rdgDocType === "PI";

  return {
    report: {
      rdgDetOrSum: 0,
      rdgDocType: rdgDocType as "PI" | "PR",
      txtCoName,
      txtHeading: `Supplier Purchase ${isInvoice ? "Invoice" : "Return"} Details ${period}`,
      txtReportInfo,
      txtPINoLabel: isInvoice ? "P. Invoice No." : "P. Entry No.",
      documents,
    },
    fileBase: `Supplier Purchase ${isInvoice ? "Invoice" : "Return"} Details ${ddmmmyyyy(dtpFromDate)} To ${ddmmmyyyy(dtpToDate)}`,
  };
};

/* =========================================================
   POST /RptSupplierPurchase/print  -> everything the preview, the printer and the PDF need
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
   POST /RptSupplierPurchase/excel  -> the .xlsx file
========================================================= */

export const getExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { report, fileBase } = await prepareReport(req);
    const buffer = await buildSupplierPurchaseWorkbook(report);

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
