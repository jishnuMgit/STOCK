// services/Finance/Setup/InactivateAccountService.ts
// Data access + business rules for the Inactivate Account page
// (port of frmInactivateAccount / clsInactivateAccount / SP_frmInactivateAccount).
import pool from "../../../DB/db.js";

const DEFAULT_MENU_NAME = "Inactivate Account";

// An error with an HTTP status the controller can send back as it is.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Account = {
  accountId: string;
  accountName: string;
  isActive: boolean | null;
};

export type ModifyPayload = {
  coId: string;
  userId: string;
  accountId?: unknown;
  isActive?: unknown;
  menuName?: unknown;
};

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

// VB: FillCombos / GetInactiveAccount (account heads only).
// fgph = 'H' is inferred from the data; confirm against the old
// dbo.IsAccountHead (maybe IN ('H','P')).
// To hide customer accounts from this screen add: AND fgcs <> 'C'
export const getAccounts = async (coId: string): Promise<Account[]> => {
  const { rows } = await pool.query(
    `SELECT faccountid   AS "accountId",
            faccountname AS "accountName",
            fstatus      AS "isActive"
       FROM dbo.tblaccount
      WHERE fcoid = $1
        AND fgph = 'H'
      ORDER BY faccountid`,
    [coId],
  );
  return rows;
};

// ------------------------------------------------------------
// MODIFY
// VB: ValidateMe + objInactivateAccount.Apply -> SP_frmInactivateAccount mode 'M'
// ------------------------------------------------------------
export const modifyStatus = async (p: ModifyPayload): Promise<void> => {
  const accountId = String(p.accountId ?? "").trim();
  const menuName = String(p.menuName ?? "").trim() || DEFAULT_MENU_NAME;

  if (!accountId) throw new ApiError(400, "Please select an 'Account'");
  if (typeof p.isActive !== "boolean") {
    throw new ApiError(400, "Please select a 'Status'");
  }

  await pool.query(
    `CALL dbo.sp_pageinactivateaccount(
       $1::varchar, $2::varchar, $3::varchar, $4::boolean, $5::varchar, $6::varchar)`,
    ["M", p.coId, accountId, p.isActive, p.userId, menuName],
  );
};
