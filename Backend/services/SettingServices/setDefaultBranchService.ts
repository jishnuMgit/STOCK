import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   SET DEFAULT BRANCH - calls dbo.filluserlogin and
   dbo.sp_pagesetdefaultbranch (modes: G list, S insert, M update, D delete)
========================================================= */

export type DefaultBranchRow = {
  fuserid: string;
  fdefbrid: string | null;
};

/* =========================================================
   USER LIST (the User ID dropdown - every user, ADMIN included)
========================================================= */

export async function getDefaultBranchUserListService(
  PstrCoID: string
): Promise<{ fuserid: string }[]> {
  const result = await pool.query(
    `SELECT fuserid FROM dbo.filluserlogin($1)`,
    [PstrCoID]
  );

  return result.rows;
}

/* =========================================================
   BRANCH LIST OF A USER (the Default Branch dropdown) - only the branches
   that user has a right to (dbo.fillbranchofuser, built on dbo.userbranches)
========================================================= */

export async function getDefaultBranchBranchListService(
  PstrCoID: string,
  txtUserID: string
): Promise<{ fbrid: string; fbrname: string }[]> {
  const result = await pool.query(
    `SELECT fbrid, fbrname FROM dbo.fillbranchofuser($1, $2)`,
    [PstrCoID, txtUserID]
  );

  return result.rows;
}

/* =========================================================
   GET DEFAULT BRANCHES (mode 'G')
   The user ID ADMIN gets every user's row, anyone else gets only their
   own row - the procedure decides from the logged-in user it is given.
========================================================= */

export async function getDefaultBranchListService(
  PstrCoID: string,
  PstrUserID: string
): Promise<DefaultBranchRow[]> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await fetchDefaultBranchRows(client, PstrCoID, PstrUserID);

    await client.query("COMMIT");

    return rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getDefaultBranchListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// one place that runs mode 'G' - the page load and the save (to compare the
// grid with what is saved) both use it, so the SELECT lives only in the
// procedure
async function fetchDefaultBranchRows(
  client: PoolClient,
  PstrCoID: string,
  PstrUserID: string
): Promise<DefaultBranchRow[]> {
  const cursorName =
    `cur_setdefaultbranch_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpDefaultBranch(client, {
    strmode: "G",
    PstrCoID,
    PstrUserID,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows;
}

/* =========================================================
   SAVE DEFAULT BRANCHES
     mode 'S' a user with no default branch gets one
     mode 'M' a user's default branch is changed
     mode 'D' a user's branch is cleared - the default is removed

   The page sends every row it shows (a user and the branch in the box). Each
   row is compared with what is saved: no branch + none saved = nothing; a
   branch + none saved = S; another branch = M; no branch + one saved = D;
   the same branch = nothing. Everything runs in ONE transaction.
========================================================= */

export interface DefaultBranchRowPayload {
  txtUserID: string;
  lkpDefaultBranch: string;
}

export async function saveDefaultBranchService(
  PstrCoID: string,
  rows: DefaultBranchRowPayload[],
  PstrUserID: string
): Promise<{
  inserted: { txtUserID: string; lkpDefaultBranch: string }[];
  changed: { txtUserID: string; before: string; lkpDefaultBranch: string }[];
  deleted: { txtUserID: string; before: string }[];
  anything: boolean;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // what is saved, for the users this login may see (all of them for ADMIN)
    const saved = await fetchDefaultBranchRows(client, PstrCoID, PstrUserID);
    const savedByUser = new Map(
      saved.map((row) => [row.fuserid.toLowerCase(), row])
    );

    const inserted: { txtUserID: string; lkpDefaultBranch: string }[] = [];
    const changed: {
      txtUserID: string;
      before: string;
      lkpDefaultBranch: string;
    }[] = [];
    const deleted: { txtUserID: string; before: string }[] = [];

    for (const row of rows) {
      const txtUserID = row.txtUserID.trim();
      const lkpDefaultBranch = row.lkpDefaultBranch.trim();
      const before = savedByUser.get(txtUserID.toLowerCase());
      const savedBranch = before?.fdefbrid ?? "";

      if (lkpDefaultBranch === "") {
        if (before) {
          deleted.push({ txtUserID: before.fuserid, before: savedBranch });
        }
      } else if (!before) {
        inserted.push({ txtUserID, lkpDefaultBranch });
      } else if (savedBranch !== lkpDefaultBranch) {
        changed.push({
          txtUserID: before.fuserid,
          before: savedBranch,
          lkpDefaultBranch,
        });
      }
    }

    for (const row of deleted) {
      await callSpDefaultBranch(client, {
        strmode: "D",
        PstrCoID,
        txtOriginalUserID: row.txtUserID,
      });
    }

    for (const row of changed) {
      await callSpDefaultBranch(client, {
        strmode: "M",
        PstrCoID,
        txtUserID: row.txtUserID,
        lkpDefaultBranch: row.lkpDefaultBranch,
        txtOriginalUserID: row.txtUserID,
        PstrUserID,
      });
    }

    for (const row of inserted) {
      await callSpDefaultBranch(client, {
        strmode: "S",
        PstrCoID,
        txtUserID: row.txtUserID,
        lkpDefaultBranch: row.lkpDefaultBranch,
        PstrUserID,
      });
    }

    await client.query("COMMIT");

    return {
      inserted,
      changed,
      deleted,
      anything: inserted.length > 0 || changed.length > 0 || deleted.length > 0,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveDefaultBranchService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER - call dbo.sp_pagesetdefaultbranch with named arguments,
   so a mode only passes what it uses
========================================================= */

async function callSpDefaultBranch(
  client: PoolClient,
  p: {
    strmode: string;
    PstrCoID: string;
    txtUserID?: string;
    lkpDefaultBranch?: string;
    txtOriginalUserID?: string;
    PstrUserID?: string;
    cursorName?: string;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pagesetdefaultbranch(
      p_strmode          => $1::varchar,
      p_pstrcoid         => $2::varchar,
      p_struserid        => $3::varchar,
      p_strdefbrid       => $4::varchar,
      p_original_fuserid => $5::varchar,
      p_pstruserid       => $6::varchar,
      p_result_cursor    => $7::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      p.txtUserID ?? null,
      p.lkpDefaultBranch ?? null,
      p.txtOriginalUserID ?? null,
      p.PstrUserID ?? null,
      p.cursorName ??
        `cur_setdefaultbranch_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ]
  );
}
