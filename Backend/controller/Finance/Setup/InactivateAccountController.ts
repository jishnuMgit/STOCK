import { Request, Response } from "express";
import pool from "../../../DB/db.js";

type Params = { coId: string; year: string; userId: string };


const getParams = (req: Request): Params => {
  const src = { ...(req.query ?? {}), ...(req.body ?? {}) } as Record<
    string,
    unknown
  >;
  return {
    coId: String(src.coId ?? "").trim(),
    year: String(src.year ?? "").trim(),
    userId: String(src.userId ?? "").trim(),
  };
};

// GET /InactivateAccount?coId=01
// VB: FillCombos / GetInactiveAccount (account heads only).
// fgph = 'H' is inferred from the data; confirm against the old dbo.IsAccountHead (maybe IN ('H','P')).
// To hide customer accounts from this screen add: AND fgcs <> 'C'
export const getAccounts = async (req: Request, res: Response) => {
  const { coId } = getParams(req);

  if (!coId) {
    return res
      .status(400)
      .json({ success: false, message: "coId is required" });
  }

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

// POST /InactivateAccount   body: { coId, year, userId, accountId, isActive, menuName? }
// VB: ValidateMe + objInactivateAccount.Apply -> SP_frmInactivateAccount mode 'M'
export const modifyStatus = async (req: Request, res: Response) => {
  const { accountId, isActive, menuName } = req.body ?? {};
  const { coId, userId } = getParams(req);

  if (!coId || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "coId and userId are required" });
  }
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