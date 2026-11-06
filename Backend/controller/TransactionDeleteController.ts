import { Request, Response } from "express";
import pool from "../DB/db.js";

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    await pool.query("call dbo.sp_deletetransactions()");
    res
      .status(200)
      .json({ success: true, message: "Transactions deleted successfully" });
  } catch (error) {
    console.error("Error deleting transactions:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete transactions" });
  }
};
