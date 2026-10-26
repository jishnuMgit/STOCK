import pool from "../DB/db.js";
import {
  MatchRow,
  GetDataMatchParams,
  MatchTotalParams,
} from "../types/types.js";

export function getNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);

  return Number.isNaN(number) ? 0 : number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getDataMatch(
  params: GetDataMatchParams,
  db: any,
  coId: string,
): Promise<MatchRow[]> {
  const {
    strMode,
    strDocType,
    strDocNo,
    strCSAccountID,
    intMAccountSlNo,
    intMAccountSlNoSub,
    strUMDKey,
  } = params;

  const result = await db.query(
    `
      SELECT *
      FROM dbo.sp_getpendingmatchdocs(
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
    `,
    [
      strMode,
      coId,
      strCSAccountID,
      strDocType,
      strDocNo,
      intMAccountSlNo,
      intMAccountSlNoSub,
      strUMDKey,
    ],
  );

  return result.rows;
}

import type { ReceiptData, ReceiptRow } from "../types/types.js";

export const cleanReceiptPayload = (body: any): ReceiptData => {
  const rows: ReceiptRow[] = (Array.isArray(body?.rows) ? body.rows : [])
    .filter((row: any) => row && String(row.accountId ?? "").trim() !== "")
    .map(
      (row: any, index: number): ReceiptRow => ({
        txtslNo: Number(row.slNo) || index + 1,

        lkpAccountID: String(row.accountId).trim(),

        lkpAccountName: row.accountName ?? "",

        strGCS: row.fgcs ?? "",

        lkpDivID: row.DivID ?? "",

        lkpCCID: row.CCID ?? "",

        /* new name first, old name as fallback */
        txtDebitCredit: row.txtDebitCredit ?? row.creditAmt ?? 0,

        txtDescription: row.description ?? "",

        ckhMatch: row.match ?? false,
      }),
    );

  return {
    lkpBranch: body?.lkpBranch,

    lkpType: body?.lkpType,

    lkpCBAccountName: body?.cbAccountName,

    cbCcId: body?.cbCcId,

    txtDocNo: body?.txtDocNo,

    dtpDate: body?.dtpDate,

    txtReceivedFrom: body?.receivedFrom,

    txtReference: body?.reference,

    strNote: body?.note,

    rows,
  };
};

export const CheckISdividISccid = async (
  body: any,
  pool: any,
  PstrCoID: string,
): Promise<void> => {
  const rows = body.rows || [];

  for (const item of rows) {
    const accountId = item.accountId;

    if (!accountId) {
      continue;
    }

    const result = await pool.query(
      `
      SELECT
        COALESCE(fhavecc, false) AS "haveCC",
        COALESCE(fhavedivision, false) AS "haveDivision"
      FROM dbo.tblaccount
      WHERE fcoid = $1
        AND faccountid = $2
      `,
      [PstrCoID, accountId],
    );

    const account = result.rows[0];

    if (!account) {
      continue;
    }

    const haveCC = account.haveCC === true;
    const haveDivision = account.haveDivision === true;

    /* =========================================
       CC ID REQUIRED
    ========================================= */

    if (haveCC && (!item.CCID || item.CCID.trim() === "")) {
      throw new Error(
        `Account ${accountId} requires a CC ID. Please select the CC ID.`,
      );
    }

    /* =========================================
       DIVISION REQUIRED
    ========================================= */

    if (haveDivision && (!item.DivID || item.DivID.trim() === "")) {
      throw new Error(
        `Account ${accountId} requires a Division. Please select the Division.`,
      );
    }
  }
};

export const isActivePeriod = async (pstrCoID: any, strBrID: any, dtpDate: any) => {
  const result = await pool.query(
    `
      SELECT dbo.isactiveperiod($1, $2, $3) AS is_active
    `,
    [pstrCoID, strBrID, dtpDate],
  );

  return result.rows[0]?.is_active === true;
};
