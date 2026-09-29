import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import IndexRouter from "./routes/index.js";

import pool from "./DB/db.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://187.127.190.192:5173"],
    credentials: true,
  }),
);

// app.get("/test-db", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT NOW()");

//     res.json({
//       success: true,
//       message: "PostgreSQL connected",
//       time: result.rows[0].now,
//     });
//   } catch (error: unknown) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Database connection failed",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

app.use("/api", IndexRouter);

app.listen(5000, "0.0.0.0", () => {
  console.log(`Server running on port 5000`);
});
