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
   ADMINISTRATION > YEAR - validations (what the old form checked, and what
   the server must check again). The first rule that fails is returned, with the
   field to put the cursor on (the element id / name on the page).

   The page sends the whole grid: every open year of every branch of the
   company. A year that is already CLOSED for a branch is never opened again from
   here.
========================================================= */

export async function validateAdministrationYear(data: {
  PstrCoID?: unknown;
  PstrUserID?: unknown;
  rows?: unknown;
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
    return failed(`Company '${PstrCoID}' not found`, "btnSave", 404);
  }

  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  // the old ValidateGrid
  if (rows.length === 0) {
    return failed("There Is No Item For Saving", "btnSave");
  }

  // ---------- each row on its own ----------

  for (const row of rows) {
    const branch = String(row.lkpBranch ?? "").trim();
    const year = String(row.txtYear ?? "").trim();

    if (isNullOrEmpty(branch)) {
      return failed("Please select 'Branch'", "lkpBranch");
    }

    if (isNullOrEmpty(year)) {
      return failed("Please enter 'Year'", "txtYear");
    }

    if (!/^\d{4}$/.test(year)) {
      return failed("The 'Year' must have 4 digits", "txtYear");
    }
  }

  // ---------- the branches are branches of the company ----------

  const branchResult = await pool.query(
    `SELECT fbrid FROM dbo.tblbranch WHERE fcoid = $1`,
    [PstrCoID]
  );

  const branches = new Set(branchResult.rows.map((row) => String(row.fbrid)));

  for (const row of rows) {
    const branch = String(row.lkpBranch).trim();

    if (!branches.has(branch)) {
      return failed(`Branch '${branch}' not found`, "lkpBranch", 404);
    }
  }

  // ---------- the same year twice for a branch ----------

  const seen = new Set<string>();

  for (const row of rows) {
    const key = `${String(row.lkpBranch).trim()}|${Number(row.txtYear)}`;

    if (seen.has(key)) {
      return failed(
        `The Year ${Number(row.txtYear)} is already entered for the Branch ${String(row.lkpBranch).trim()}`,
        "txtYear"
      );
    }

    seen.add(key);
  }

  // ---------- a closed year is not opened again ----------

  const closedResult = await pool.query(
    `
    SELECT fbrid, fyear
    FROM dbo.tblyear
    WHERE fcoid = $1
      AND fyearclosestatus IS DISTINCT FROM 'Open'
    `,
    [PstrCoID]
  );

  const closed = new Set(
    closedResult.rows.map((row) => `${row.fbrid}|${Number(row.fyear)}`)
  );

  for (const row of rows) {
    const key = `${String(row.lkpBranch).trim()}|${Number(row.txtYear)}`;

    if (closed.has(key)) {
      return failed(
        `The Year ${Number(row.txtYear)} of the Branch ${String(row.lkpBranch).trim()} is closed`,
        "txtYear"
      );
    }
  }

  return passed;
}

/* =========================================================
   DELETE ONE YEAR (the x of a row): the branch must be a branch of the company
   and the year an OPEN year of that branch. A closed year is never deleted from
   here.
========================================================= */

export async function validateDeleteAdministrationYear(data: {
  PstrCoID?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  txtYear?: unknown;
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
    return failed(`Company '${PstrCoID}' not found`, "btnSave", 404);
  }

  const branch = String(data.lkpBranch ?? "").trim();
  const year = String(data.txtYear ?? "").trim();

  if (isNullOrEmpty(branch)) {
    return failed("Please select 'Branch'", "lkpBranch");
  }

  if (!/^\d{4}$/.test(year)) {
    return failed("The 'Year' must have 4 digits", "txtYear");
  }

  const yearResult = await pool.query(
    `
    SELECT fyearclosestatus
    FROM dbo.tblyear
    WHERE fcoid = $1
      AND fbrid = $2
      AND fyear = $3::int
    `,
    [PstrCoID, branch, year]
  );

  if (yearResult.rowCount === 0) {
    return failed(
      `The Year ${Number(year)} of the Branch ${branch} not found`,
      "txtYear",
      404
    );
  }

  if (yearResult.rows[0].fyearclosestatus !== "Open") {
    return failed(
      `The Year ${Number(year)} of the Branch ${branch} is closed`,
      "txtYear"
    );
  }

  return passed;
}
