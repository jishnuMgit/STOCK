import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   STAFF PAGE - calls dbo.sp_pagestaff
   (modes: G list, S insert, M update, D delete)
========================================================= */

export type StaffRow = {
  fstaffid: string;
  fstaffname: string | null;
  fispurchase: boolean;
  fissales: boolean;
};

// one row of the grid as the page sends it
export interface StaffRowPayload {
  txtStaffID: string;
  txtStaffName: string;
  chkIsPurchase: boolean;
  chkIsSales: boolean;
  // the staff id it had when it was loaded (empty / null for a new row)
  txtOriginalStaffID?: string | null;
}

// a saved staff member the user removed from the grid (deleted on Modify)
export interface StaffDeletedRowPayload {
  txtOriginalStaffID: string;
}

// what changed in a saved staff member (for the audit note)
export interface StaffChange {
  before: StaffRow;
  after: {
    txtStaffID: string;
    txtStaffName: string;
    chkIsPurchase: boolean;
    chkIsSales: boolean;
  };
}

/* =========================================================
   GET STAFF LIST (mode 'G')
========================================================= */

export async function getStaffPageService(
  PstrCoID: string
): Promise<StaffRow[]> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await fetchStaffRows(client, PstrCoID);

    await client.query("COMMIT");

    return rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getStaffPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// one place that runs mode 'G' - the page load and the save (to compare the
// grid with what is saved) both use it, so the SELECT lives only in the
// procedure
async function fetchStaffRows(
  client: PoolClient,
  PstrCoID: string
): Promise<StaffRow[]> {
  const cursorName =
    `cur_staffpage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpStaffPage(client, {
    strmode: "G",
    PstrCoID,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows;
}

/* =========================================================
   HAVE TRANS (dbo.sp_havetrans) - "is this staff member already used?"
   The tables it looks in are not written here: they come from the rule
   rows of fSearchKey 'fStaffID' in dbo.tblstocksetupdeletion.
========================================================= */

export async function haveStaffTransService(
  PstrCoID: string,
  txtStaffID: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT dbo.sp_havetrans($1, 'fStaffID', $2) AS "haveTrans"`,
    [PstrCoID, txtStaffID]
  );

  return Number(result.rows[0]?.haveTrans) > 0;
}

/* =========================================================
   SAVE STAFF
     mode 'D' staff removed from the grid
     mode 'M' staff whose id, name, Purchase or Sales changed
     mode 'S' new staff

   The page sends the whole grid plus the saved staff the user removed from
   it (deletedRows). A row without an original id is NEW; a row whose id,
   name or flags differ from what is saved is CHANGED; anything else is
   unchanged. Everything runs in ONE transaction: deletes first (so a removed
   id can be used again), then the changes (an id change in two passes,
   original -> temporary id -> new id, so two staff can swap ids without a
   primary key clash), then the new staff.
========================================================= */

