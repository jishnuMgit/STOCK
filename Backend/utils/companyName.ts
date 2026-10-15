// utils/companyName.ts
// Shared helpers for the reports (company name printed at the top of a report).
import pool from "../DB/db.js";

// ---- company table (ADJUST if your names differ) ----
// VB objCommon.CoName. To find the real table / column, run:
//   SELECT table_schema, table_name, column_name
//     FROM information_schema.columns
//    WHERE column_name ILIKE '%coname%';
const COMPANY_TABLE = "dbo.tblcompany";
const COMPANY_ID_COL = "fcoid";
const COMPANY_NAME_COL = "fconame";

// A failure here must not stop a report, so it logs and returns "".
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
