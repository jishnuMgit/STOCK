import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import ReceiptRouter from "./routes/ReceiptRouter.js";
import MatchRouter from "./routes/MatchRouter.js";
import LoginRouter from "./routes/AuthRouter.js";
import CompanyRouter from "./routes/CompanyRouter.js";
import YearRouter from "./routes/YearRouter.js";
import CompanyInfoRouter from "./routes/SetcompanyinfoRouter.js";
import SetDocumentNoRouter from "./routes/SetdocumentnoRouter.js";

import pool from "./DB/db.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

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

app.use("/api/Receipt", ReceiptRouter);
app.use("/api/Match", MatchRouter);
app.use("/api/auth", LoginRouter);
app.use("/api/companies", CompanyRouter);
app.use("/api/years", YearRouter);
app.use("/api/CompanyInfo", CompanyInfoRouter);
app.use("/api/DocumentNo", SetDocumentNoRouter);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
