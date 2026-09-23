import { Request, Response } from "express";
import pool from "../DB/db.js";

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
      SELECT fuserpwd, fuserstatus
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

       Old VB: ADMIN always has access; other users are
       checked against dbo.HasCoRight(coId, userId), a
       SQL Server scalar function not yet migrated to
       Postgres. TODO: recreate dbo.hascoright() here once
       we have the SQL Server function definition.
    ===================================================== */

    let hasCompanyRight = true;

    if (userId !== "ADMIN") {
      const companyRightResult = await pool.query(
        `
        SELECT dbo.hascoright($1, $2) AS "hasCoRight"
        `,
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
       SUCCESS
    ===================================================== */

    return res.status(200).json({
      success: true,
      message: "Login successful",

      data: {
        userId,
        companyId,
        year,
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
