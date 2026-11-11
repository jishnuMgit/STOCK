import { Response } from "express";
import { AuthenticatedRequest } from "../../../../middleware/authMiddleware.js";
import * as svc from "../../../../services/Sales/SalesInvoice/SalesInvoiceService.js";

const ctxOf = (req: AuthenticatedRequest): svc.Ctx => ({
  coId: req.user?.CoID,
  userId: req.user?.userId,
});

/* ServiceError -> its status/message; anything else -> 500 */
const fail = (
  res: Response,
  error: unknown,
  tag: string,
  fallback: string,
  includeDetail = false,
): Response => {
  if (error instanceof svc.ServiceError)
    return res
      .status(error.status)
      .json({ success: false, message: error.message });

  console.error(`${tag} error:`, error);
  return res.status(500).json({
    success: false,
    message: fallback,
    ...(includeDetail && {
      error: error instanceof Error ? error.message : String(error),
    }),
  });
};

export const calcSalesInvoice = (
  req: AuthenticatedRequest,
  res: Response,
): Response => {
  try {
    return res
      .status(200)
      .json({ success: true, data: svc.calculate(req.body) });
  } catch (e) {
    return fail(res, e, "calcSalesInvoice", "Failed to calculate totals");
  }
};

export const getSalesInvoiceTypes = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const data = await svc.getInvoiceTypes(ctxOf(req));
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return fail(
      res,
      e,
      "getSalesInvoiceTypes",
      "Failed to fetch invoice types",
    );
  }
};

export const getSalesInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const data = await svc.getSalesInvoice(
      ctxOf(req),
      req.query as Record<string, string>,
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return fail(res, e, "getSalesInvoice", "Failed to fetch Sales Invoice");
  }
};

export const getSalesItemStock = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const data = await svc.getItemStock(ctxOf(req), req.query);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return fail(res, e, "getSalesItemStock", "Failed to fetch item stock");
  }
};

export const getSalesItemStockDetails = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const q = req.query as Record<string, string>;
    const { data } = await svc.getItemStockDetails(ctxOf(req), {
      mode: q.mode ?? "S",
      year: q.year,
      itemId: q.itemId,
      docNo: q.docNo,
    });
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return fail(
      res,
      e,
      "getSalesItemStockDetails",
      "Failed to fetch branch stock",
    );
  }
};

export const saveSalesInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { message, data } = await svc.saveSalesInvoice(ctxOf(req), req.body);
    return res.status(200).json({ success: true, message, data });
  } catch (e) {
    return fail(res, e, "saveSalesInvoice", "Not saved, try again", true);
  }
};

export const deleteSalesInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { message } = await svc.deleteSalesInvoice(
      ctxOf(req),
      req.query as Record<string, string>,
    );
    return res.status(200).json({ success: true, message });
  } catch (e) {
    return fail(res, e, "deleteSalesInvoice", "Not deleted, try again");
  }
};

export const postSalesInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { message } = await svc.postSalesInvoice(ctxOf(req), req.body);
    return res.status(200).json({ success: true, message });
  } catch (e) {
    return fail(res, e, "postSalesInvoice", "Not posted, try again", true);
  }
};

export const getNextDocNo = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const data = await svc.getNextDocNo(ctxOf(req), req.query);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return fail(res, e, "getNextDocNo", "Failed to generate invoice no.");
  }
};

export const getSalesInvoiceLookups = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const data = await svc.getLookups(ctxOf(req), req.query);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return fail(res, e, "getSalesInvoiceLookups", "Failed to fetch lookups");
  }
};
