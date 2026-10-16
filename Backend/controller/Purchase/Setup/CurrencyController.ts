// controller/Purchase/Setup/CurrencyPageController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  ApiError,
  getCurrencies as loadCurrencies,
  haveTrans,
  saveCurrencies as saveCurrenciesData,
} from "../../../services/Purchase/Setup/CurrencyPageService.js";

type Params = { coId: string; year: string; userId: string };

// CoID and userId come from the logged-in user (auth middleware), never from
// the request body / query, so a caller cannot act on another company.
// year is not in the session, so it still comes from the request:
//   POST -> req.body, GET -> req.query (a GET has no body)
// STOPGAP: falls back to coId / userId sent by the page until the router uses
// the auth middleware and the page sends the token. Then remove the
// `?? src.coId` and `?? src.userId` parts.
const getParams = (req: AuthenticatedRequest): Params => {
  const src = { ...(req.query ?? {}), ...(req.body ?? {}) } as Record<
    string,
    unknown
  >;
  return {
    coId: String(req.user?.CoID ?? src.coId ?? "").trim(),
    year: String(src.year ?? "").trim(),
    userId: String((req.user as any)?.userId ?? src.userId ?? "").trim(),
  };
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const noCompany = (res: Response): Response =>
  res
    .status(401)
    .json({ success: false, message: "Company not found in session" });

// ------------------------------------------------------------
// GET /api/Currency  -> the company's currencies
// ------------------------------------------------------------
export const getCurrencies = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const currencies = await loadCurrencies(coId);
    return res.status(200).json({ success: true, currencies });
  } catch (error: unknown) {
    console.error("Get currencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load currencies",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// GET /api/Currency/used/:id  -> do transactions already use this one?
// ------------------------------------------------------------
export const checkCurrencyUsed = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const used = await haveTrans(coId, String(req.params.id ?? ""));
    return res.status(200).json({ success: true, used });
  } catch (error: unknown) {
    console.error("Check currency used error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check the transactions",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// POST /api/Currency  -> Save / Modify
// body: { coId, year, userId,
//         inserted: [{currency}],
//         updated:  [{originalCurrency, currency}],
//         deleted:  [originalCurrency] }
// ------------------------------------------------------------
export const saveCurrencies = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId, year, userId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const body = req.body ?? {};

    await saveCurrenciesData({
      coId,
      year,
      userId,
      inserted: body.inserted,
      updated: body.updated,
      deleted: body.deleted,
    });

    return res.status(200).json({ success: true, message: "Saved" });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }

    console.error("Save currencies error:", error);

    const code = (error as { code?: string }).code;
    return res.status(code === "23505" ? 409 : 500).json({
      success: false,
      message: code === "23505" ? "Currency already exists" : errMsg(error),
    });
  }
};
