import { promises as fs } from "fs";
import path from "path";
import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   ZATCA FILE PATH - calls dbo.sp_pagezatcafilepath
   (port of clsZATCAFilePath: GetData = mode G, Apply = mode S / M)
========================================================= */

export type ZatcaFilePathData = { filePath: string; exists: boolean };

const CURSOR = "zatcafilepath_cursor";

/* mode G returns a refcursor, so one transaction: CALL, then FETCH ALL */
export async function getZATCAFilePathService(
  PstrCoID: string
): Promise<ZatcaFilePathData> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_pagezatcafilepath($1::varchar, $2::varchar, $3::varchar, $4::varchar, '${CURSOR}')`,
      ["G", PstrCoID, null, null]
    );
    const result = await client.query(`FETCH ALL FROM "${CURSOR}"`);
    await client.query("COMMIT");

    const row = result.rows[0];
    return {
      filePath: row?.fzatcafilepath ?? "",
      exists: !!row,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/* the VB form picked S or M from the button text (Save / Modify);
   here the saved row decides, so the page cannot send the wrong mode */
export async function saveZATCAFilePathService(
  PstrCoID: string,
  PstrUserID: string,
  filePath: string
): Promise<{ mode: "S" | "M" }> {
  const { exists } = await getZATCAFilePathService(PstrCoID);
  const mode = exists ? "M" : "S";

  await pool.query(
    `CALL dbo.sp_pagezatcafilepath($1::varchar, $2::varchar, $3::varchar, $4::varchar, '${CURSOR}')`,
    [mode, PstrCoID, filePath.trim(), PstrUserID]
  );

  return { mode };
}

/* =========================================================
   BROWSE SERVER FOLDERS (the "..." button) - the files are written by the
   SERVER, so the folder is picked from the server's disk (the old
   FolderBrowserDialog), not from the user's PC
========================================================= */

export type FolderListing = {
  current: string; // "" = the list of drives
  parent: string | null; // "" = go to the list of drives, null = no parent
  folders: { name: string; path: string }[];
};

const HIDDEN = (name: string): boolean =>
  name.startsWith("$") || name.startsWith(".") || name === "System Volume Information";

export async function browseServerFoldersService(
  requested?: string | null
): Promise<FolderListing> {
  const isWin = process.platform === "win32";
  let target = (requested ?? "").trim();

  if (!target) {
    if (!isWin) target = "/";
    else {
      const drives: { name: string; path: string }[] = [];
      for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        const root = `${letter}:\\`;
        try {
          await fs.access(root);
          drives.push({ name: root, path: root });
        } catch {
          /* drive not present */
        }
      }
      return { current: "", parent: null, folders: drives };
    }
  }

  const resolved = path.resolve(target);
  const entries = await fs.readdir(resolved, { withFileTypes: true });

  const folders = entries
    .filter((e) => e.isDirectory() && !HIDDEN(e.name))
    .map((e) => ({ name: e.name, path: path.join(resolved, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const up = path.dirname(resolved);
  const parent = up === resolved ? (isWin ? "" : null) : up;

  return { current: resolved, parent, folders };
}
