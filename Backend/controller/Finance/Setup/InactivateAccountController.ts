import { Response } from "express";
import pool from "../../../DB/db.js";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";

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

// GET /InactivateAccount
// VB: FillCombos / GetInactiveAccount (account heads only).
// fgph = 'H' is inferred from the data; confirm against the old dbo.IsAccountHead (maybe IN ('H','P')).
// To hide customer accounts from this screen add: AND fgcs <> 'C'
export const getAccounts = async (req: AuthenticatedRequest, res: Response) => {
  const { coId } = getParams(req);

  if (!coId) return noSession(res, "Company not found in session");

  try {
    const { rows } = await pool.query(
      `SELECT faccountid   AS "accountId",
              faccountname AS "accountName",
              fstatus      AS "isActive"
         FROM dbo.tblaccount
        WHERE fcoid = $1
          AND fgph = 'H'
        ORDER BY faccountid`,
      [coId]
    );
    res.json({ success: true, accounts: rows });
  } catch (err) {
    console.error("getAccounts:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load accounts" });
  }
};

// POST /InactivateAccount   body: { accountId, isActive, menuName? }
// (company and user come from the session)
// VB: ValidateMe + objInactivateAccount.Apply -> SP_frmInactivateAccount mode 'M'
export const modifyStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { accountId, isActive, menuName } = req.body ?? {};
  const { coId, userId } = getParams(req);

  if (!coId) return noSession(res, "Company not found in session");
  if (!userId) return noSession(res, "User not found in session");

  if (!accountId) {
    return res
      .status(400)
      .json({ success: false, message: "Please select an 'Account'" });
  }
  if (typeof isActive !== "boolean") {
    return res
      .status(400)
      .json({ success: false, message: "Please select a 'Status'" });
  }

  try {
    await pool.query("CALL dbo.sp_pageinactivateaccount($1,$2,$3,$4,$5,$6)", [
      "M",
      coId,
      accountId,
      isActive,
      userId,
      menuName ?? "Inactivate Account",
    ]);
    res.json({ success: true, message: "Modified" });
  } catch (err) {
    console.error("modifyStatus:", err);
    res
      .status(500)
      .json({ success: false, message: "Not modified, try again" });
  }
};