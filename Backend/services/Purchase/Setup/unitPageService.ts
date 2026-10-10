import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   UNIT PAGE - calls dbo.sp_pageunit
   (modes: G list, S insert, M rename, D delete)
========================================================= */

export type UnitRow = {
  funit: string;
};

// one row of the grid as the page sends it
export interface UnitRowPayload {
  txtUnit: string;
  // the name the unit had when it was loaded (empty / null for a new row)
  txtOriginalUnit?: string | null;
}

// a saved unit the user removed from the grid (it is deleted when Modify is pressed)
export interface UnitDeletedRowPayload {
  txtOriginalUnit: string;
}

export interface UnitRename {
  before: string;
  after: string;
}

/* =========================================================
   GET UNIT LIST (mode 'G')
========================================================= */

export async function getUnitPageService(
  PstrCoID: string
): Promise<UnitRow[]> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await fetchUnitRows(client, PstrCoID);

    await client.query("COMMIT");

    return rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getUnitPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// one place that runs mode 'G' - the page load and the save (to compare the
// grid with what is saved) both use it, so the SELECT lives only in the
// procedure
async function fetchUnitRows(
  client: PoolClient,
  PstrCoID: string
): Promise<UnitRow[]> {
  const cursorName =
    `cur_unitpage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpUnitPage(client, {
    strmode: "G",
    PstrCoID,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows;
}

/* =========================================================
   HAVE TRANS (dbo.havetrans) - "has a transaction already used this
   unit?" The table it looks in is not written here: it comes from the rule
   row of fSearchKey 'fUnit' in the setup deletion tables (dbo.tblstocksetupdeletion / dbo.tblfinsetupdeletion).
========================================================= */

export async function haveUnitTransService(
  PstrCoID: string,
  unit: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT dbo.havetrans($1, 'fUnit', $2) AS "haveTrans"`,
    [PstrCoID, unit]
  );

  return Number(result.rows[0]?.haveTrans) > 0;
}

/* =========================================================
   SAVE UNITS (mode 'D' for removed units, 'M' for renamed ones, 'S' for new ones)

   The page sends the whole grid plus the saved units the user removed from
   it (deletedRows) - the X only removes a row from the grid, nothing leaves
   the database until Modify is pressed. A row without an original name is
   NEW, a row whose name differs from its original is RENAMED, anything else
   is unchanged. Everything runs in ONE transaction: deletes first (so a
   removed name can be used again), then the renames in two passes
   (original -> temporary name -> new name, so two units can swap names
   without a primary key clash), then the new units.
========================================================= */

export async function saveUnitPageService(
  PstrCoID: string,
  rows: UnitRowPayload[],
  deletedRows: UnitDeletedRowPayload[],
  PstrUserID: string
): Promise<{
  inserted: string[];
  renamed: UnitRename[];
  deleted: string[];
  changed: boolean;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const saved = (await fetchUnitRows(client, PstrCoID)).map((row) => row.funit);
    const savedLower = new Set(saved.map((unit) => unit.toLowerCase()));

    const inserted: string[] = [];
    const renamed: UnitRename[] = [];

    // the units removed from the grid must still be saved ones
    const deleted: string[] = [];

    for (const row of deletedRows) {
      const txtOriginalUnit = row.txtOriginalUnit.trim();

      if (!saved.includes(txtOriginalUnit)) {
        throw new Error(`Unit '${txtOriginalUnit}' not found`);
      }

      deleted.push(txtOriginalUnit);
    }

    for (const row of rows) {
      const txtUnit = row.txtUnit.trim();
      const txtOriginalUnit = (row.txtOriginalUnit ?? "").trim();

      if (txtOriginalUnit === "") {
        inserted.push(txtUnit);
      } else if (txtUnit !== txtOriginalUnit) {
        if (!saved.includes(txtOriginalUnit)) {
          throw new Error(`Unit '${txtOriginalUnit}' not found`);
        }

        renamed.push({ before: txtOriginalUnit, after: txtUnit });
      }
    }

    // a new name may not clash with a unit that stays as it is (a unit that is
    // renamed or deleted in this same save does not stay)
    const leaving = new Set([
      ...renamed.map((item) => item.before.toLowerCase()),
      ...deleted.map((unit) => unit.toLowerCase()),
    ]);

    const staying = new Set(
      [...savedLower].filter((unit) => !leaving.has(unit))
    );

    for (const unit of [...inserted, ...renamed.map((item) => item.after)]) {
      if (staying.has(unit.toLowerCase())) {
        throw new Error(`Unit '${unit}' already exists`);
      }
    }

    // deletes first, so a removed name can be used again in the same save
    for (const unit of deleted) {
      await callSpUnitPage(client, {
        strmode: "D",
        PstrCoID,
        txtOriginalUnit: unit,
      });
    }

    // renames, pass 1: out of the way
    for (const [index, item] of renamed.entries()) {
      await callSpUnitPage(client, {
        strmode: "M",
        PstrCoID,
        txtUnit: `~~${String(index).padStart(5, "0")}`,
        txtOriginalUnit: item.before,
        PstrUserID,
      });
    }

    // renames, pass 2: into the new names
    for (const [index, item] of renamed.entries()) {
      await callSpUnitPage(client, {
        strmode: "M",
        PstrCoID,
        txtUnit: item.after,
        txtOriginalUnit: `~~${String(index).padStart(5, "0")}`,
        PstrUserID,
      });
    }

    for (const unit of inserted) {
      await callSpUnitPage(client, {
        strmode: "S",
        PstrCoID,
        txtUnit: unit,
        PstrUserID,
      });
    }

    await client.query("COMMIT");

    return {
      inserted,
      renamed,
      deleted,
      changed: inserted.length > 0 || renamed.length > 0 || deleted.length > 0,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveUnitPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER - call dbo.sp_pageunit with named arguments,
   so a mode only passes what it uses
========================================================= */

async function callSpUnitPage(
  client: PoolClient,
  p: {
    strmode: string;
    PstrCoID: string;
    txtUnit?: string;
    txtOriginalUnit?: string;
    PstrUserID?: string;
    cursorName?: string;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pageunit(
      p_strmode        => $1::varchar,
      p_pstrcoid       => $2::varchar,
      p_strunit        => $3::varchar,
      p_original_funit => $4::varchar,
      p_pstruserid     => $5::varchar,
      p_result_cursor  => $6::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      p.txtUnit ?? null,
      p.txtOriginalUnit ?? null,
      p.PstrUserID ?? null,
      p.cursorName ??
        `cur_unitpage_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ]
  );
}
