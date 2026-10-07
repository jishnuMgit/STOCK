import type { Request, Response } from "express";
import pool from "../../DB/db.js";
import { UserAudit } from "../../utils/UserAudit.js";
import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { validateSecurityWrite } from "../../validators/SecurityPageValidator.js";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

interface PermissionRow {
  fmenuid: string;
  fmenuname: string | null;
  fmenucaption: string;
  fmenubuttons: string | null;
  fuserid: string;
  fuserbuttons: string;
  fparentid: string;
  fright: string | number;
}

interface PermissionNode {
  lkpMenuID: string;
  txtMenuName: string | null;
  txtMenuCaption: string;
  txtMenuButtons: string | null;
  lkpUserID: string;
  txtUserButtons: string;
  lkpParentMenuID: string;
  txtRight: number;
  children: PermissionNode[];
}

interface PermissionInput {
  lkpMenuID: string;
  txtUserButtons?: string | null;
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
   BUILD PERMISSION TREE
--------------------------------------------------------- */

function buildTree(rows: PermissionRow[]): PermissionNode[] {
  const nodes = new Map<string, PermissionNode>();

  rows.forEach((r) => {
    nodes.set(r.fmenuid, {
      lkpMenuID: r.fmenuid,
      txtMenuName: r.fmenuname,
      txtMenuCaption: r.fmenucaption,
      txtMenuButtons: r.fmenubuttons,
      lkpUserID: r.fuserid,
      txtUserButtons: r.fuserbuttons,
      lkpParentMenuID: r.fparentid,
      txtRight: Number(r.fright),
      children: [],
    });
  });

  const roots: PermissionNode[] = [];

  nodes.forEach((node) => {
    const parent = node.lkpParentMenuID
      ? nodes.get(node.lkpParentMenuID)
      : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (list: PermissionNode[]): void => {
    list.sort((a, b) => a.lkpMenuID.localeCompare(b.lkpMenuID));
    list.forEach((node) => sortRec(node.children));
  };

  sortRec(roots);

  return roots;
}

/* ---------------------------------------------------------
   GET USER ID LIST (lkpUserID dropdown)
   GET /api/user-permission/users/list?PstrCoID=...
--------------------------------------------------------- */

export const getUserIdList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { PstrCoID } = req.query;

    if (!PstrCoID) {
      res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
      return;
    }

    // dbo.filluserid excludes ADMIN, same as the old VB
    // FillCombos ("...Where fUserID<>'ADMIN'") - shared by
    // every screen that picks a target user to view/manage.
    const result = await pool.query(
      `SELECT * FROM dbo.filluserid($1)`,
      [PstrCoID]
    );

    res.json({
      success: true,
      data: result.rows.map((row) => ({ lkpUserID: row.fuserid })),
    });
  } catch (err) {
    console.error("GET user-permission users/list failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load user ID list",
    });
  }
};

/* ---------------------------------------------------------
   GET USER PERMISSIONS (lkpUserID's own permission tree)
   GET /api/user-permission/:lkpUserID
--------------------------------------------------------- */

