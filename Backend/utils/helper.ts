import pool from '../DB/db.js';
import {MatchRow,GetDataMatchParams,MatchTotalParams} from '../types/types.js'


export function getNumber(value: unknown): number {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isNaN(number)
    ? 0
    : number;
}

export function round2(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}


export async function getDataMatch(
  params: GetDataMatchParams,
  db: any,
  coId: string
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
    ]
  );

  return result.rows;
}



export const cleanReceiptPayload = (body: any) => {
  const filteredRows = (body.rows ?? []).filter(
    (row: any) =>
      !(
    
        (row.accountId === "" && row.accountName === "") ||
        row.creditAmount === 0
      )
  );

  const recalculatedTotal = filteredRows.reduce(
    (sum: number, row: any) => sum + (Number(row.creditAmount) || 0),
    0
  );

  return {
    ...body,
    rows: filteredRows,
    total: recalculatedTotal,
  };
};

export const CheckISdividISccid = async (
  body: any,
  pool: any,
  PstrCoID: string
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
      [PstrCoID, accountId]
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

    if (
      haveCC &&
      (!item.ccId || item.ccId.trim() === "")
    ) {
      throw new Error(
        `Account ${accountId} requires a CC ID. Please select the CC ID.`
      );
    }


    /* =========================================
       DIVISION REQUIRED
    ========================================= */

    if (
      haveDivision &&
      (!item.division || item.division.trim() === "")
    ) {
      throw new Error(
        `Account ${accountId} requires a Division. Please select the Division.`
      );
    }
  }
};




export const isActivePeriod = async (strBrID: any, dtpDate: any, coId: any) => {
  const result = await pool.query(
    `
      SELECT dbo.isactiveperiod($1, $2, $3) AS is_active
    `,
    [coId, strBrID, dtpDate]
  );

  return result.rows[0]?.is_active === true;
};