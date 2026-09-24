import { Request, Response, NextFunction } from "express";
import pool from "../DB/db.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    userType: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessionToken = req.cookies?.sessionToken;

    if (!sessionToken) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    /* =====================================================
       GET SESSION
    ===================================================== */

    const sessionResult = await pool.query(
      `
      SELECT fuserid
      FROM dbo.tblusersession
      WHERE fsessiontoken = $1
      `,
      [sessionToken],
    );

    if (sessionResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Session expired or invalid",
      });
      return;
    }

    const userId = sessionResult.rows[0].fuserid;

    /* =====================================================
       GET USER TYPE
    ===================================================== */

    const userResult = await pool.query(
      `
      SELECT
        fuserid,
        fusertype,
        fuserstatus
      FROM dbo.tbluserlogin
      WHERE fuserid = $1
      `,
      [userId],
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "User does not exist",
      });
      return;
    }

    const user = userResult.rows[0];

    /* =====================================================
       USER STATUS
    ===================================================== */

    if (user.fuserstatus === false) {
      res.status(403).json({
        success: false,
        message: "This User is Idle",
      });
      return;
    }

    /* =====================================================
       ATTACH USER TO REQUEST
    ===================================================== */

    req.user = {
      userId: user.fuserid,
      userType: user.fusertype,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
