
import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "STOCK",
  user: "postgres",
  password: "password1234",
});

pool.on("connect", () => {
  console.log("PostgreSQL connected successfully");
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});

export default pool