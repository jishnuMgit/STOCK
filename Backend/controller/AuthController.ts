import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import pool from "../DB/db.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { decryptPwd } from "../utils/passwordCrypto.js";
import { isUserActive, idleUserMessage } from "../validators/common.js";

/* =========================================================
   LOGIN
   ========================================================= */

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { pstrCOID, PstrYear, PstrUserID, txtPwd } = req.body;

    console.log(req.body, "request ==================== login");

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!pstrCOID) {
      return res.status(400).json({
        success: false,
        message: "Please select a Company",
      });
    }

    if (!PstrYear) {
      return res.status(400).json({
        success: false,
        message: "Please select a Year",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "Please input User ID",
      });
    }

    if (!txtPwd) {
      return res.status(400).json({
        success: false,
        message: "Please input Password",
      });
    }

    /* =====================================================
       GET USER (password + status in one lookup)
    ===================================================== */

    const userResult = await pool.query(
      `
  SELECT
    fuserid,
    fuserpwd,
    fuserstatus,
    fusertype
  FROM dbo.tbluserlogin
  WHERE fuserid = $1
  `,
      [PstrUserID],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User does not exist",
      });
    }

    const user = userResult.rows[0];

    const encryptedPassword = userResult.rows[0]?.fuserpwd;

    if (!encryptedPassword) {
      return res.status(401).json({
        success: false,
        message: "User does not exist",
      });
    }

    const userPwdSeed = Number(process.env.USER_PWD_SEED);

    if (!Number.isFinite(userPwdSeed)) {
      return res.status(500).json({
        success: false,
        message: "User password seed is not configured",
      });
    }

    const decryptedPassword = decryptPwd(encryptedPassword, userPwdSeed);

    if (decryptedPassword !== txtPwd) {
      return res.status(401).json({
        success: false,
        message: "Please input the Password correctly",
      });
    }

    /* =====================================================
       USER STATUS
    ===================================================== */

    // fuserstatus is 'A' (active) or 'I' (idle) - not true / false.
    // ADMIN is always active (same rule as the old form's GetUserStatus).
    const userRow = userResult.rows[0];

    if (!isUserActive(userRow?.fuserid, userRow?.fuserstatus)) {
      return res.status(403).json({
        success: false,
        message: idleUserMessage(userRow?.fuserid ?? PstrUserID),
      });
    }

    /* =====================================================
       COMPANY ACCESS
    ===================================================== */

    // An Admin User (type AU, ADMIN included) can enter every company; anyone
    // else needs a row in tbluserpermission for it (dbo.hascoright).
    let hasCompanyRight = true;

    if (user.fusertype !== "AU") {
      const companyRightResult = await pool.query(
        `SELECT dbo.hascoright($1, $2) AS "hasCoRight"`,
        [pstrCOID, PstrUserID],
      );

      hasCompanyRight = companyRightResult.rows[0]?.hasCoRight > 0;
    }

    if (!hasCompanyRight) {
      return res.status(403).json({
        success: false,
        message: `User '${PstrUserID}' does not have access to the selected Company`,
      });
    }

    /* =====================================================
       DEFAULT BRANCH
       Not used anywhere downstream — fbranchid is written but
       never read (authMiddleware only selects fuserid), and
       the response's branchId field is commented out below.
       SetDocumentNo does its own separate live lookup instead.
    ===================================================== */

    // const defaultBranchResult = await pool.query(
    //   `SELECT dbo.getuserdefbranch($1, $2) AS "defBranch"`,
    //   [companyId, userId],
    // );

    // const defaultBranchId: string =
    //   defaultBranchResult.rows[0]?.defBranch ?? "";

    /* =====================================================
       CHECK ACTIVE SESSION (only count non-expired ones)
    ===================================================== */

    // Opportunistically clean up any expired session for this user first
    await pool.query(
      `DELETE FROM dbo.tblusersession WHERE fuserid = $1 AND fexpiresat <= now()`,
      [PstrUserID],
    );

    const existingSession = await pool.query(
      `
  SELECT fsessionid
  FROM dbo.tblusersession
  WHERE fuserid = $1 AND fexpiresat > now()
  `,
      [PstrUserID],
    );

    if (existingSession.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This user is already logged in on another device",
      });
    }

    /* =====================================================
       CREATE SESSION
    ===================================================== */

    const sessionToken = uuidv4();

    const sessionResult = await pool.query(
      `
  INSERT INTO dbo.tblusersession (fuserid, fsessiontoken, fcoid)
  VALUES ($1, $2, $3)
  ON CONFLICT (fuserid) DO UPDATE
    SET fsessiontoken = EXCLUDED.fsessiontoken,
        fcoid         = EXCLUDED.fcoid,
        fcreatedat    = now(),
        flastactivity = now(),
        fexpiresat    = now() + interval '24 hours'
    WHERE dbo.tblusersession.fexpiresat IS NULL
       OR dbo.tblusersession.fexpiresat <= now()
  RETURNING fsessionid
  `,
      [PstrUserID, sessionToken, pstrCOID],
    );

    // 0 rows = a live session already exists for this user
    if (sessionResult.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: "This user is already logged in on another device",
      });
    }

    /* =====================================================
       SET SESSION COOKIE
    ===================================================== */

    res.cookie("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    /* =====================================================
       SUCCESS
    ===================================================== */

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        txtUserID: user.fuserid,
        pstrCOID,
        PstrYear,
        userType: user.fusertype,
        //branchId: defaultBranchId,
      },
    });
  } catch (error: unknown) {
    console.error("Login controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: req.user.userId,
        userType: req.user.userType,
      },
    });
  } catch (error: unknown) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
};

export const logout = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { sessionToken } = req.cookies;

    if (sessionToken) {
      await pool.query(
        `DELETE FROM dbo.tblusersession WHERE fsessiontoken = $1`,
        [sessionToken],
      );
    }

    res.clearCookie("sessionToken");
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (error: unknown) {
    console.error("Logout controller error:", error);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
};
