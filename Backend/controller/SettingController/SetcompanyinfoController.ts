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
    const result = await pool.query(
      `
      SELECT *
      FROM dbo.filllookupcompanyname()
      `
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
    const PstrUserID = process.env.PstrUserID || "ADMIN";

    const {
      lkpCoName,
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

    await updateCompanyInfoService({
      coId: lkpCoName,
      coName: txtCoName || null,
      coNameAr: txtCoName_AR || null,
      coNameQr: txtCoName_QR || null,
      coNameShort: txtCoName_Short || null,
      coVatNo: txtCoVATNo || null,
      coVatNoAr: txtCoVATNo_AR || null,
      coAddress1: txtCoAddress1 || null,
      coAddress2: txtCoAddress2 || null,
      coAddress3: txtCoAddress3 || null,
      coAddress4: txtCoAddress4 || null,
      coAddress1Ar: txtCoAddress1_AR || null,
      coAddress2Ar: txtCoAddress2_AR || null,
      coAddress3Ar: txtCoAddress3_AR || null,
      coAddress4Ar: txtCoAddress4_AR || null,
      coStatus: txtCoStatus || null,
      userId: PstrUserID,
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
