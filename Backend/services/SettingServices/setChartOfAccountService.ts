import type { PoolClient } from "pg";
import pool from "../../DB/db.js";
import { mapRows, chartOfAccountKeys } from "../../utils/responseKeys.js";

/* =========================================================
   TYPES (keys = form field names)
========================================================= */

// one saved row, as the page knows it
export interface ChartOfAccountRow {
  txtSlNo: number;
  lkpParameterType: string;
  lkpAccountID: string | null;
  txtGPH: string | null;
}

// one grid row sent by the page. The two "original" values are
// the row's type + slno as it was LOADED (null for a new row) -
// they say which saved row this grid row came from.
export interface ChartOfAccountRowPayload extends ChartOfAccountRow {
  txtOriginalSlNo: number | null;
  lkpOriginalParameterType: string | null;
}

export interface ChartOfAccountSaveResult {
  changed: boolean;
  inserted: ChartOfAccountRow[];
  updated: { before: ChartOfAccountRow; after: ChartOfAccountRow }[]; // type / account really changed
}

/* =========================================================
   READ THE SAVED ROWS (mode 'G') - shared by the page load,
   the save and the delete (which compare against them)
========================================================= */

async function fetchChartOfAccountRows(
  client: PoolClient,
  PstrCoID: string
): Promise<ChartOfAccountRow[]> {
  const cursorName =
    `cur_finsetting_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpChartOfAccount(client, {
    strmode: "G",
    PstrCoID,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return mapRows(result.rows, chartOfAccountKeys) as unknown as ChartOfAccountRow[];
}

/* =========================================================
   GET CHART OF ACCOUNT ROWS (mode 'G') - the saved
   parameter -> account rows of the company
========================================================= */

export async function getChartOfAccountService(
  PstrCoID: string
): Promise<ChartOfAccountRow[]> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await fetchChartOfAccountRows(client, PstrCoID);

    await client.query("COMMIT");

    return rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getChartOfAccountService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE THE GRID

   Compares the submitted rows with what is saved right now:
     - no original keys          -> new row        -> mode S1
     - original keys, changed    -> modified row   -> mode M1
   (Removing a row is a separate action - see
   deleteChartOfAccountRowService.)
   Everything runs in ONE transaction - any error rolls the
   whole save back.
========================================================= */

const keyOf = (slno: number, type: string) => `${slno}|${type}`;

const sameRow = (a: ChartOfAccountRow, b: ChartOfAccountRow) =>
  a.txtSlNo === b.txtSlNo &&
  a.lkpParameterType === b.lkpParameterType &&
  (a.lkpAccountID ?? null) === (b.lkpAccountID ?? null) &&
  (a.txtGPH ?? null) === (b.txtGPH ?? null);

export async function saveChartOfAccountService(
  PstrCoID: string,
  rows: ChartOfAccountRowPayload[],
  PstrUserID: string
): Promise<ChartOfAccountSaveResult> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await fetchChartOfAccountRows(client, PstrCoID);
    const existingByKey = new Map(
      existing.map((row) => [keyOf(row.txtSlNo, row.lkpParameterType), row])
    );

    /* ---------- sort the submitted rows into new / existing ---------- */

    const inserted: ChartOfAccountRow[] = [];
    const candidates: { before: ChartOfAccountRow; after: ChartOfAccountRow }[] = [];
    const keptKeys = new Set<string>();
    const seenPairs = new Set<string>();

    for (const row of rows) {
      const after: ChartOfAccountRow = {
        txtSlNo: Number(row.txtSlNo),
        lkpParameterType: String(row.lkpParameterType ?? "").trim(),
        lkpAccountID: row.lkpAccountID ? String(row.lkpAccountID).trim() : null,
        txtGPH: row.txtGPH ? String(row.txtGPH).trim() : null,
      };

      if (!after.lkpParameterType || !after.lkpAccountID) {
        throw new Error("Select both a Parameter and an Account for every row.");
      }

      const pair = `${after.lkpParameterType}|${after.lkpAccountID}`.toUpperCase();

      if (seenPairs.has(pair)) {
        throw new Error("Duplicate Entry !");
      }

      seenPairs.add(pair);

      if (row.txtOriginalSlNo == null || !row.lkpOriginalParameterType) {
        inserted.push(after);
        continue;
      }

      const key = keyOf(Number(row.txtOriginalSlNo), row.lkpOriginalParameterType);
      const before = existingByKey.get(key);

      if (!before || keptKeys.has(key)) {
        throw new Error(
          "The saved data has changed since this page was opened. Please reload and try again."
        );
      }

      keptKeys.add(key);
      candidates.push({ before, after });
    }

    /* ---------- what really changed (not just renumbering) ---------- */

    const updated = candidates.filter(
      ({ before, after }) =>
        before.lkpParameterType !== after.lkpParameterType ||
        (before.lkpAccountID ?? null) !== (after.lkpAccountID ?? null)
    );

    if (inserted.length === 0 && updated.length === 0) {
      await client.query("ROLLBACK");

      return { changed: false, inserted, updated };
    }

    /* ---------- check the new / changed values against the database ---------- */

    const toCheck = [...inserted, ...updated.map(({ after }) => after)];

    const typeResult = await client.query(
      `SELECT ftype FROM dbo.fillfinsetup($1)`,
      [PstrCoID]
    );
    const knownTypes = new Set(typeResult.rows.map((row) => row.ftype));

    const accountResult = await client.query(
      `SELECT faccountid, fgph FROM dbo.fillfinaccount($1)`,
      [PstrCoID]
    );
    const gphByAccount = new Map<string, string>(
      accountResult.rows.map((row) => [row.faccountid, row.fgph])
    );

    for (const row of toCheck) {
      if (!knownTypes.has(row.lkpParameterType)) {
        throw new Error(`Unknown Parameter '${row.lkpParameterType}'.`);
      }

      const gph = gphByAccount.get(row.lkpAccountID as string);

      if (gph === undefined) {
        throw new Error(`Unknown Account '${row.lkpAccountID}'.`);
      }

      // the G / P / H of the account comes from the database, not the browser
      row.txtGPH = gph;
    }

    /* ---------- write ---------- */

    // modified / renumbered rows. Two passes so renumbering can never
    // collide with a row that has not moved yet: first park every row on
    // a negative slno (unique), then move it to its final values.
    const toUpdate = candidates.filter(({ before, after }) => !sameRow(before, after));

    for (const { before, after } of toUpdate) {
      await callSpChartOfAccount(client, {
        strmode: "M1",
        PstrCoID,
        txtSlNo: -after.txtSlNo,
        lkpParameterType: before.lkpParameterType,
        lkpAccountID: before.lkpAccountID,
        txtGPH: before.txtGPH,
        txtOriginalSlNo: before.txtSlNo,
        lkpOriginalParameterType: before.lkpParameterType,
        PstrUserID,
      });
    }

    for (const { before, after } of toUpdate) {
      await callSpChartOfAccount(client, {
        strmode: "M1",
        PstrCoID,
        txtSlNo: after.txtSlNo,
        lkpParameterType: after.lkpParameterType,
        lkpAccountID: after.lkpAccountID,
        txtGPH: after.txtGPH,
        txtOriginalSlNo: -after.txtSlNo,
        lkpOriginalParameterType: before.lkpParameterType,
        PstrUserID,
      });
    }

    // new rows last
    for (const row of inserted) {
      await callSpChartOfAccount(client, {
        strmode: "S1",
        PstrCoID,
        txtSlNo: row.txtSlNo,
        lkpParameterType: row.lkpParameterType,
        lkpAccountID: row.lkpAccountID,
        txtGPH: row.txtGPH,
        PstrUserID,
      });
    }

    await client.query("COMMIT");

    return { changed: true, inserted, updated };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveChartOfAccountService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE ONE ROW (mode 'D1')

   The row is found by the type + slno it was loaded with.
   Returns the row that was deleted (for the audit note).
========================================================= */

export async function deleteChartOfAccountRowService(
  PstrCoID: string,
  txtOriginalSlNo: number,
  lkpOriginalParameterType: string,
  PstrUserID: string
): Promise<ChartOfAccountRow> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await fetchChartOfAccountRows(client, PstrCoID);

    const row = existing.find(
      (item) =>
        item.txtSlNo === Number(txtOriginalSlNo) &&
        item.lkpParameterType === lkpOriginalParameterType
    );

    if (!row) {
      throw new Error(
        "This row no longer exists. Please reload the page and try again."
      );
    }

    await callSpChartOfAccount(client, {
      strmode: "D1",
      PstrCoID,
      txtOriginalSlNo: row.txtSlNo,
      lkpOriginalParameterType: row.lkpParameterType,
      PstrUserID,
    });

    await client.query("COMMIT");

    return row;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteChartOfAccountRowService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER - call dbo.sp_pagesetchartofaccount with
   sensible defaults for whichever fields a mode doesn't use
========================================================= */

async function callSpChartOfAccount(
  client: PoolClient,
  overrides: Partial<{
    strmode: string;
    PstrCoID: string;
    txtSlNo: number;
    lkpParameterType: string | null;
    lkpAccountID: string | null;
    txtGPH: string | null;
    txtOriginalSlNo: number;
    lkpOriginalParameterType: string | null;
    PstrUserID: string | null;
    cursorName: string;
  }>
): Promise<void> {
  const p = {
    strmode: null,
    PstrCoID: null,
    txtSlNo: 0,
    lkpParameterType: null,
    lkpAccountID: null,
    txtGPH: null,
    txtOriginalSlNo: 0,
    lkpOriginalParameterType: null,
    PstrUserID: null,
    cursorName:
      `cur_finsetting_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ...overrides,
  };

  await client.query(
    `
    CALL dbo.sp_pagesetchartofaccount(
      $1::varchar, $2::varchar, $3::smallint, $4::varchar, $5::varchar,
      $6::varchar, $7::smallint, $8::varchar, $9::varchar, $10::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      p.txtSlNo,
      p.lkpParameterType,
      p.lkpAccountID,
      p.txtGPH,
      p.txtOriginalSlNo,
      p.lkpOriginalParameterType,
      p.PstrUserID,
      p.cursorName,
    ]
  );
}
