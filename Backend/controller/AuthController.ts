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

  // Old VB code:
  // For intCtr = 1 To Len(strEncryptedPwd) Step 5

  for (let i = 0; i < encryptedPwd.length; i += 5) {
    // Take first 4 characters
    // Ignore 5th random character
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
   Same logic as old VB EncryptPwd()
   ========================================================= */

const encryptPwd = (password: string, userPwdSeed: number): string => {
  if (!password) {
    return "";
  }

  let encryptedPwd = "";

  for (const char of password) {
    const asciiValue = char.charCodeAt(0);

    // VB:
    // Format(Asc(strOneChar) + gUserPwdSeed, "0000")

    const formattedValue = String(asciiValue + userPwdSeed).padStart(4, "0");

    // VB:
    // CInt(Rnd() * 9)

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
    const {
      companyId,
      year,
      userId,
      password,
      // language,
      // changePassword,
      // newPassword,
      // confirmPassword,
    } = req.body;

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

    /* =====================================================
       COMPANY USER / ADMIN LOGIN
       (Disabled for now — depends on changePassword flow)
    ===================================================== */

    // if (!userId && !password && changePassword === true) {
    //   const companyPassword = process.env.COMPANY_PASSWORD;
    //
    //   if (companyPassword && newPassword === companyPassword) {
    //     return res.status(200).json({
    //       success: true,
    //       message: "Login successful",
    //       user: {
    //         userId: "ADMIN",
    //         companyId,
    //         year,
    //         language: language || null,
    //         isCompanyUser: true,
    //       },
    //     });
    //   }
    // }

    /* =====================================================
       USER ID
    ===================================================== */

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Please input User ID",
      });
    }

    /* =====================================================
       PASSWORD
    ===================================================== */

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please input Password",
      });
    }

    /* =====================================================
       LANGUAGE
       (Disabled for now)
    ===================================================== */

    // if (!language) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Please select Language",
    //   });
    // }

    /* =====================================================
       GET USER PASSWORD
    ===================================================== */

    const userPasswordResult = await pool.query(
      `
      SELECT *
      FROM dbo.getuserpwd($1)
      `,
      [userId],
    );

    if (userPasswordResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User does not exist",
      });
    }

    /* =====================================================
       GET ENCRYPTED PASSWORD
    ===================================================== */

    const encryptedPassword =
      userPasswordResult.rows[0]?.getuserpwd ??
      userPasswordResult.rows[0]?.fpwd ??
      userPasswordResult.rows[0]?.password;

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

    const userStatusResult = await pool.query(
      `
      SELECT *
      FROM dbo.getuserstatus($1)
      `,
      [userId],
    );

    const userStatus =
      userStatusResult.rows[0]?.getuserstatus ??
      userStatusResult.rows[0]?.fstatus ??
      userStatusResult.rows[0]?.isactive;

    if (userStatus === false) {
      return res.status(403).json({
        success: false,
        message: "This User is Idle",
      });
    }

    /* =====================================================
       COMPANY ACCESS
    ===================================================== */

    const companyRightResult = await pool.query(
      `
      SELECT *
      FROM dbo.hascoright($1, $2)
      `,
      [companyId, userId],
    );

    const hasCompanyRight =
      companyRightResult.rows[0]?.hascoright ??
      companyRightResult.rows[0]?.result ??
      companyRightResult.rows[0]?.hasright;

    if (hasCompanyRight === false) {
      return res.status(403).json({
        success: false,
        message: `User '${userId}' does not have access to the selected Company`,
      });
    }

    /* =====================================================
       CHANGE PASSWORD
       (Disabled for now)
    ===================================================== */

    // if (changePassword === true) {
    //   if (!newPassword) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Please input Password",
    //     });
    //   }
    //
    //   if (!confirmPassword) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Please input the Confirm Password",
    //     });
    //   }
    //
    //   if (newPassword !== confirmPassword) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Please input the Confirm Password correctly",
    //     });
    //   }
    //
    //   if (newPassword.length < 6) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Password must be at least 6 characters",
    //     });
    //   }
    //
    //   const encryptedNewPassword = encryptPwd(newPassword, userPwdSeed);
    //
    //   await pool.query(
    //     `
    //     SELECT *
    //     FROM dbo.updateuserpassword($1, $2)
    //     `,
    //     [userId, encryptedNewPassword],
    //   );
    // }

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
        // language,
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