export async function saveStaffPageService(
  PstrCoID: string,
  rows: StaffRowPayload[],
  deletedRows: StaffDeletedRowPayload[],
  PstrUserID: string
): Promise<{
  inserted: StaffChange["after"][];
  changed: StaffChange[];
  deleted: StaffRow[];
  anything: boolean;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const saved = await fetchStaffRows(client, PstrCoID);
    const savedById = new Map(saved.map((row) => [row.fstaffid, row]));

    // the staff removed from the grid must still be saved ones
    const deleted: StaffRow[] = [];

    for (const row of deletedRows) {
      const txtOriginalStaffID = row.txtOriginalStaffID.trim();
      const before = savedById.get(txtOriginalStaffID);

      if (!before) {
        throw new Error(`Staff '${txtOriginalStaffID}' not found`);
      }

      deleted.push(before);
    }

    const inserted: StaffChange["after"][] = [];
    const changed: StaffChange[] = [];

    for (const row of rows) {
      const after = {
        txtStaffID: row.txtStaffID.trim(),
        txtStaffName: row.txtStaffName.trim(),
        chkIsPurchase: !!row.chkIsPurchase,
        chkIsSales: !!row.chkIsSales,
      };
      const txtOriginalStaffID = (row.txtOriginalStaffID ?? "").trim();

      if (txtOriginalStaffID === "") {
        inserted.push(after);
        continue;
      }

      const before = savedById.get(txtOriginalStaffID);

      if (!before) {
        throw new Error(`Staff '${txtOriginalStaffID}' not found`);
      }

      if (
        after.txtStaffID !== before.fstaffid ||
        after.txtStaffName !== (before.fstaffname ?? "") ||
        after.chkIsPurchase !== before.fispurchase ||
        after.chkIsSales !== before.fissales
      ) {
        changed.push({ before, after });
      }
    }

    // a new id / name may not clash with a staff member that stays as it is
    // (one that is changed or deleted in this same save does not stay)
    const leavingIds = new Set([
      ...changed.map((item) => item.before.fstaffid.toLowerCase()),
      ...deleted.map((row) => row.fstaffid.toLowerCase()),
    ]);

    const staying = saved.filter(
      (row) => !leavingIds.has(row.fstaffid.toLowerCase())
    );
    const stayingIds = new Set(staying.map((row) => row.fstaffid.toLowerCase()));
    const stayingNames = new Set(
      staying.map((row) => (row.fstaffname ?? "").toLowerCase())
    );

    for (const after of [...inserted, ...changed.map((item) => item.after)]) {
      if (stayingIds.has(after.txtStaffID.toLowerCase())) {
        throw new Error(`Staff ID '${after.txtStaffID}' already exists`);
      }

      if (stayingNames.has(after.txtStaffName.toLowerCase())) {
        throw new Error(`Staff Name '${after.txtStaffName}' already exists`);
      }
    }

    // deletes first, so a removed id can be used again in the same save
    for (const row of deleted) {
      await callSpStaffPage(client, {
        strmode: "D",
        PstrCoID,
        txtOriginalStaffID: row.fstaffid,
      });
    }

    // changes, pass 1: the ids out of the way (4 characters, like the column)
    const tempId = (index: number) => `~${String(index).padStart(3, "0")}`;

    for (const [index, item] of changed.entries()) {
      await callSpStaffPage(client, {
        strmode: "M",
        PstrCoID,
        txtStaffID: tempId(index),
        txtStaffName: item.after.txtStaffName,
        chkIsPurchase: item.after.chkIsPurchase,
        chkIsSales: item.after.chkIsSales,
        txtOriginalStaffID: item.before.fstaffid,
        PstrUserID,
      });
    }

    // changes, pass 2: into the new ids
    for (const [index, item] of changed.entries()) {
      await callSpStaffPage(client, {
        strmode: "M",
        PstrCoID,
        txtStaffID: item.after.txtStaffID,
        txtStaffName: item.after.txtStaffName,
        chkIsPurchase: item.after.chkIsPurchase,
        chkIsSales: item.after.chkIsSales,
        txtOriginalStaffID: tempId(index),
        PstrUserID,
      });
    }

    for (const after of inserted) {
      await callSpStaffPage(client, {
        strmode: "S",
        PstrCoID,
        txtStaffID: after.txtStaffID,
        txtStaffName: after.txtStaffName,
        chkIsPurchase: after.chkIsPurchase,
        chkIsSales: after.chkIsSales,
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
    console.error("saveStaffPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER - call dbo.sp_pagestaff with named arguments,
   so a mode only passes what it uses
========================================================= */

async function callSpStaffPage(
  client: PoolClient,
  p: {
    strmode: string;
    PstrCoID: string;
    txtStaffID?: string;
    txtStaffName?: string;
    chkIsPurchase?: boolean;
    chkIsSales?: boolean;
    txtOriginalStaffID?: string;
    PstrUserID?: string;
    cursorName?: string;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pagestaff(
      p_strmode           => $1::varchar,
      p_pstrcoid          => $2::varchar,
      p_strstaffid        => $3::varchar,
      p_strstaffname      => $4::varchar,
      p_blnispurchase     => $5::boolean,
      p_blnissales        => $6::boolean,
      p_original_fstaffid => $7::varchar,
      p_pstruserid        => $8::varchar,
      p_result_cursor     => $9::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      p.txtStaffID ?? null,
      p.txtStaffName ?? null,
      p.chkIsPurchase ?? false,
      p.chkIsSales ?? false,
      p.txtOriginalStaffID ?? null,
      p.PstrUserID ?? null,
      p.cursorName ??
        `cur_staffpage_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ]
  );
}
