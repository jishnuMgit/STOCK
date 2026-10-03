import type { Request, Response } from "express";
import pool from "../../DB/db.js";
import { UserAudit } from "../../utils/UserAudit.js";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

interface BranchNode {
  fbrid: string;
  fbrname: string;
  checked: boolean;
}

interface CompanyNode {
  fcoid: string;
  fconame: string;
  checked: boolean;
  children: BranchNode[];
}

interface PermissionInput {
  fcoid: string;
  fbrid: string;
}

interface SaveBody {
  PstrCoID?: string;
  PstrYear?: string;
  PstrUserID?: string;
  permissions?: PermissionInput[];
}

interface DeleteBody {
  PstrCoID?: string;
  PstrYear?: string;
  PstrUserID?: string;
}

interface UserParams {
  lkpUserID: string;
}

/* ---------------------------------------------------------
   SHARED HELPER - every company LEFT JOINed to its branches,
   one call to mode 'GetCoBr' instead of 'GetCo' then one
   'GetBr' per company (that loop was an N+1 query pattern).
   GetCo/GetBr themselves are untouched, still there for
   anything else that calls them directly.

   `grantedSet`, when given, marks the matching branches (and
   any company with at least one checked branch) as checked.
   Omit it to get the bare structure with everything unchecked.
--------------------------------------------------------- */

async function fetchCompanyBranchTree(
  client: import("pg").PoolClient,
  pstrCoID: string,
  grantedSet?: Set<string>
): Promise<CompanyNode[]> {
  await client.query(
    `CALL dbo.sp_pageuserpermissionbranch($1, $2, $3, $4, $5)`,
    ["GetCoBr", pstrCoID, null, null, "cur_cobranch_cobr"]
  );

  const rows = await client.query<{
    fcoid: string;
    fconame: string;
    fbrid: string | null;
    fbrname: string | null;
  }>(`FETCH ALL FROM "cur_cobranch_cobr"`);

  const companyById = new Map<string, CompanyNode>();
  const tree: CompanyNode[] = [];

  for (const row of rows.rows) {
    let company = companyById.get(row.fcoid);

    if (!company) {
      company = {
        fcoid: row.fcoid,
        fconame: row.fconame || "",
        checked: false,
        children: [],
      };
      companyById.set(row.fcoid, company);
      tree.push(company);
    }

    if (row.fbrid) {
      company.children.push({
        fbrid: row.fbrid,
        fbrname: row.fbrname || "",
        checked: grantedSet?.has(`${row.fcoid}|${row.fbrid}`) ?? false,
      });
    }
  }

  // A company shows checked when it has at least one checked
  // branch, not only when every branch is checked (matches the
  // original VB HaveCoRight, which just checked "does any row
  // exist for this company", and the same rule we use on the
  // Menu permission tree).
  for (const company of tree) {
    company.checked = company.children.some((b) => b.checked);
  }

  return tree;
}

/* ---------------------------------------------------------
   GET COMPANY/BRANCH STRUCTURE (no specific user)
   GET /api/user-permission-cobranch/structure?PstrCoID=...

   Lets the page show the full tree the instant it opens,
   before any user is picked - everything unchecked, since
   there's no user yet to check rights against.
--------------------------------------------------------- */

