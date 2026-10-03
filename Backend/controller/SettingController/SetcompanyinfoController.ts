import { Request, Response } from "express";

import pool from "../../DB/db.js";
import {
  getCompanyInfoService,
  updateCompanyInfoService,
} from "../../services/SettingServices/setcompanyInfoService.js";

/* =========================================================
   GET COMPANY LIST (lkpCoName dropdown)
========================================================= */

export const getCompanyList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.filllookupcompanyname($1)
      `,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getCompanyList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load company list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET COMPANY DETAILS (prefill the form, mode 'G')
========================================================= */

export const getCompanyDetails = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { lkpCoName } = req.body;

    if (!lkpCoName) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const data = await getCompanyInfoService(lkpCoName);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("getCompanyDetails error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load company details",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE COMPANY DETAILS (mode 'M')
========================================================= */

export const saveCompanyDetails = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      lkpCoName,
      PstrUserID,
      txtCoName,
      txtCoName_AR,
      txtCoName_QR,
      txtCoName_Short,
      txtCoVATNo,
      txtCoVATNo_AR,
      txtCoAddress1,
      txtCoAddress2,
      txtCoAddress3,
      txtCoAddress4,
      txtCoAddress1_AR,
      txtCoAddress2_AR,
      txtCoAddress3_AR,
      txtCoAddress4_AR,
      txtCoStatus,
    } = req.body;

    if (!lkpCoName) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    await updateCompanyInfoService({
      PstrCoID: lkpCoName,
      txtCoName: txtCoName || null,
      txtCoName_AR: txtCoName_AR || null,
      txtCoName_QR: txtCoName_QR || null,
      txtCoName_Short: txtCoName_Short || null,
      txtCoVATNo: txtCoVATNo || null,
      txtCoVATNo_AR: txtCoVATNo_AR || null,
      txtCoAddress1: txtCoAddress1 || null,
      txtCoAddress2: txtCoAddress2 || null,
      txtCoAddress3: txtCoAddress3 || null,
      txtCoAddress4: txtCoAddress4 || null,
      txtCoAddress1_AR: txtCoAddress1_AR || null,
      txtCoAddress2_AR: txtCoAddress2_AR || null,
      txtCoAddress3_AR: txtCoAddress3_AR || null,
      txtCoAddress4_AR: txtCoAddress4_AR || null,
      txtCoStatus: txtCoStatus || null,
      PstrUserID,
    });

    return res.status(200).json({
      success: true,
      message: "Company info saved successfully",
    });
  } catch (error: unknown) {
    console.error("saveCompanyDetails error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Company info could not be saved",
    });
  }
};
