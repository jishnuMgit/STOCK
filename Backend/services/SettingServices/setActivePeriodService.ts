import type { PoolClient } from "pg";
import pool from "../../DB/db.js";
import { resolveServerDate } from "../common/DateTimeService.js";

/* =========================================================
   SET ACTIVE PERIOD - calls dbo.sp_pagesetactiveperiod
   (modes: G list, M update the dates of a branch)
========================================================= */

// the dates are text yyyy-mm-dd (the procedure formats them), so no time zone
// can move a day
export type ActivePeriodRow = {
  fbrid: string;
  fbrname: string | null;
  factivefromdate: string | null;
  factivetodate: string | null;
};

// one row of the grid as the page sends it
export interface ActivePeriodRowPayload {
  txtBranchID: string;
  dtpFromDate: string;
  dtpToDate: string;
}

// what changed in a branch (for the audit note)
export interface ActivePeriodChange {
  txtBranchID: string;
  beforeFrom: string;
  beforeTo: string;
  dtpFromDate: string;
  dtpToDate: string;
}

/* =========================================================
   GET ACTIVE PERIODS (mode 'G')
   Only the branches the logged-in user has a right to.
========================================================= */

export async function getActivePeriodListService(
  PstrCoID: string,
  PstrUserID: string
): Promise<ActivePeriodRow[]> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await fetchActivePeriodRows(client, PstrCoID, PstrUserID);

    await client.query("COMMIT");

    return rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getActivePeriodListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// one place that runs mode 'G' - the page load and the save (to compare the
// grid with what is saved) both use it
async function fetchActivePeriodRows(
  client: PoolClient,
  PstrCoID: string,
  PstrUserID: string
): Promise<ActivePeriodRow[]> {
  const cursorName =
    `cur_setactiveperiod_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpActivePeriod(client, {
    strmode: "G",
    PstrCoID,
    PstrUserID,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows;
}

/* =========================================================
   SAVE ACTIVE PERIODS
     mode 'M' a branch whose From or To date changed

   The page sends every row. Each is compared with what is saved: only a
   branch whose dates differ is updated. One transaction.
========================================================= */

export async function saveActivePeriodService(
  PstrCoID: string,
  rows: ActivePeriodRowPayload[],
  PstrUserID: string,
  // the time the page got from /datetime/server-date (checked here; the server's own time when it is missing or wrong)
  dtpServerDate?: string
): Promise<{ changed: ActivePeriodChange[]; anything: boolean }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // one time for every branch of this save
    const serverDate = await resolveServerDate(client, dtpServerDate);

    const saved = await fetchActivePeriodRows(client, PstrCoID, PstrUserID);
    const savedByBranch = new Map(saved.map((row) => [row.fbrid, row]));

    const changed: ActivePeriodChange[] = [];

    for (const row of rows) {
      const txtBranchID = row.txtBranchID.trim();
      const before = savedByBranch.get(txtBranchID);

      if (!before) {
        throw new Error(`Branch '${txtBranchID}' not found`);
      }

      const dtpFromDate = row.dtpFromDate.trim();
      const dtpToDate = row.dtpToDate.trim();

      if (
        dtpFromDate !== (before.factivefromdate ?? "") ||
        dtpToDate !== (before.factivetodate ?? "")
      ) {
        changed.push({
          txtBranchID,
          beforeFrom: before.factivefromdate ?? "",
          beforeTo: before.factivetodate ?? "",
          dtpFromDate,
          dtpToDate,
        });
      }
    }

    for (const item of changed) {
      await callSpActivePeriod(client, {
        strmode: "M",
        PstrCoID,
        txtBranchID: item.txtBranchID,
        dtpFromDate: item.dtpFromDate,
        dtpToDate: item.dtpToDate,
        PstrUserID,
        serverDate,
      });
    }

    await client.query("COMMIT");

    return { changed, anything: changed.length > 0 };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveActivePeriodService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER - call dbo.sp_pagesetactiveperiod with named arguments,
   so a mode only passes what it uses
========================================================= */

async function callSpActivePeriod(
  client: PoolClient,
  p: {
    strmode: string;
    PstrCoID: string;
    txtBranchID?: string;
    dtpFromDate?: string;
    dtpToDate?: string;
    PstrUserID?: string;
    // the time written on the row (fmuserdate); null = the procedure's own now()
    serverDate?: string | null;
    cursorName?: string;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pagesetactiveperiod(
      p_strmode       => $1::varchar,
      p_pstrcoid      => $2::varchar,
      p_strbrid       => $3::varchar,
      p_dtpfromdate   => $4::date,
      p_dtptodate     => $5::date,
      p_pstruserid    => $6::varchar,
      p_dtpserverdate => $7::timestamp,
      p_result_cursor => $8::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      p.txtBranchID ?? null,
      p.dtpFromDate ?? null,
      p.dtpToDate ?? null,
      p.PstrUserID ?? null,
      p.serverDate ?? null,
      p.cursorName ??
        `cur_setactiveperiod_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ]
  );
}
