import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import pool from "../DB/db.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

/* =========================================================
   PASSWORD DECRYPT
   Converts old encrypted password back to plain password
   ========================================================= */

const decryptPwd = (encryptedPwd: string, userPwdSeed: number): string => {
  if (!encryptedPwd) {
    return "";
  }

  let decryptedPwd = "";

  for (let i = 0; i < encryptedPwd.length; i += 5) {
    const encryptedChar = encryptedPwd.substring(i, i + 4);

    if (encryptedChar.length < 4) {
      continue;
    }

    const asciiValue = parseInt(encryptedChar, 10) - userPwdSeed;

    decryptedPwd += String.fromCharCode(asciiValue);
  }

  return decryptedPwd;
};

/* =========================================================
   PASSWORD ENCRYPT
   (Currently unused — kept for when Change Password is re-enabled)
   ========================================================= */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const encryptPwd = (password: string, userPwdSeed: number): string => {
  if (!password) {
    return "";
  }

  let encryptedPwd = "";

  for (const char of password) {
    const asciiValue = char.charCodeAt(0);
    const formattedValue = String(asciiValue + userPwdSeed).padStart(4, "0");
    const randomNumber = Math.floor(Math.random() * 10);

    encryptedPwd += formattedValue + randomNumber;
  }

  return encryptedPwd;
};

/* =========================================================
   LOGIN
   ========================================================= */

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId, year, userId, password } = req.body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Please select a Company",
      });
    }

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Please select a Year",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Please input User ID",
      });
    }

    if (!password) {
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
      [userId],
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

    if (decryptedPassword !== password) {
      return res.status(401).json({
        success: false,
        message: "Please input the Password correctly",
      });
    }

    /* =====================================================
       USER STATUS
    ===================================================== */

    const userStatus = userResult.rows[0]?.fuserstatus;

    if (userStatus === false) {
      return res.status(403).json({
        success: false,
        message: "This User is Idle",
      });
    }

    /* =====================================================
       COMPANY ACCESS
    ===================================================== */

    let hasCompanyRight = true;

    if (userId !== "ADMIN") {
      const companyRightResult = await pool.query(
        `SELECT dbo.hascoright($1, $2) AS "hasCoRight"`,
        [companyId, userId],
      );

      hasCompanyRight = companyRightResult.rows[0]?.hasCoRight > 0;
    }

    if (!hasCompanyRight) {
      return res.status(403).json({
        success: false,
        message: `User '${userId}' does not have access to the selected Company`,
      });
    }

    /* =====================================================
       DEFAULT BRANCH
    ===================================================== */

    const defaultBranchResult = await pool.query(
      `SELECT dbo.getuserdefbranch($1, $2) AS "defBranch"`,
      [companyId, userId],
    );

    const defaultBranchId: string =
      defaultBranchResult.rows[0]?.defBranch ?? "";

    if (userId !== "ADMIN" && !defaultBranchId) {
      return res.status(403).json({
        success: false,
        message: `User '${userId}' has no branch assigned for the selected Company`,
      });
    }

    /* =====================================================
       CHECK ACTIVE SESSION (only count non-expired ones)
    ===================================================== */

    // Opportunistically clean up any expired session for this user first
    await pool.query(
      `DELETE FROM dbo.tblusersession WHERE fuserid = $1 AND fexpiresat <= now()`,
      [userId],
    );

    const existingSession = await pool.query(
      `
  SELECT fsessionid
  FROM dbo.tblusersession
  WHERE fuserid = $1 AND fexpiresat > now()
  `,
      [userId],
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

    await pool.query(
      `
  INSERT INTO dbo.tblusersession (
    fuserid,
    fsessiontoken,
    fbranchid
  )
  VALUES ($1, $2, $3)
  `,
      [userId, sessionToken, defaultBranchId],
    );

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
        userId: user.fuserid,
        companyId,
        year,
        userType: user.fusertype,
        branchId: defaultBranchId,
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