export const getUserPermissions = async (
  req: Request<UserParams>,
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

    // Call the stored procedure in GET mode.
    await client.query(
      `CALL dbo.sp_pageuserpermissionmenu(
        $1, $2, $3, $4, $5, $6
      )`,
      [
        "G",
        PstrCoID,
        req.params.lkpUserID,
        null,
        null,
        "permission_cursor",
      ]
    );

    // Fetch the result set from the cursor.
    const { rows } = await client.query<PermissionRow>(
      'FETCH ALL FROM "permission_cursor"'
    );

    await client.query('CLOSE "permission_cursor"');
    await client.query("COMMIT");

    res.json({
      success: true,
      data: buildTree(rows),
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("GET user-permission failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load permissions",
    });
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   GET MENU STRUCTURE (no specific user)
   GET /api/user-permission/structure?PstrCoID=...

   Lets the page show the full menu tree the instant it opens,
   before any user is picked - every box unchecked, since the
   procedure's mode 'G' left-joins the rights and an empty user
   id matches none.
--------------------------------------------------------- */

export const getMenuStructure = async (
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

    await client.query(
      `CALL dbo.sp_pageuserpermissionmenu(
        $1, $2, $3, $4, $5, $6
      )`,
      ["G", PstrCoID, "", null, null, "permission_cursor"]
    );

    const { rows } = await client.query<PermissionRow>(
      'FETCH ALL FROM "permission_cursor"'
    );

    await client.query('CLOSE "permission_cursor"');
    await client.query("COMMIT");

    res.json({
      success: true,
      data: buildTree(rows),
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("GET user-permission structure failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load menu structure",
    });
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   SAVE USER PERMISSIONS (mode 'S', delete-then-reinsert)
   PUT /api/user-permission/:lkpUserID
--------------------------------------------------------- */

// dbo.tblmenu fmenuid of the User Permission - Menu screen
const MENU_ID = "9302";

export const saveUserPermissions = async (
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

  // validators/SecurityPageValidator.ts: idle user, then logged in with the
  // Save right - the first rule that fails stops the save
  const check = await validateSecurityWrite({
    PstrUserID,
    user: (req as unknown as AuthenticatedRequest).user,
    menuId: MENU_ID,
    code: "S",
    field: "lkpUserID",
  });

  if (!check.valid) {
    res.status(check.status).json({
      success: false,
      message: check.message,
      field: check.field,
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
      `SELECT fmenuid, fuserbuttons FROM dbo.tbluserpermission WHERE fcoid = $1 AND fuserid = $2`,
      [PstrCoID, lkpUserID]
    );

    // Only menus with a real action-button string count as a
    // meaningful grant for the audit note. Checking a parent
    // menu (e.g. Purchase) cascades "checked" onto every
    // container above/below it too, but those containers have
    // no fmenubuttons of their own, so they're saved with
    // fuserbuttons = '0' - present in the table (they still
    // gate menu visibility), but not a real permission grant
    // worth naming individually in the note.
    const oldMenuIds = new Set<string>(
      before.rows
        .filter((r) => r.fuserbuttons && r.fuserbuttons !== "0")
        .map((r) => r.fmenuid)
    );

    // Delete existing permissions (for this company).
    await client.query(
      `CALL dbo.sp_pageuserpermissionmenu(
        $1, $2, $3, $4, $5, $6
      )`,
      ["D", PstrCoID, lkpUserID, null, null, "unused_cursor"]
    );

    // Insert each permission.
    // Same "meaningful grant" rule as oldMenuIds above - only
    // menus saved with a real, non-'0' button string.
    const newMenuIds = new Set<string>();

    for (const permission of permissions) {
      if (!permission.lkpMenuID) continue;

      const buttons = permission.txtUserButtons ?? "0";

      if (buttons !== "0") {
        newMenuIds.add(permission.lkpMenuID);
      }

      await client.query(
        `CALL dbo.sp_pageuserpermissionmenu(
          $1, $2, $3, $4, $5, $6
        )`,
        [
          "S",
          PstrCoID,
          lkpUserID,
          permission.lkpMenuID,
          permission.txtUserButtons ?? "0",
          "unused_cursor",
        ]
      );
    }

    await client.query("COMMIT");

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // note describes exactly what changed: which menus were
    // newly granted vs which were removed, not just a count
    // =====================================================

    try {
      const insertedIds = [...newMenuIds].filter((id) => !oldMenuIds.has(id));
      const deletedIds = [...oldMenuIds].filter((id) => !newMenuIds.has(id));

      let captionById = new Map<string, string>();

      const changedIds = [...insertedIds, ...deletedIds];

      if (changedIds.length > 0) {
        const captionResult = await pool.query(
          `SELECT fmenuid, fmenucaption FROM dbo.tblmenu WHERE fmenuid = ANY($1)`,
          [changedIds]
        );

        captionById = new Map(
          captionResult.rows.map((r) => [r.fmenuid, r.fmenucaption])
        );
      }

      const describe = (ids: string[]) =>
        ids.map((id) => captionById.get(id) || id).join(", ");

      const noteParts: string[] = [];

      if (insertedIds.length > 0) {
        noteParts.push(`Inserted menu(s): ${describe(insertedIds)}`);
      }

      if (deletedIds.length > 0) {
        noteParts.push(`Deleted menu(s): ${describe(deletedIds)}`);
      }

      const note =
        noteParts.length > 0
          ? `${noteParts.join(" | ")} for user '${lkpUserID}'`
          : `Updated permission buttons for user '${lkpUserID}' (no menus added or removed)`;

      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        lkpUserID,
        "User Permission - Menu",
        "S",
        PstrUserID,
        note
      );
    } catch (auditError: unknown) {
      // the permissions are already saved - don't fail the request
      // over an audit-logging problem, just log it
      console.error("UserAudit error (saveUserPermissions):", auditError);
    }

    res.json({
      success: true,
      message: "Permission saved successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("PUT user-permission failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to save permissions",
    });
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   DELETE USER PERMISSIONS (mode 'D')
   DELETE /api/user-permission/:lkpUserID
--------------------------------------------------------- */

export const deleteUserPermissions = async (
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

  // idle user, then logged in with the Delete right
  const check = await validateSecurityWrite({
    PstrUserID,
    user: (req as unknown as AuthenticatedRequest).user,
    menuId: MENU_ID,
    code: "D",
    field: "lkpUserID",
  });

  if (!check.valid) {
    res.status(check.status).json({
      success: false,
      message: check.message,
      field: check.field,
    });
    return;
  }

  try {
    await pool.query(
      `CALL dbo.sp_pageuserpermissionmenu(
        $1, $2, $3, $4, $5, $6
      )`,
      [
        "D",
        PstrCoID,
        lkpUserID,
        null,
        null,
        "unused_cursor",
      ]
    );

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        lkpUserID,
        "User Permission - Menu",
        "D",
        PstrUserID,
        `Deleted all permissions for user '${lkpUserID}'`
      );
    } catch (auditError: unknown) {
      // the permissions are already deleted - don't fail the request
      // over an audit-logging problem, just log it
      console.error("UserAudit error (deleteUserPermissions):", auditError);
    }

    res.json({
      success: true,
      message: "Permissions removed",
    });
  } catch (err) {
    console.error("DELETE user-permission failed:", err);

    res.status(500).json({
      success: false,
      message: "Failed to delete permissions",
    });
  }
};
