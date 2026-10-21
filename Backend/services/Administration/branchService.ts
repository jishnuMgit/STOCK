import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   ADMINISTRATION > BRANCH - calls dbo.sp_pagebranch (the port of the old
   SP_frmBranch). The grid edits the Branch ID (new rows only), the Branch name
   and the Position No. of the logged-in company's branches. Add, change and
   delete (the ID of a saved branch is never changed).
========================================================= */

export type AdministrationBranchRow = {
  fbrid: string;
  fbrname: string | null;
  fpositionno: number | null;
};

// one row of the grid, as the page sends it. chkSaved = the row was loaded
// from the server (so it is a change), not typed in a new row
export type AdministrationBranchRowPayload = {
  txtBrID: string;
  txtBrName: string;
  txtPositionNo?: string | number | null;
  chkSaved?: boolean;
};

export type AdministrationBranchSaved = {
  mode: "S" | "M" | "D";
  txtBrID: string;
  note: string;
};

// what to tell the user: the new branches were saved, the saved ones modified -
// a branch taken out of the list is a modification too (the same words as the
// other screens: "... saved successfully" / "... modified successfully")
// (the one Save button does all of it)
export const buildAdministrationBranchMessage = (
  saved: AdministrationBranchSaved[]
): string => {
  // the x of a row deletes at once: a request that only deleted
  if (saved.length > 0 && saved.every((entry) => entry.mode === "D")) {
    return "Branch deleted successfully";
  }

  const added = saved.some((entry) => entry.mode === "S");
  const modified = saved.some(
    (entry) => entry.mode === "M" || entry.mode === "D"
  );

  if (added && modified) return "Branch saved and modified successfully";
  if (modified) return "Branch modified successfully";

  return "Branch saved successfully";
};

// "" / null = no position
export const toPositionNo = (value: unknown): number | null => {
  const text = String(value ?? "").trim();

  return text === "" ? null : Number(text);
};

async function fetchCursor<T>(
  client: PoolClient,
  strmode: "GHD" | "G",
  PstrCoID: string
): Promise<T[]> {
  const cursorName =
    `cur_branch_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await client.query(
    `
    CALL dbo.sp_pagebranch(
      p_strmode       => $1::varchar,
      p_pstrcoid      => $2::varchar,
      p_result_cursor => $3::refcursor
    )
    `,
    [strmode, PstrCoID, cursorName]
  );

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows as T[];
}

/* =========================================================
   THE SCREEN: the company name (GHD) and its branches (G), one transaction
========================================================= */

export async function getAdministrationBranchService(PstrCoID: string): Promise<{
  company: { fcoid: string; fconame: string | null } | null;
  branches: AdministrationBranchRow[];
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const company = await fetchCursor<{ fcoid: string; fconame: string | null }>(
      client,
      "GHD",
      PstrCoID
    );

    const branches = await fetchCursor<AdministrationBranchRow>(
      client,
      "G",
      PstrCoID
    );

    await client.query("COMMIT");

    return { company: company[0] ?? null, branches };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getAdministrationBranchService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE - D for a branch taken out of the list on the screen (a plain
   delete of its row, done FIRST so a new row can use its ID or name), S for a
   new row, M for a saved row whose name or position changed.
   One call for each, all in ONE transaction: if one fails, none is saved.
   Returns what was done (with the audit note of each) so the controller can
   write the audit rows after the commit.
========================================================= */

export async function saveAdministrationBranchService(data: {
  PstrCoID: string;
  PstrUserID: string;
  rows: AdministrationBranchRowPayload[];
  // the branches the user took out of the list (deleted only now)
  deletedRows?: { txtBrID: string }[];
}): Promise<AdministrationBranchSaved[]> {
  const client: PoolClient = await pool.connect();
  const done: AdministrationBranchSaved[] = [];

  try {
    await client.query("BEGIN");

    // what the branches are now (for "changed from ... to ...")
    const current = await fetchCursor<AdministrationBranchRow>(
      client,
      "G",
      data.PstrCoID
    );

    for (const removed of data.deletedRows ?? []) {
      const before = current.find(
        (branch) => branch.fbrid === String(removed.txtBrID).trim()
      );

      if (!before) {
        throw new Error(`Branch '${removed.txtBrID}' not found`);
      }

      await client.query(
        `
        CALL dbo.sp_pagebranch(
          p_strmode    => 'D'::varchar,
          p_pstrcoid   => $1::varchar,
          p_strbrid    => $2::varchar,
          p_pstruserid => $3::varchar
        )
        `,
        [data.PstrCoID, before.fbrid, data.PstrUserID]
      );

      done.push({
        mode: "D",
        txtBrID: before.fbrid,
        note: `Branch ${before.fbrid} (${before.fbrname ?? ""}) deleted`,
      });
    }

    for (const row of data.rows) {
      const txtBrID = String(row.txtBrID).trim();
      const txtBrName = String(row.txtBrName).trim();
      const txtPositionNo = toPositionNo(row.txtPositionNo);

      const mode = row.chkSaved ? "M" : "S";

      // a saved row is found by its ID (the ID is never changed)
      const before =
        mode === "M"
          ? current.find((branch) => branch.fbrid === txtBrID)
          : undefined;

      if (mode === "M" && !before) {
        throw new Error(`Branch '${txtBrID}' not found`);
      }

      const brid = txtBrID;

      let note = "";

      if (mode === "M" && before) {
        const changes: string[] = [];

        if ((before.fbrname ?? "") !== txtBrName) {
          changes.push(
            `Name changed from ${before.fbrname ?? ""} to ${txtBrName}`
          );
        }

        if ((before.fpositionno ?? null) !== txtPositionNo) {
          changes.push(
            `Position No. changed from ${before.fpositionno ?? "-"} to ${txtPositionNo ?? "-"}`
          );
        }

        // nothing really changed: no call, no audit
        if (changes.length === 0) continue;

        note = `Branch ${brid} : ${changes.join("; ")}`;
      } else {
        note = `Branch ${brid} (${txtBrName}) added, Position No. ${txtPositionNo ?? "-"}`;
      }

      await client.query(
        `
        CALL dbo.sp_pagebranch(
          p_strmode        => $1::varchar,
          p_pstrcoid       => $2::varchar,
          p_strbrid        => $3::varchar,
          p_strbrname      => $4::varchar,
          p_intpositionno  => $5::smallint,
          p_pstruserid     => $6::varchar,
          p_stroriginal_brid => $7::varchar
        )
        `,
        [
          mode,
          data.PstrCoID,
          brid,
          txtBrName,
          txtPositionNo,
          data.PstrUserID,
          before?.fbrid ?? null,
        ]
      );

      done.push({ mode, txtBrID: brid, note });
    }

    await client.query("COMMIT");

    return done;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveAdministrationBranchService error:", error);
    throw error;
  } finally {
    client.release();
  }
}
