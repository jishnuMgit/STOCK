import { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import { validateStaffPage } from "../../../validators/StaffPageValidator.js";
import {
  getStaffPageService,
  saveStaffPageService,
  haveStaffTransService,
  type StaffRowPayload,
  type StaffDeletedRowPayload,
} from "../../../services/Purchase/Setup/staffPageService.js";
import { mapRows, staffGridKeys } from "../../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Staff page
const MENU_ID = "010204";

/* =========================================================
   GET STAFF LIST (the grid rows - the company's staff by id)
========================================================= */

export const getStaffList = async (
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

    const data = await getStaffPageService(String(PstrCoID));

    return res.status(200).json({
      success: true,
      data: mapRows(data, staffGridKeys),
    });
  } catch (error: unknown) {
    console.error("getStaffList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load staff list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   HAVE TRANS - "is this staff member already used?" . The page asks it when a saved staff id is entered.
========================================================= */

export const haveStaffTrans = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, txtOriginalStaffID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!txtOriginalStaffID) {
      return res.status(400).json({
        success: false,
        message: "Staff ID is required",
      });
    }

    return res.status(200).json({
      success: true,
      data: await haveStaffTransService(
        String(PstrCoID),
        String(txtOriginalStaffID)
      ),
    });
  } catch (error: unknown) {
    console.error("haveStaffTrans error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check the staff member",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE STAFF (the Modify button)
   mode 'D' staff removed from the grid, 'M' changed, 'S' new
========================================================= */

export const saveStaff = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      rows = [],
      deletedRows = [],
    }: {
      PstrCoID: string;
      PstrYear: string;
      PstrUserID: string;
      rows: (StaffRowPayload & { txtGridRow?: number })[];
      deletedRows: StaffDeletedRowPayload[];
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

    // validators/StaffPageValidator.ts: idle user, something to save, then
    // every staff member with an id and a name, within the lengths and not
    // entered twice - the first rule that fails stops the save
    const check = await validateStaffPage({ PstrUserID, rows, deletedRows });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    // Save (S) when the company has no staff yet, Modify (M) when it already
    // has - each needs its own button right. The user comes from the session
    // (authenticate), not from the request body.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const saved = await getStaffPageService(PstrCoID);
    const wantedMode = saved.length > 0 ? "M" : "S";

    if (!(await hasButtonRight(req.user, MENU_ID, wantedMode))) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${wantedMode === "M" ? "Modify" : "Save"}.`,
        field: "txtStaffID-0",
      });
    }

    // removing a staff member: only an Admin User (type AU) may, whatever
    // rights a Restricted User was given; the Delete right is checked too
    // (the old CanDeleteGrid), and a staff member that is already used cannot go
    // (the old HaveTrans)
    if (deletedRows.length > 0) {
      if (req.user.userType !== "AU") {
        return res.status(403).json({
          success: false,
          message: "Only an Admin User can delete staff.",
          field: "txtStaffID-0",
        });
      }

      if (!(await hasButtonRight(req.user, MENU_ID, "D"))) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to Delete.",
          field: "txtStaffID-0",
        });
      }

      for (const row of deletedRows) {
        if (await haveStaffTransService(PstrCoID, row.txtOriginalStaffID)) {
          return res.status(409).json({
            success: false,
            message: `You can't delete. Transactions already entered with this Staff '${row.txtOriginalStaffID}'`,
            field: "txtStaffID-0",
          });
        }
      }
    }

    // a staff id that is already used cannot be changed (the old HaveTrans
    // check on the OLD id; the name and the flags may still change)
    for (const [position, row] of rows.entries()) {
      const txtOriginalStaffID = (row.txtOriginalStaffID ?? "").trim();

      if (txtOriginalStaffID !== "" && txtOriginalStaffID !== row.txtStaffID.trim()) {
        if (await haveStaffTransService(PstrCoID, txtOriginalStaffID)) {
          return res.status(409).json({
            success: false,
            message: `You can't Modify. Transactions already entered with this Staff '${txtOriginalStaffID}'`,
            field: `txtStaffID-${Number.isInteger(Number(row.txtGridRow)) ? row.txtGridRow : position}`,
          });
        }
      }
    }

    const result = await saveStaffPageService(
      PstrCoID,
      rows.map((row) => ({
        txtStaffID: row.txtStaffID,
        txtStaffName: row.txtStaffName,
        chkIsPurchase: !!row.chkIsPurchase,
        chkIsSales: !!row.chkIsSales,
        txtOriginalStaffID: row.txtOriginalStaffID ?? null,
      })),
      deletedRows,
      PstrUserID
    );

    if (!result.anything) {
      return res.status(200).json({
        success: true,
        message: "No changes to save",
      });
    }

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // the note lists every added / changed / deleted staff member
    // =====================================================

    try {
      const yesNo = (value: boolean) => (value ? "Yes" : "No");

      const parts: string[] = [
        ...result.inserted.map(
          (after) =>
            `Added '${after.txtStaffID}' ${after.txtStaffName} (Purchase ${yesNo(after.chkIsPurchase)}, Sales ${yesNo(after.chkIsSales)})`
        ),
        ...result.changed.map(({ before, after }) => {
          const changes: string[] = [];

          if (after.txtStaffID !== before.fstaffid) {
            changes.push(`ID ${before.fstaffid} -> ${after.txtStaffID}`);
          }

          if (after.txtStaffName !== (before.fstaffname ?? "")) {
            changes.push(`Name ${before.fstaffname ?? ""} -> ${after.txtStaffName}`);
          }

          if (after.chkIsPurchase !== before.fispurchase) {
            changes.push(
              `Purchase ${yesNo(before.fispurchase)} -> ${yesNo(after.chkIsPurchase)}`
            );
          }

          if (after.chkIsSales !== before.fissales) {
            changes.push(
              `Sales ${yesNo(before.fissales)} -> ${yesNo(after.chkIsSales)}`
            );
          }

          return `Changed '${before.fstaffid}' (${changes.join("; ")})`;
        }),
        ...result.deleted.map(
          (row) => `Deleted '${row.fstaffid}' ${row.fstaffname ?? ""}`.trim()
        ),
      ];

      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        null,
        "Staff",
        // only new staff: S - only removals: D - anything else: M
        result.changed.length === 0 && result.deleted.length === 0
          ? "S"
          : result.inserted.length === 0 && result.changed.length === 0
            ? "D"
            : "M",
        PstrUserID,
        `Staff: ${parts.join("; ")}`
      );
    } catch (auditError: unknown) {
      // the staff are already saved - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (saveStaff):", auditError);
    }

    return res.status(200).json({
      success: true,
      message:
        wantedMode === "M"
          ? "Staff modified successfully"
          : "Staff saved successfully",
      mode: wantedMode,
    });
  } catch (error: unknown) {
    console.error("saveStaff error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Staff could not be saved",
    });
  }
};
