import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
const pool = new Pool({
  host: process.env.DBHOST,
  port: Number(process.env.DBPORT),
  database: process.env.DATABASE,
  user: process.env.DBUSER,
  password: process.env.PASSWORD,
});
const t = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='dbo' AND (table_name ILIKE '%permission%' OR table_name ILIKE '%branch%' OR table_name ILIKE '%right%')
  ORDER BY table_name
`);
console.log(t.rows);
await pool.end();
