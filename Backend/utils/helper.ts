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



