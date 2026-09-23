import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
const pool = new Pool({
  host: process.env.DBHOST,
  port: Number(process.env.DBPORT),
  database: process.env.DATABASE,
  user: "postgres",
  password: process.env.PASSWORD,
});

pool.on("connect", () => {
  console.log("PostgreSQL connected successfully");
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});

export default pool;