export const getCompanyBranchStructure = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { PstrCoID } = req.query;

  if (!PstrCoID) {
    res.status(400).json({
      success: false,
      message: "Company ID is required",
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tree = await fetchCompanyBranchTree(client, String(PstrCoID));

    await client.query("COMMIT");

    res.json({
      success: true,
      data: tree,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("GET user-permission-cobranch structure failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load company/branch structure",
    });
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   GET PERMISSION TREE (Company -> Branch) for one user
   GET /api/user-permission-cobranch/:lkpUserID?PstrCoID=...
--------------------------------------------------------- */

export const getUserPermissionCoBranch = async (
  req: Request<UserParams>,
  res: Response
): Promise<void> => {
  const { lkpUserID } = req.params;
  const { PstrCoID } = req.query;

  if (!PstrCoID) {
    res.status(400).json({
      success: false,
      message: "Company ID is required",
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const granted = await client.query(
      `SELECT fcoid, fbrid FROM dbo.tbluserpermissionbranch WHERE fuserid = $1`,
      [lkpUserID]
    );

    const grantedSet = new Set(
      granted.rows.map((r) => `${r.fcoid}|${r.fbrid}`)
    );

    const tree = await fetchCompanyBranchTree(client, String(PstrCoID), grantedSet);

    await client.query("COMMIT");

    res.json({
      success: true,
      data: tree,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("GET user-permission-cobranch failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load company/branch permissions",
    });
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   SAVE (mode 'D' wipe, then mode 'S' per checked branch -
   same delete-then-reinsert pattern as sp_pageuserpermissionmenu,
   and the same global wipe the original VB Apply() did)
   PUT /api/user-permission-cobranch/:lkpUserID
--------------------------------------------------------- */

export const saveUserPermissionCoBranch = async (
  req: Request<UserParams, unknown, SaveBody>,
  res: Response
): Promise<void> => {
  const { lkpUserID } = req.params;
  const { PstrCoID, PstrYear, PstrUserID, permissions } = req.body;

  if (!PstrCoID) {
    res.status(400).json({
      success: false,
      message: "Company ID is required",
    });
    return;
  }

  if (!PstrYear) {
    res.status(400).json({
      success: false,
      message: "Year is required",
    });
    return;
  }

  if (!PstrUserID) {
    res.status(400).json({
      success: false,
      message: "User ID is required",
    });
    return;
  }

  if (!Array.isArray(permissions)) {
    res.status(400).json({
      success: false,
      message: "permissions must be an array",
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // What this user already had, before we touch anything -
    // used below to build a proper "inserted / deleted" audit
    // note instead of just a final count.
    const before = await client.query(
      `SELECT fcoid, fbrid FROM dbo.tbluserpermissionbranch WHERE fuserid = $1`,
      [lkpUserID]
    );
    const oldPairs = new Set(before.rows.map((r) => `${r.fcoid}|${r.fbrid}`));

    // Delete existing rights (global wipe for this user, same
    // as the original VB Apply(), not scoped to one company).
    await client.query(
      `CALL dbo.sp_pageuserpermissionbranch($1, $2, $3, $4, $5)`,
      ["D", null, lkpUserID, null, "cur_cobranch_del"]
    );

    // Insert each checked branch.
    const newPairs = new Set<string>();

    for (const permission of permissions) {
      if (!permission.fcoid || !permission.fbrid) continue;

      newPairs.add(`${permission.fcoid}|${permission.fbrid}`);

      await client.query(
        `CALL dbo.sp_pageuserpermissionbranch($1, $2, $3, $4, $5)`,
        [
          "S",
          permission.fcoid,
          lkpUserID,
          permission.fbrid,
          "cur_cobranch_ins",
        ]
      );
    }

    await client.query("COMMIT");

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // note describes exactly what changed: which company/branch
    // pairs were newly granted vs which were removed
    // =====================================================

    try {
      const insertedPairs = [...newPairs].filter((p) => !oldPairs.has(p));
      const deletedPairs = [...oldPairs].filter((p) => !newPairs.has(p));

      const changedCoIds = new Set<string>();
      const changedBrIds = new Set<string>();

      for (const pair of [...insertedPairs, ...deletedPairs]) {
        const [coid, brid] = pair.split("|");
        changedCoIds.add(coid);
        changedBrIds.add(brid);
      }

      let coNameById = new Map<string, string>();
      let brNameById = new Map<string, string>();

      if (changedCoIds.size > 0) {
        const coResult = await pool.query(
          `SELECT fcoid, fconame FROM dbo.tblcompany WHERE fcoid = ANY($1)`,
          [[...changedCoIds]]
        );
        coNameById = new Map(coResult.rows.map((r) => [r.fcoid, r.fconame]));
      }

      if (changedBrIds.size > 0) {
        const brResult = await pool.query(
          `SELECT DISTINCT fbrid, fbrname FROM dbo.tblbranch WHERE fbrid = ANY($1)`,
          [[...changedBrIds]]
        );
        brNameById = new Map(brResult.rows.map((r) => [r.fbrid, r.fbrname]));
      }

      const describe = (pairs: string[]) =>
        pairs
          .map((pair) => {
            const [coid, brid] = pair.split("|");
            const coName = coNameById.get(coid) || coid;
            const brName = brNameById.get(brid) || brid;
            return `${coName} / ${brName}`;
          })
          .join(", ");

      const noteParts: string[] = [];

      if (insertedPairs.length > 0) {
        noteParts.push(`Inserted: ${describe(insertedPairs)}`);
      }

      if (deletedPairs.length > 0) {
        noteParts.push(`Deleted: ${describe(deletedPairs)}`);
      }

      const note =
        noteParts.length > 0
          ? `${noteParts.join(" | ")} for user '${lkpUserID}'`
          : `No company/branch changes for user '${lkpUserID}'`;

      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        lkpUserID,
        "User Permission - Co Branch",
        "S",
        PstrUserID,
        note
      );
    } catch (auditError: unknown) {
      // the permissions are already saved - don't fail the request
      // over an audit-logging problem, just log it
      console.error(
        "UserAudit error (saveUserPermissionCoBranch):",
        auditError
      );
    }

    res.json({
      success: true,
      message: "Permission saved successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("PUT user-permission-cobranch failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to save company/branch permissions",
    });
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   DELETE (mode 'D', global wipe for this user)
   DELETE /api/user-permission-cobranch/:lkpUserID
--------------------------------------------------------- */

export const deleteUserPermissionCoBranch = async (
  req: Request<UserParams, unknown, DeleteBody>,
  res: Response
): Promise<void> => {
  const { lkpUserID } = req.params;
  const { PstrCoID, PstrYear, PstrUserID } = req.body;

  if (!PstrCoID) {
    res.status(400).json({
      success: false,
      message: "Company ID is required",
    });
    return;
  }

  if (!PstrYear) {
    res.status(400).json({
      success: false,
      message: "Year is required",
    });
    return;
  }

  if (!PstrUserID) {
    res.status(400).json({
      success: false,
      message: "User ID is required",
    });
    return;
  }

  try {
    await pool.query(
      `CALL dbo.sp_pageuserpermissionbranch($1, $2, $3, $4, $5)`,
      ["D", null, lkpUserID, null, "cur_cobranch_del"]
    );

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        lkpUserID,
        "User Permission - Co Branch",
        "D",
        PstrUserID,
        `Deleted all company/branch rights for user '${lkpUserID}'`
      );
    } catch (auditError: unknown) {
      console.error(
        "UserAudit error (deleteUserPermissionCoBranch):",
        auditError
      );
    }

    res.json({
      success: true,
      message: "Permissions removed",
    });
  } catch (err) {
    console.error("DELETE user-permission-cobranch failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to delete company/branch permissions",
    });
  }
};
