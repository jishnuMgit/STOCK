import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { validateZatcaPdfA3 } from "../../../validators/ZATCAPDFA3PendingValidator.js";
import {
  getZatcaPdfA3BranchListService,
  getZatcaPdfA3CustomerListService,
  getZatcaPdfA3DocTypeListService,
  getZatcaPdfA3PendingService,
  type ZatcaPdfA3Params,
} from "../../../services/ZATCA/Transaction/zatcaPdfA3PendingService.js";

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const coIdOf = (req: AuthenticatedRequest): string =>
  String(req.user?.CoID ?? "").trim();

/* =========================================================
   LOOKUPS (the Branch, Customer and Document boxes) - the branches are
   only the ones the logged-in user has a right to; the user comes from the SESSION
========================================================= */

export const getLookups = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const coId = coIdOf(req);

    if (!coId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const [branches, customers, docTypes] = await Promise.all([
      getZatcaPdfA3BranchListService(coId, req.user.userId),
      getZatcaPdfA3CustomerListService(coId),
      getZatcaPdfA3DocTypeListService(coId),
    ]);

    return res.status(200).json({
      success: true,
      branches,
      customers,
      docTypes,
    });
  } catch (error: unknown) {
    console.error("getLookups (zatca pdfa3) error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load the lists",
      error: errorText(error),
    });
  }
};

/* =========================================================
   THE CHECKS AND THE FILTERS of Search and Export - one place
========================================================= */

type Prepared =
  | { ok: true; params: ZatcaPdfA3Params }
  | { ok: false; status: number; body: Record<string, unknown> };

const prepareParams = async (req: AuthenticatedRequest): Promise<Prepared> => {
  const stop = (status: number, message: string): Prepared => ({
    ok: false,
    status,
    body: { success: false, message },
  });

  const coId = coIdOf(req);

  if (!coId) return stop(400, "Company ID is required");
  if (!req.user) return stop(401, "Authentication required");

  const b = req.body ?? {};
  const str = (v: unknown): string => String(v ?? "").trim();

  // the same rules as the VB form: All Document = all branches, by date, all customers;
  // All Branch = by date; By Invoice No. = all customers
  const documentMode = b.documentMode === "one" ? "one" : "all";
  const branchMode = documentMode === "one" && b.branchMode === "one" ? "one" : "all";
  const invoiceMode =
    documentMode === "one" && branchMode === "one" && b.invoiceMode === "id" ? "id" : "date";
  const customerMode =
    documentMode === "one" && invoiceMode === "date" && b.customerMode === "one" ? "one" : "all";

  const fromInvoiceNo = str(b.fromInvoiceNo);
  const fromDate = str(b.fromDate);

  // the financial year of the login; by date it is the year of the dates (the form
  // makes both dates the same year)
  const year =
    str(req.user.Year) ||
    (invoiceMode === "date" && /^\d{2}\/\d{2}\/\d{4}$/.test(fromDate) ? fromDate.slice(6) : "") ||
    String(new Date().getFullYear());

  const params: ZatcaPdfA3Params = {
    coId,
    year,
    documentMode,
    invType: documentMode === "one" ? str(b.invType) : null,
    branchMode,
    branchId: branchMode === "one" ? str(b.branchId) : null,
    invoiceMode,
    fromInvoiceNo,
    toInvoiceNo: str(b.toInvoiceNo) || fromInvoiceNo, // empty To = From
    fromDate,
    toDate: str(b.toDate),
    customerMode,
    customerId: customerMode === "one" ? str(b.customerId) : null,
  };

  const invalid = validateZatcaPdfA3(params);
  if (invalid) return stop(400, invalid);

  // the branch must be one the user has a right to
  if (params.branchMode === "one") {
    const branches = await getZatcaPdfA3BranchListService(coId, req.user.userId);
    if (!branches.some((x) => x.brId === params.branchId)) {
      return stop(403, "You do not have permission to this branch.");
    }
  }

  return { ok: true, params };
};

/* =========================================================
   SEARCH (VB cmdRefresh / GetData) - the pending documents
========================================================= */

export const getZATCAPDFA3Pending = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await prepareParams(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    const rows = await getZatcaPdfA3PendingService(prepared.params);

    return res.status(200).json({ success: true, data: { rows } });
  } catch (error: unknown) {
    console.error("getZATCAPDFA3Pending error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load the documents",
      error: errorText(error),
    });
  }
};

/* =========================================================
   EXPORT PDF/A3 (VB cmdExportPDFA3 / Export_A3PDFWithXMLAttach)
   Not ported yet: it needs the invoice / credit note / debit note page layouts
   (rptSIRTaxInvoicePrintRpt, rptSRRTaxInvoicePrintRpt, rptTaxCNPrint, rptTaxDNPrint)
   drawn as an A3 PDF, and the signed XML of the document attached to it.
========================================================= */

export const exportZATCAPDFA3 = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await prepareParams(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    return res.status(501).json({
      success: false,
      message: "PDF/A3 export is not available yet",
    });
  } catch (error: unknown) {
    console.error("exportZATCAPDFA3 error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export PDF/A3",
      error: errorText(error),
    });
  }
};
