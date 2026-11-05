import type { Response } from "express";
import pool from "../../../DB/db.js";
import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import {
  customerDivisionCustomerKeys,
  mapRows,
} from "../../../utils/responseKeys.js";
import {
  ApiError,
  fetchCustomerDivisions,
  haveCustomerDivisionTrans,
  prepareCustomerDivisionSave,
  saveCustomerDivisionChanges,
} from "../../../services/Finance/Setup/CustomerDivisionService.js";

// The Customer Division screen (Finance > Setup > Customer Division). The logged-in company, user and user type come
// from the SESSION (authenticate), never from the request.

const MENU_ID = "110207"; // tblmenu: mnuCustomerDivision

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const noCompany = (res: Response): Response =>
  res.status(401).json({ success: false, message: "Company not found in session" });

/* =====================================================
   LOAD DROPDOWN DATA
   GET /CustomerDivision/getLookups
   -> customers [{ lkpCsAccountID, lkpCsAccountName }]
   The customers that have divisions (dbo.filllookupcustomerdivision), by name: the Customer ID and the Customer Name boxes.
===================================================== */

export const getCustomerDivisionLookups = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const PstrCoID = req.user?.CoID;
    if (!PstrCoID) return noCompany(res);

    const customers = await pool.query(
      `SELECT * FROM dbo.filllookupcustomerdivision($1)`,
      [PstrCoID],
    );

    return res.status(200).json({
      success: true,
      customers: mapRows(customers.rows, customerDivisionCustomerKeys),
      message: "Customer division lookups loaded successfully",
    });
  } catch (error: unknown) {
    console.error("getCustomerDivisionLookups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the customers",
      error: errMsg(error),
    });
  }
};

/* =====================================================
   THE DIVISIONS OF A CUSTOMER
   POST /CustomerDivision/fetchCustomerDivisions   body { lkpCsAccountID }
   -> divisions [{ txtDivisionID, txtDivisionName, txtDivisionName_AR }]
===================================================== */

export const getCustomerDivisions = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const PstrCoID = req.user?.CoID;
    if (!PstrCoID) return noCompany(res);

    const lkpCsAccountID = String(req.body?.lkpCsAccountID ?? "").trim();
    if (!lkpCsAccountID) {
      return res.status(400).json({ success: false, message: "Please select 'Customer'" });
    }

    const divisions = await fetchCustomerDivisions(PstrCoID, lkpCsAccountID);

    return res.status(200).json({ success: true, divisions });
  } catch (error: unknown) {
    console.error("getCustomerDivisions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the divisions",
      error: errMsg(error),
    });
  }
};

/* =====================================================
   DO TRANSACTIONS USE THIS DIVISION? (the old HaveTrans)
   POST /CustomerDivision/used   body { lkpCsAccountID, txtDivisionID }
   -> { used }
===================================================== */

export const checkCustomerDivisionUsed = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const PstrCoID = req.user?.CoID;
    if (!PstrCoID) return noCompany(res);

    const used = await haveCustomerDivisionTrans(
      PstrCoID,
      String(req.body?.lkpCsAccountID ?? "").trim(),
      String(req.body?.txtDivisionID ?? "").trim(),
    );

    return res.status(200).json({ success: true, used });
  } catch (error: unknown) {
    console.error("checkCustomerDivisionUsed error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not check the transactions",
      error: errMsg(error),
    });
  }
};

/* =====================================================
   SAVE / MODIFY / DELETE - only the changed rows, in one transaction
   POST /CustomerDivision/save
   body { lkpCsAccountID,
          inserted: [{ txtDivisionID, txtDivisionName, txtDivisionName_AR }],
          updated:  [{ txtOriginalDivisionID, txtDivisionID, txtDivisionName, txtDivisionName_AR }],
          deleted:  [txtOriginalDivisionID] }
===================================================== */

export const saveCustomerDivisions = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const user = req.user;
    if (!user?.CoID) return noCompany(res);

    const payload = {
      PstrCoID: user.CoID,
      PstrUserID: user.userId,
      lkpCsAccountID: String(req.body?.lkpCsAccountID ?? "").trim(),
      inserted: req.body?.inserted,
      updated: req.body?.updated,
      deleted: req.body?.deleted,
    };

    const changes = prepareCustomerDivisionSave(payload);

    // the buttons of the user, as the page checks them: Save for new rows, Modify for changed rows, Delete for removed rows
    const denied: string[] = [];
    if (changes.inserted.length > 0 && !(await hasButtonRight(user, MENU_ID, "S"))) denied.push("save");
    if (changes.updated.length > 0 && !(await hasButtonRight(user, MENU_ID, "M"))) denied.push("modify");
    if (changes.deleted.length > 0 && !(await hasButtonRight(user, MENU_ID, "D"))) denied.push("delete");

    if (denied.length > 0) {
      return res.status(403).json({
        success: false,
        message: `You don't have the permission to ${denied.join(" / ")}`,
      });
    }

    await saveCustomerDivisionChanges(payload, changes);

    return res.status(200).json({ success: true, message: "Saved" });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    // a rule of the procedure (RAISE EXCEPTION): its message is for the user
    if ((error as { code?: string }).code === "P0001") {
      return res.status(409).json({ success: false, message: errMsg(error) });
    }

    // a value longer than its column (the page and the procedure check it first; this is the last line)
    if ((error as { code?: string }).code === "22001") {
      return res.status(400).json({
        success: false,
        message: "A value is longer than allowed: Division ID 8, Division Name 60, Division Name (Arabic) 60 characters at most",
      });
    }

    console.error("saveCustomerDivisions error:", error);

    return res.status(500).json({
      success: false,
      message: "Not saved, try again",
      error: errMsg(error),
    });
  }
};
