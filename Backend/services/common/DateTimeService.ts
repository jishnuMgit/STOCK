import pool from "../../DB/db.js";

type Queryable = { query: (sql: string) => Promise<{ rows: any[] }> };

/* VB objCommon.GetServerDate() -> "YYYY-MM-DD HH:mm:ss" */
export const getServerDate = async (db: Queryable = pool): Promise<string> => {
  const r = await db.query(`SELECT dbo.fn_getserverdate() AS "fServerDate"`);
  return String(r.rows[0]?.fServerDate ?? "");
};
