// controller/Finance/Setup/CostCenterController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  ApiError,
  getCostCenters as loadCostCenters,
  haveTrans,
  saveCostCenters as saveCostCentersData,
} from "../../../services/Finance/Setup/CostCenterService.js";

type Params = { coId: string; year: string; userId: string };

// CoID and userId come from the logged-in user (auth middleware), never from
// the request body / query, so a caller cannot act on another company.
// year is not in the session, so it still comes from the request:
//   POST -> req.body, GET -> req.query (a GET has no body)
const getParams = (req: AuthenticatedRequest): Params => {
  const src = { ...(req.query ?? {}), ...(req.body ?? {}) } as Record<
    string,
    unknown
  >;
  return {
    // session first; the request value is only a stopgap
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
// GET /api/CostCenter  -> the company's cost centers
// ------------------------------------------------------------
export const getCostCenters = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const costCenters = await loadCostCenters(coId);
    return res.status(200).json({ success: true, costCenters });
  } catch (error: unknown) {
    console.error("Get cost centers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load cost centers",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// GET /api/CostCenter/used/:id  -> do transactions already use this one?
// ------------------------------------------------------------
export const checkCostCenterUsed = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const used = await haveTrans(coId, String(req.params.id ?? ""));
    return res.status(200).json({ success: true, used });
  } catch (error: unknown) {
    console.error("Check cost center used error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check the transactions",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// POST /api/CostCenter  -> Save / Modify
// body: { year,
//         inserted: [{ccID, ccName, positionNo}],
//         updated:  [{originalCCID, ccID, ccName, positionNo}],
//         deleted:  [originalCCID] }
// (company and user come from the session)
// ------------------------------------------------------------
export const saveCostCenters = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId, year, userId } = getParams(req);
  if (!coId) return noCompany(res);

  try {
    const body = req.body ?? {};

    await saveCostCentersData({
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

    console.error("Save cost centers error:", error);

    const code = (error as { code?: string }).code;
    return res.status(code === "23505" ? 409 : 500).json({
      success: false,
      message:
        code === "23505" ? "'Cost Center ID' already exists" : errMsg(error),
    });
  }
};
