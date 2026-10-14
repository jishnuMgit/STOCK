// services/rptChartOfAccountService.ts
// Data access for the Chart Of Account REPORT page
// (port of FinBL.rptChartofAccount.FillTree / Apply + SP_rptAccount).
import pool from "../../../DB/db.js";

export type TreeAccount = {
  accountId: string;
  accountName: string;
  accountGroupId: string | null;
  accountLevel: number;
};

export type ReportRow = {
  accountId: string;
  accountName: string;
  accountLevel: number;
  haveCC: boolean;
};

const ACCOUNT_ID_MAX = 12; // VB: @strAccountID varchar(12)

// sp_rptaccount 'G' prefixes the name with spaces by level so the printed
// report shows the hierarchy: level 2 -> 4 spaces, 3 -> 8, 4 -> 13.
const INDENT_BY_LEVEL: Record<number, number> = { 2: 4, 3: 8, 4: 13 };
const indentName = (name: string, level: number) =>
  " ".repeat(INDENT_BY_LEVEL[level] ?? 0) + (name ?? "");
const MAX_IDS = 20000;

// ---- company table (ADJUST if your names differ) ----
// VB objCommon.CoName. To find the real table / column, run:
//   SELECT table_schema, table_name, column_name
//     FROM information_schema.columns
//    WHERE column_name ILIKE '%coname%';
const COMPANY_TABLE = "dbo.tblcompany";
const COMPANY_ID_COL = "fcoid";
const COMPANY_NAME_COL = "fconame";

// VB FillTree: ORDER BY fAccountLevel, fAccountID
export const getAccountTree = async (coId: string): Promise<TreeAccount[]> => {
  const { rows } = await pool.query(
    `SELECT faccountid      AS "accountId",
            faccountname    AS "accountName",
            faccountgroupid AS "accountGroupId",
            faccountlevel   AS "accountLevel"
       FROM dbo.tblaccount
      WHERE fcoid = $1
      ORDER BY faccountlevel, faccountid`,
    [coId],
  );
  return rows;
};

// Does what SP_rptAccount 'D' + 'I' (per checked node) + 'G' does, without the
// dbo.tblrptaccount work table: the checked ids come with the request and the
// rows are read straight from tblaccount, indented by level, ordered by id.
// Nothing is written, so two sessions of the same user cannot mix their rows
// (the procedure keeps one set of rows per user id).
export const getReportRows = async (
  coId: string,
  accountIds: unknown,
): Promise<ReportRow[]> => {
  if (!Array.isArray(accountIds)) {
    throw new Error("accountIds must be a list");
  }

  const ids = [
    ...new Set(
      accountIds
        .map((id) => String(id ?? "").trim())
        .filter((id) => id !== "" && id.length <= ACCOUNT_ID_MAX),
    ),
  ];

  if (ids.length === 0) return [];
  if (ids.length > MAX_IDS) throw new Error("Too many accounts selected");

  const { rows } = await pool.query(
    `SELECT faccountid                  AS "accountId",
            faccountname                AS "accountName",
            faccountlevel               AS "accountLevel",
            COALESCE(fhavecc, false)    AS "haveCC"
       FROM dbo.tblaccount
      WHERE fcoid = $1
        AND faccountid = ANY($2::varchar[])
      ORDER BY faccountid`,
    [coId, ids],
  );
  return rows.map((r) => ({
    ...r,
    accountName: indentName(r.accountName, Number(r.accountLevel)),
  }));
};

// The company name printed at the top of the report.
// A failure here must not stop the report, so it logs and returns "".
export const getCompanyName = async (coId: string): Promise<string> => {
  try {
    const { rows } = await pool.query(
      `SELECT ${COMPANY_NAME_COL} AS name
         FROM ${COMPANY_TABLE}
        WHERE ${COMPANY_ID_COL} = $1
        LIMIT 1`,
      [coId],
    );
    return String(rows[0]?.name ?? "").trim();
  } catch (error) {
    console.error("getCompanyName error (check COMPANY_* constants):", error);
    return "";
  }
};