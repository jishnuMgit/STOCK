import { Request, Response } from "express";
import pool from "../DB/db.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

// ============================================================
// GET /api/customers
// ============================================================

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

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("getCustomerList error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch customer list" });
  }
};

// ============================================================
// GET /api/customers/next-id?accountTypeId=60&accountLevel=3
// Port of VB: GetNextCSAccountID(AccountTypeID, strAccountLevel)
// ============================================================

export const getNextCSAccountId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const accountTypeId = String(req.query.accountTypeId ?? "").trim();
    const level = Number(req.query.accountLevel) + 1; // VB: strAccountLevel + 1

    // gstrCoID in VB -> company from the logged-in session.
    // ADJUST this to however your authMiddleware stores it.
    const companyId = req.user?.companyId;

    if (!accountTypeId) {
      return res
        .status(400)
        .json({ success: false, message: "accountTypeId is required" });
    }

    if (!companyId) {
      return res
        .status(401)
        .json({ success: false, message: "Company not found in session" });
    }

    // VB only handles Case 4
    if (level !== 4) {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported account level" });
    }

    const result = await pool.query(
      `SELECT COALESCE(MAX(fcsaccountid), '0') AS maxid
         FROM dbo.tblaccountcs
        WHERE fcoid = $1
          AND LEFT(fcsaccountid, 2) = $2`,
      [companyId, accountTypeId],
    );

    const maxId = String(result.rows[0].maxid);

    // VB: If Val(Mid(strDummy, 3, 3)) >= 999
    if ((Number(maxId.substring(2, 5)) || 0) >= 999) {
      return res
        .status(409)
        .json({ success: false, message: "Unable to Generate New Account ID" });
    }

    let nextAccountId: string;

    if (maxId === "0") {
      // VB: strDummy = AccountTypeID + "001"
      nextAccountId = `${accountTypeId}001`;
    } else {
      if (!/^\d+$/.test(maxId)) {
        return res.status(500).json({
          success: false,
          message: `Existing account ID "${maxId}" is not numeric`,
        });
      }
      // VB: Val(strDummy) + 1  (padStart keeps any leading zeros)
      nextAccountId = String(Number(maxId) + 1).padStart(maxId.length, "0");
    }

    return res.status(200).json({ success: true, data: { nextAccountId } });
  } catch (error) {
    console.error("getNextCSAccountId error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate next account ID" });
  }
};

// GET /api/customers/parent-accounts
export const getParentAccountReceivables = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await pool.query(
      "SELECT * FROM dbo.fillParentAccountReceivables()",
    );

    const data = result.rows.map((r) => ({
      accountId: r.faccountid,
      accountName: r.faccountname,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("getParentAccountReceivables error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch parent accounts" });
  }
};
