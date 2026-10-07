import { Request, Response } from "express";

import pool from "../../DB/db.js";
import {
  getCompanyInfoService,
  updateCompanyInfoService,
} from "../../services/SettingServices/setcompanyInfoService.js";
import { mapKeys, mapRows, companyListKeys, companyDetailKeys } from "../../utils/responseKeys.js";
import { validateSetCompanyInfo } from "../../validators/SetCompanyInfoValidator.js";

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
      data: mapRows(result.rows, companyListKeys),
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

    // validators/SetCompanyInfoValidator.ts - mode "G"
    const check = await validateSetCompanyInfo("G", { lkpCoName });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
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
      data: mapKeys(data, companyDetailKeys),
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
      txtCoStatus,
    } = req.body;

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // validators/SetCompanyInfoValidator.ts - mode "M": idle user, company,
    // names, VAT numbers - the first rule that fails stops the save
    const check = await validateSetCompanyInfo("M", {
      lkpCoName,
      PstrUserID,
      txtCoName_AR,
      txtCoName_QR,
      txtCoName_Short,
      txtCoVATNo,
      txtCoVATNo_AR,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
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
