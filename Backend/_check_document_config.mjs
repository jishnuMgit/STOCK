import dotenv from "dotenv";
import pg from "pg";

dotenv.config();
const pool = new pg.Pool({
  host: process.env.DBHOST,
  port: Number(process.env.DBPORT),
  database: process.env.DATABASE,
  user: process.env.DBUSER,
  password: process.env.PASSWORD,
});

try {
  const result = await pool.query(
    "SELECT fcoid, fyear, fbrid, fdoctype, fmoduleid, fdocnoprefix, fstartseqno, fseqnolen, fdocnolen, fstrictserialseqno, fseqnoincrementmode, fseqnoresetmode, fprintaftersave, fpositionno FROM dbo.tbldocumentno WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3 AND fdoctype = ANY($4::varchar[]) ORDER BY fdoctype",
    ["01", "2026", "JD", ["BP", "CP", "BR", "CR"]],
  );
  for (const row of result.rows) console.log(JSON.stringify(row));
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'dbo' AND (table_name ILIKE '%payment%' OR table_name ILIKE '%receipt%') ORDER BY table_name",
  );
  console.log("related_tables", JSON.stringify(tables.rows));
  const used = await pool.query(
    "SELECT fdoctype, count(*)::int AS rows, max(fdocno) AS max_docno FROM dbo.tblfintrans WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3 AND fdoctype IN ('BP','CP') GROUP BY fdoctype ORDER BY fdoctype",
    ["01", "2026", "JD"],
  );
  console.log("existing_payment_numbers", JSON.stringify(used.rows));
} finally {
  await pool.end();
}
