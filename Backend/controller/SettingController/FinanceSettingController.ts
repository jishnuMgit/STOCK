import { Request, Response } from "express";

import pool from "../../DB/db.js";
import {
  getFinSettingService,
  saveFinSettingService,
  deleteFinSettingRowService,
  type FinRow,
  type FinSettingRowPayload,
} from "../../services/SettingServices/financeSettingService.js";
import { UserAudit } from "../../utils/UserAudit.js";
import {
  mapRows,
  parameterListKeys,
  finAccountListKeys,
} from "../../utils/responseKeys.js";

/* =========================================================
   GET PARAMETER LIST (lkpParameterType dropdown - the finance
   parameters of the logged-in company, in position order)
========================================================= */

export const getParameterList = async (
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
      FROM dbo.fillfinsetup($1)
      `,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      data: mapRows(result.rows, parameterListKeys),
    });
  } catch (error: unknown) {
    console.error("getParameterList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load parameter list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET ACCOUNT LIST (lkpAccountID / lkpAccountName dropdowns -
   posting-level and group accounts of the logged-in company,
   lkpGPH tells whether each one is a G, H or P account)
========================================================= */

export const getAccountList = async (
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
      FROM dbo.fillfinaccount($1)
      `,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      data: mapRows(result.rows, finAccountListKeys),
    });
  } catch (error: unknown) {
    console.error("getAccountList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load account list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET FINANCE SETTING (the saved parameter -> account rows
   that fill the grid when the page opens)
========================================================= */

export const getFinSetting = async (
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

    // the service already returns the form field names
    const rows = await getFinSettingService(String(PstrCoID));

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error: unknown) {
    console.error("getFinSetting error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load finance setting",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   NAMES FOR THE AUDIT NOTE
   Turns a parameter type (A/S) into its name and an account
   id (1101001) into "1101001 PETTY CASH".
========================================================= */

const loadNameLookups = async (PstrCoID: string, rows: FinRow[]) => {
  const accountIds = [
    ...new Set(
      rows
        .map((row) => row.lkpAccountID)
        .filter((id): id is string => !!id)
    ),
  ];

  const accountNameById = new Map<string, string>();

  if (accountIds.length > 0) {
    const accountResult = await pool.query(
      `SELECT faccountid, faccountname FROM dbo.tblaccount WHERE fcoid = $1 AND faccountid = ANY($2)`,
      [PstrCoID, accountIds]
    );

    for (const row of accountResult.rows) {
      accountNameById.set(row.faccountid, String(row.faccountname).trim());
    }
  }

  const parameterResult = await pool.query(
    `SELECT ftype, fname FROM dbo.fillfinsetup($1)`,
    [PstrCoID]
  );

  const parameterNameByType = new Map<string, string>();

  for (const row of parameterResult.rows) {
    parameterNameByType.set(row.ftype, String(row.fname).trim());
  }

  return {
    parameter: (type: string) => parameterNameByType.get(type) ?? type,
    account: (id: string | null) =>
      id ? `${id} ${accountNameById.get(id) ?? ""}`.trim() : "(none)",
  };
};

/* =========================================================
   SAVE FINANCE SETTING (the whole grid: new rows -> S1,
   changed rows -> M1)
========================================================= */

export const saveFinSetting = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      rows,
    }: {
      PstrCoID: string;
      PstrYear: string;
      PstrUserID: string;
      rows: FinSettingRowPayload[];
    } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        message: "There is no information for saving.",
      });
    }

    const result = await saveFinSettingService(PstrCoID, rows, PstrUserID);

    if (!result.changed) {
      return res.status(200).json({
        success: true,
        message: "No changes to save",
      });
    }

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // the note lists every added / changed row
    // =====================================================

    try {
      const { inserted, updated } = result;

      const { parameter, account } = await loadNameLookups(PstrCoID, [
        ...inserted,
        ...updated.flatMap(({ before, after }) => [before, after]),
      ]);

      const parts: string[] = [];

      for (const row of inserted) {
        parts.push(
          `Added ${parameter(row.lkpParameterType)} -> ${account(row.lkpAccountID)}`
        );
      }

      for (const { before, after } of updated) {
        const changes: string[] = [];

        if (before.lkpParameterType !== after.lkpParameterType) {
          changes.push(
            `Parameter ${parameter(before.lkpParameterType)} -> ${parameter(after.lkpParameterType)}`
          );
        }

        if ((before.lkpAccountID ?? null) !== (after.lkpAccountID ?? null)) {
          changes.push(
            `Account ${account(before.lkpAccountID)} -> ${account(after.lkpAccountID)}`
          );
        }

        parts.push(`Changed ${parameter(before.lkpParameterType)} (${changes.join("; ")})`);
      }

      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        null,
        "Finance Setting",
        updated.length === 0 ? "S" : "M",
        PstrUserID,
        `Finance setting: ${parts.join("; ")}`
      );
    } catch (auditError: unknown) {
      // the settings are already saved - don't fail the request
      // over an audit-logging problem, just log it
      console.error("UserAudit error (saveFinSetting):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Finance setting saved successfully",
    });
  } catch (error: unknown) {
    console.error("saveFinSetting error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Finance setting could not be saved",
    });
  }
};

/* =========================================================
   DELETE ONE ROW (mode 'D1') - the X button on a grid row
========================================================= */

export const deleteFinSettingRow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      txtOriginalSlNo,
      lkpOriginalParameterType,
    }: {
      PstrCoID: string;
      PstrYear: string;
      PstrUserID: string;
      txtOriginalSlNo: number;
      lkpOriginalParameterType: string;
    } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (txtOriginalSlNo == null || !lkpOriginalParameterType) {
      return res.status(400).json({
        success: false,
        message: "The row to delete is required",
      });
    }

    const deleted = await deleteFinSettingRowService(
      PstrCoID,
      Number(txtOriginalSlNo),
      lkpOriginalParameterType,
      PstrUserID
    );

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // =====================================================

    try {
      const { parameter, account } = await loadNameLookups(PstrCoID, [deleted]);

      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        null,
        "Finance Setting",
        "D",
        PstrUserID,
        `Finance setting: Removed ${parameter(deleted.lkpParameterType)} -> ${account(deleted.lkpAccountID)}`
      );
    } catch (auditError: unknown) {
      // the row is already deleted - don't fail the request
      // over an audit-logging problem, just log it
      console.error("UserAudit error (deleteFinSettingRow):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Finance setting deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteFinSettingRow error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Finance setting could not be deleted",
    });
  }
};
