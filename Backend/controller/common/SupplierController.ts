import { Request, Response } from "express";
import pool from "../../DB/db.js";
import { mapRows, supplierLookupKeys } from "../../utils/responseKeys.js";

/* =========================================================
   Shared helper: runs one of the supplier lookup functions.
   fnName is a constant from this file (never request data),
   so building it into the SQL is safe.
========================================================= */

const runSupplierLookup = async (
  req: Request,
  res: Response,
  fnName: "filllookupsupplierid" | "filllookupsuppliername",
  label: string,
): Promise<Response> => {
  try {
    const { PstrCoID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const result = await pool.query(`SELECT * FROM dbo.${fnName}($1)`, [
      String(PstrCoID),
    ]);

    return res.status(200).json({
      success: true,
      data: mapRows(result.rows, supplierLookupKeys),
    });
  } catch (error: unknown) {
    console.error(`${label} error:`, error);

    return res.status(500).json({
      success: false,
      message: "Failed to load supplier list",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* Supplier ID dropdown: sorted by supplier ID (dbo.filllookupsupplierid) */
export const getSupplierLookupById = (
  req: Request,
  res: Response,
): Promise<Response> =>
  runSupplierLookup(req, res, "filllookupsupplierid", "getSupplierLookupById");

/* Supplier Name dropdown: sorted by supplier name (dbo.filllookupsuppliername) */
export const getSupplierLookupByName = (
  req: Request,
  res: Response,
): Promise<Response> =>
  runSupplierLookup(
    req,
    res,
    "filllookupsuppliername",
    "getSupplierLookupByName",
  );
