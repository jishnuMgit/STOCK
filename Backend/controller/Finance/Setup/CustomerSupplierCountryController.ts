// controller/Finance/Setup/CustomerSupplierCountryController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  ApiError,
  getCountries as loadCountries,
  haveTrans,
  saveCountries as saveCountriesData,
} from "../../../services/Finance/Setup/CustomerSupplierCountryService.js";

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
// GET /api/CustomerCountry  -> the company's countries
// ------------------------------------------------------------
export const getCountries = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const countries = await loadCountries(coId);
    return res.status(200).json({ success: true, countries });
  } catch (error: unknown) {
    console.error("Get countries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load countries",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// GET /api/CustomerCountry/used/:id  -> do transactions already use this one?
// ------------------------------------------------------------
export const checkCountryUsed = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const used = await haveTrans(coId, String(req.params.id ?? ""));
    return res.status(200).json({ success: true, used });
  } catch (error: unknown) {
    console.error("Check country used error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check the transactions",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// POST /api/CustomerCountry  -> Save / Modify
// body: { coId, year, userId,
//         inserted: [{countryID, countryName, countryNameA, positionNo}],
//         updated:  [{originalCountryID, countryID, countryName, countryNameA, positionNo}],
//         deleted:  [originalCountryID] }
// ------------------------------------------------------------
export const saveCountries = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId, userId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const body = req.body ?? {};

    await saveCountriesData({
      coId,
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

    console.error("Save countries error:", error);

    const code = (error as { code?: string }).code;
    return res.status(code === "23505" ? 409 : 500).json({
      success: false,
      message: code === "23505" ? "Country ID already exists" : errMsg(error),
    });
  }
};
