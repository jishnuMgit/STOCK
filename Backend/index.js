import express from 'express'
const app = express();
import dotenv from "dotenv";
import ReceiptRouter from './routes/ReceiptRouter.js'
import cors from 'cors'
dotenv.config();
import pool from './DB/db.js'
app.use(express.json());
app.use(cors())
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "PostgreSQL connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});
app.use("/api/Receipt", ReceiptRouter);


app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});