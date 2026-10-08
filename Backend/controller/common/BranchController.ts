import { Response } from "express";
import pool from "../../DB/db.js";
import { AuthenticatedRequest } from "../../middleware/authMiddleware.js";

/* VB: FillUserBranch -> branches for the Branch combo */
export const getUserBranches = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.companyId;
    const userId = req.user?.userId;

    if (!coId || !userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const result = await pool.query(
      `SELECT fbrname, fbrid
       FROM dbo.filluserbranch($1::varchar, $2::varchar)`,
      [coId, userId],
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error: unknown) {
    console.error("getUserBranches error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch branches" });
  }
};
