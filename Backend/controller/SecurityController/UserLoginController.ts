import { Request, Response } from "express";

import pool from "../../DB/db.js";
import {
  getUserLoginListService,
  saveUserLoginListService,
  deleteUserLoginRowService,
  type UserLoginRowPayload,
} from "../../services/SecurityServices/userLoginService.js";

/* =========================================================
   ADMIN CHECK
   Only an Admin User (AU) may view or change user logins.
   Returns an error message, or null when the user is allowed.
========================================================= */

const checkAdminUser = async (
  CoID: string,
  userId: string
): Promise<string | null> => {
  const result = await pool.query(
    `SELECT dbo.getusertype($1, $2) AS "userType"`,
    [CoID, userId]
  );

  return result.rows[0]?.userType === "AU"
    ? null
    : "Only an Admin User can manage user logins";
};

/* =========================================================
   GET USER TYPE LIST (lkpUserType dropdown)
========================================================= */

export const getUserTypeList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const result = await pool.query(`SELECT * FROM dbo.fillusertype($1)`, [CoID]);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getUserTypeList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load user type list",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   GET USER STATUS LIST (lkpUserStatus dropdown)
========================================================= */

export const getUserStatusList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const result = await pool.query(`SELECT * FROM dbo.filluserstatus($1)`, [CoID]);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getUserStatusList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load user status list",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   GET USER LOGIN LIST (mode 'G')
========================================================= */

export const getUserLoginList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID, userId } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const notAllowed = await checkAdminUser(String(CoID), String(userId));

    if (notAllowed) {
      return res.status(403).json({ success: false, message: notAllowed });
    }

    const data = await getUserLoginListService(String(CoID));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("getUserLoginList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load user logins",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   SAVE USER LOGIN LIST (mode 'S' new / 'M' existing)
========================================================= */

export const saveUserLoginList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      CoID,
      userId,
      rows,
    }: {
      CoID: string;
      userId: string;
      rows: UserLoginRowPayload[];
    } = req.body;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No user login changes to save",
      });
    }

    const notAllowed = await checkAdminUser(CoID, userId);

    if (notAllowed) {
      return res.status(403).json({ success: false, message: notAllowed });
    }

    await saveUserLoginListService(CoID, rows);

    return res.status(200).json({
      success: true,
      message: "User logins saved successfully",
    });
  } catch (error: unknown) {
    console.error("saveUserLoginList error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "User logins could not be saved",
    });
  }
};

/* =========================================================
   DELETE ONE USER (mode 'D1')
========================================================= */

export const deleteUserLoginRow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      CoID,
      userId,
      txtUserID,
    }: { CoID: string; userId: string; txtUserID: string } = req.body;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!txtUserID) {
      return res.status(400).json({
        success: false,
        message: "User to delete is required",
      });
    }

    const notAllowed = await checkAdminUser(CoID, userId);

    if (notAllowed) {
      return res.status(403).json({ success: false, message: notAllowed });
    }

    if (txtUserID.toUpperCase() === userId.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete the user you are logged in as",
      });
    }

    await deleteUserLoginRowService(CoID, txtUserID);

    return res.status(200).json({
      success: true,
      message: `User '${txtUserID}' deleted successfully`,
    });
  } catch (error: unknown) {
    console.error("deleteUserLoginRow error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "User could not be deleted",
    });
  }
};
