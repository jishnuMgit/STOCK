import { Request, Response } from "express";
import pool from "../DB/db.js";

export const getCustomerList = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM dbo.getcustomerlist()");

    const data = result.rows.map((r) => ({
      csAccountId: r.fcsaccountid,
      csAccountName: r.fcsaccountname,
      cs: r.fcs,
      brId: r.fbrid,
      haveDivision: r.fhavedivision,
      gAccountId: r.fgaccountid,
      gAccountName: r.fgaccountname,
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("getCustomerList error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer list",
    });
  }
};
