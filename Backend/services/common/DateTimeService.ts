import pool from "../../DB/db.js";

type Queryable = { query: (sql: string) => Promise<{ rows: any[] }> };

/* VB objCommon.GetServerDate() -> "YYYY-MM-DD HH:mm:ss" */
export const getServerDate = async (db: Queryable = pool): Promise<string> => {
  const r = await db.query(`SELECT dbo.fn_getserverdate() AS "fServerDate"`);
  return String(r.rows[0]?.fServerDate ?? "");
};

/* The time of a save / post: the page asks GET /datetime/server-date (the DateTime controller) and sends it as
   `dtpServerDate`, so every row of the transaction carries the same time.

   The value is checked here: it must be "YYYY-MM-DD HH:mm:ss", a real date, and within `toleranceSeconds` (5 minutes) of
   this server's own clock. Anything else - nothing sent, a wrong format, an old or future time - is ignored and the
   server's own time is used, so a wrong value from a page can never write a wrong time. */
const SERVER_DATE_FORMAT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const asUtcMs = (value: string): number => Date.parse(`${value.replace(" ", "T")}Z`);

export const resolveServerDate = async (
  db: Queryable = pool,
  supplied?: unknown,
  toleranceSeconds = 300
): Promise<string> => {
  const serverNow = await getServerDate(db);

  if (typeof supplied !== "string" || !SERVER_DATE_FORMAT.test(supplied)) {
    return serverNow;
  }

  const difference = Math.abs(asUtcMs(supplied) - asUtcMs(serverNow));

  return Number.isFinite(difference) && difference <= toleranceSeconds * 1000
    ? supplied
    : serverNow;
};
