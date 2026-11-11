import { Request, Response } from "express";
import pool from "../../DB/db.js";

export const getServerDate = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT dbo.fn_getserverdate() AS "fServerDate"`,
    );
    const serverDate: string = result.rows[0]?.fServerDate ?? "";

    return res.json({ success: true, data: { serverDate } });
  } catch (err) {
    console.error("getServerDate error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get server date" });
  }
};
