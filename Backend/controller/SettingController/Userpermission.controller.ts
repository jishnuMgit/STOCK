import type { Request, Response } from "express";
import pool from "../../DB/db.js";

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
  fmenuid: string;
  fmenuname: string | null;
  fmenucaption: string;
  fmenubuttons: string | null;
  fuserid: string;
  fuserbuttons: string;
  fparentid: string;
  fright: number;
  children: PermissionNode[];
}

interface PermissionInput {
  menuId: string;
  buttons?: string | null;
}

interface SaveBody {
  permissions?: PermissionInput[];
}

interface UserParams {
  userId: string;
}

/* ---------------------------------------------------------
   BUILD PERMISSION TREE
--------------------------------------------------------- */

function buildTree(rows: PermissionRow[]): PermissionNode[] {
  const nodes = new Map<string, PermissionNode>();

  rows.forEach((r) => {
    nodes.set(r.fmenuid, {
      fmenuid: r.fmenuid,
      fmenuname: r.fmenuname,
      fmenucaption: r.fmenucaption,
      fmenubuttons: r.fmenubuttons,
      fuserid: r.fuserid,
      fuserbuttons: r.fuserbuttons,
      fparentid: r.fparentid,
      fright: Number(r.fright),
      children: [],
    });
  });

  const roots: PermissionNode[] = [];

  nodes.forEach((node) => {
    const parent = node.fparentid
      ? nodes.get(node.fparentid)
      : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (list: PermissionNode[]): void => {
    list.sort((a, b) => a.fmenuid.localeCompare(b.fmenuid));
    list.forEach((node) => sortRec(node.children));
  };

  sortRec(roots);

  return roots;
}

/* ---------------------------------------------------------
   GET USER PERMISSIONS
   GET /api/user-permission/:userId
--------------------------------------------------------- */

export const getUserPermissions = async (
  req: Request<UserParams>,
  res: Response
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Call the stored procedure in GET mode.
    await client.query(
      `CALL dbo.sp_pageuserpermission(
        $1, $2, $3, $4, $5
      )`,
      [
        "G",
        req.params.userId,
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
   SAVE USER PERMISSIONS
   PUT /api/user-permission/:userId
--------------------------------------------------------- */

export const saveUserPermissions = async (
  req: Request<UserParams, unknown, SaveBody>,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { permissions } = req.body;

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

    // Delete existing permissions.
    await client.query(
      `CALL dbo.sp_pageuserpermission(
        $1, $2, $3, $4, $5
      )`,
      ["D", userId, null, null, "unused_cursor"]
    );

    // Insert each permission.
    for (const permission of permissions) {
      if (!permission.menuId) continue;

      await client.query(
        `CALL dbo.sp_pageuserpermission(
          $1, $2, $3, $4, $5
        )`,
        [
          "S",
          userId,
          permission.menuId,
          permission.buttons ?? "0",
          "unused_cursor",
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Permissions saved",
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
   DELETE USER PERMISSIONS
   DELETE /api/user-permission/:userId
--------------------------------------------------------- */

export const deleteUserPermissions = async (
  req: Request<UserParams>,
  res: Response
): Promise<void> => {
  try {
    await pool.query(
      `CALL dbo.sp_pageuserpermission(
        $1, $2, $3, $4, $5
      )`,
      [
        "D",
        req.params.userId,
        null,
        null,
        "unused_cursor",
      ]
    );

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