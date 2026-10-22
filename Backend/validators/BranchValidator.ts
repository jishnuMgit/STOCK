import pool from "../DB/db.js";
import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   ADMINISTRATION > BRANCH - validations (the old grdvBranch_ValidateRow, and
   what the server must check again). The first rule that fails is returned,
   with the field to put the cursor on (the element id / name on the page).

   Only the changed rows are sent. A saved row is a change of the name or the
   position of a branch that exists (its ID is never changed); a new row is a
   branch that does not.
   Uniqueness is checked on the branches AS THEY WILL BE after the save (the
   branches now, with the sent rows put over them).
========================================================= */

const MAX_ID_LENGTH = 3;
const MAX_NAME_LENGTH = 40;
const MAX_POSITION_NO = 32767; // smallint

export async function validateAdministrationBranch(data: {
  PstrCoID?: unknown;
  PstrUserID?: unknown;
  rows?: unknown;
  // the branches taken out of the list on the screen (deleted by this save)
  deletedRows?: unknown;
}): Promise<ValidationResult> {
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "btnSave", 403);
  }

  const PstrCoID = String(data.PstrCoID ?? "").trim();

  const companyResult = await pool.query(
    `SELECT 1 FROM dbo.tblcompany WHERE fcoid = $1`,
    [PstrCoID]
  );

  if (companyResult.rowCount === 0) {
    return failed(`Company '${PstrCoID}' not found`, "txtCompany", 404);
  }

  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  const deletedRows = Array.isArray(data.deletedRows)
    ? (data.deletedRows as Record<string, unknown>[])
    : [];

  if (rows.length === 0 && deletedRows.length === 0) {
    return failed("There is no data to save", "btnSave");
  }

  // ---------- each row on its own ----------

  for (const row of rows) {
    const id = String(row.txtBrID ?? "").trim();
    const name = String(row.txtBrName ?? "").trim();

    if (isNullOrEmpty(id)) {
      return failed("Please enter the 'Branch ID'", "txtBrID");
    }

    if (id.length > MAX_ID_LENGTH) {
      return failed(
        `The 'Branch ID' can have at most ${MAX_ID_LENGTH} characters`,
        "txtBrID"
      );
    }

    if (isNullOrEmpty(name)) {
      return failed(`Please enter the 'Branch' name of '${id}'`, "txtBrName");
    }

    if (name.length > MAX_NAME_LENGTH) {
      return failed(
        `The 'Branch' name can have at most ${MAX_NAME_LENGTH} characters`,
        "txtBrName"
      );
    }

    const position = String(row.txtPositionNo ?? "").trim();

    if (
      position !== "" &&
      (!/^\d+$/.test(position) || Number(position) > MAX_POSITION_NO)
    ) {
      return failed(
        `The 'Position No.' must be a whole number from 0 to ${MAX_POSITION_NO}`,
        "txtPositionNo"
      );
    }
  }

  // ---------- the branches as they will be after the save ----------

  const existingResult = await pool.query(
    `SELECT fbrid, fbrname FROM dbo.tblbranch WHERE fcoid = $1`,
    [PstrCoID]
  );

  // key = the id in lower case (the old SQL Server compared without case)
  const after = new Map<string, { id: string; name: string }>();

  for (const branch of existingResult.rows) {
    after.set(String(branch.fbrid).toLowerCase(), {
      id: branch.fbrid,
      name: String(branch.fbrname ?? ""),
    });
  }

  // the branches taken out on the screen: they must exist, and they are gone
  // before the rows are saved (a new row may use their ID or name)
  for (const deleted of deletedRows) {
    const deletedId = String(deleted.txtBrID ?? "").trim();

    if (isNullOrEmpty(deletedId)) {
      return failed("The branch to delete is required", "txtBrID");
    }

    if (!after.has(deletedId.toLowerCase())) {
      return failed(`Branch '${deletedId}' not found`, "txtBrID", 404);
    }

    after.delete(deletedId.toLowerCase());
  }

  const sent = new Set<string>();

  for (const row of rows) {
    const id = String(row.txtBrID).trim();
    const key = id.toLowerCase();
    const name = String(row.txtBrName).trim();

    // the same Branch ID twice in the rows
    if (sent.has(key)) {
      return failed("'Branch ID' already exists", "txtBrID");
    }

    sent.add(key);

    if (row.chkSaved === true) {
      // a saved row is a branch that exists: only its name / position change
      if (!after.has(key)) {
        return failed(`Branch '${id}' not found`, "txtBrID", 404);
      }
    } else if (after.has(key)) {
      return failed("'Branch ID' already exists", "txtBrID");
    }

    after.set(key, { id, name });
  }

  // a Branch name can belong to one branch only - checked for the names being
  // saved (a duplicate that is already in the database elsewhere does not stop
  // an unrelated save)
  for (const key of sent) {
    const nameKey = after.get(key)!.name.trim().toLowerCase();

    const sameName = [...after.values()].filter(
      (branch) => branch.name.trim().toLowerCase() === nameKey
    );

    if (sameName.length > 1) {
      return failed("'Branch Name' already exists", "txtBrName");
    }
  }

  return passed;
}
