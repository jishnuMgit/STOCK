// controller/Finance/Setup/InactivateAccountController.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  ApiError,
  getAccounts as loadAccounts,
  modifyStatus as modifyStatusData,
} from "../../../services/Finance/Setup/InactivateAccountService.js";

type Params = { coId: string; userId: string };

// CoID and userId come from the logged-in user (auth middleware), never from
// the request body / query, so a caller cannot act on another company.
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
    userId: String((req.user as any)?.userId ?? src.userId ?? "").trim(),
  };
};

const noSession = (res: Response, message: string) =>
  res.status(401).json({ success: false, message });

// GET /InactivateAccount  -> the account heads and their status
export const getAccounts = async (req: AuthenticatedRequest, res: Response) => {
  const { coId } = getParams(req);
  if (!coId) return noSession(res, "Company not found in session");

  try {
    const accounts = await loadAccounts(coId);
    res.json({ success: true, accounts });
  } catch (err) {
    console.error("getAccounts:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load accounts" });
  }
};

// POST /InactivateAccount   body: { accountId, isActive, menuName? }
// (company and user come from the session)
export const modifyStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { accountId, isActive, menuName } = req.body ?? {};
  const { coId, userId } = getParams(req);

  if (!coId) return noSession(res, "Company not found in session");
  if (!userId) return noSession(res, "User not found in session");

  try {
    await modifyStatusData({ coId, userId, accountId, isActive, menuName });
    res.json({ success: true, message: "Modified" });
  } catch (err) {
    if (err instanceof ApiError) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }
    console.error("modifyStatus:", err);
    res
      .status(500)
      .json({ success: false, message: "Not modified, try again" });
  }
};
