import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  validateZATCASearch,
  validateZATCASubmit,
} from "../../../validators/ZATCASubmissionValidator.js";
import {
  getZATCABranchListService,
  getZATCACustomerListService,
  getZATCACustomerNameListService,
  getZATCADocumentTypeListService,
  getZATCASubmissionListService,
  submitZATCADocumentsService,
  type ZatcaSearchParams,
} from "../../../services/ZATCA/Transaction/zatcaSubmissionService.js";
import type { ZatcaSubmitDocument } from "../../../services/ZATCA/Transaction/zatcaGateway.js";

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// the company comes from the query when the page sends it, else from the session
const coIdOf = (req: AuthenticatedRequest): string =>
  String(req.query.PstrCoID ?? req.body?.PstrCoID ?? req.user?.CoID ?? "").trim();

/* =========================================================
   GET BRANCH LIST (the Branch box) - only the branches the logged-in user
   has a right to; the user comes from the SESSION
========================================================= */

export const getBranchList = async (
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

    const data = await getZATCABranchListService(coId, req.user.userId);

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    console.error("getBranchList (zatca submission) error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error: errorText(error),
    });
  }
};

/* =========================================================
   GET CUSTOMER LIST (the Customer ID / Customer Name boxes)
========================================================= */

export const getCustomerList = async (
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

    const data = await getZATCACustomerListService(coId);

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    console.error("getCustomerList (zatca submission) error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load customer list",
      error: errorText(error),
    });
  }
};

/* =========================================================
   GET CUSTOMER NAME LIST (the Customer Name box) - sorted by customer name
========================================================= */

export const getCustomerNameList = async (
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

    const data = await getZATCACustomerNameListService(coId);

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    console.error("getCustomerNameList (zatca submission) error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load customer name list",
      error: errorText(error),
    });
  }
};

/* =========================================================
   GET DOCUMENT TYPE LIST (the Document box: SI / SR / DN / CN)
========================================================= */

export const getDocumentTypeList = async (
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

    const data = await getZATCADocumentTypeListService(coId);

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    console.error("getDocumentTypeList (zatca submission) error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load document types",
      error: errorText(error),
    });
  }
};

/* =========================================================
   SEARCH (the Search button) - the documents not yet sent to ZATCA
========================================================= */

export const searchZATCASubmission = async (
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

    const b = req.body ?? {};
    const params: ZatcaSearchParams = {
      coId,
      year: String(req.user.Year ?? new Date().getFullYear()),
      docMode: b.docMode === "all" ? "all" : "one",
      docType: b.docType ?? null,
      branchId: b.branchId ?? null,
      customerId: b.customerId ?? null,
      filterBy: b.filterBy === "no" ? "no" : "date",
      fromDocNo: b.fromDocNo ?? null,
      toDocNo: b.toDocNo ?? null,
      dateBasis: b.dateBasis === "document" ? "document" : "issue",
      fromDate: b.fromDate ?? null,
      toDate: b.toDate ?? null,
    };

    const invalid = validateZATCASearch(params);
    if (invalid) {
      return res.status(400).json({ success: false, message: invalid });
    }

    const data = await getZATCASubmissionListService(params);

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    console.error("searchZATCASubmission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load documents",
      error: errorText(error),
    });
  }
};

/* =========================================================
   SUBMIT (the Submit button) - sends the ticked documents to ZATCA
========================================================= */

export const submitZATCASubmission = async (
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

    const docs: ZatcaSubmitDocument[] = req.body?.documents;
    const invalid = validateZATCASubmit(docs);
    if (invalid) {
      return res.status(400).json({ success: false, message: invalid });
    }

    const out = await submitZATCADocumentsService(docs, {
      coId,
      year: String(req.user.Year ?? new Date().getFullYear()),
      userId: req.user.userId,
    });

    let message: string;
    if (out.rejected > 0 && out.accepted > 0) {
      message = `${out.accepted} Files Submitted Successfully ${out.rejected} Files Rejected`;
    } else if (out.rejected > 0) {
      message = `${out.rejected} Files Rejected`;
    } else {
      message = `${out.accepted} Files Submitted Successfully`;
    }

    return res.status(200).json({ success: true, message, data: out });
  } catch (error: unknown) {
    console.error("submitZATCASubmission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit documents",
      error: errorText(error),
    });
  }
};
