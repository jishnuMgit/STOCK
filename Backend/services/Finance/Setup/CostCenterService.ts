// services/Finance/Setup/CostCenterService.ts
// Data access + business rules for the Cost Center page
// (port of frmCostCenter / clsCostCenter / SP_frmCostCenter).
import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

const SCREEN_NAME = "pageCostCenter";
const MENU_NAME = "Cost Center";
const MODULE_ID = "FIN";

// An error with an HTTP status the controller can send back as it is.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type CostCenter = {
  fCCID: string;
  fCCName: string;
  fPositionNo: number | null;
};

export type NewRow = { ccID: string; ccName: string; positionNo: number };
export type ChangedRow = NewRow & { originalCCID: string };

export type SavePayload = {
  coId: string;
  year: string;
  userId: string;
  inserted?: unknown[];
  updated?: unknown[];
  deleted?: unknown[];
};

type Db = Pick<PoolClient, "query">;

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

// the company's cost centers (the grid)
export const getCostCenters = async (coId: string): Promise<CostCenter[]> => {
  const { rows } = await pool.query(
    `SELECT fccid       AS "fCCID",
            fccname     AS "fCCName",
            fpositionno AS "fPositionNo"
       FROM dbo.tblcostcenter
      WHERE fcoid = $1
      ORDER BY fpositionno, fccid`,
    [coId],
  );
  return rows;
};

// the old objCommon.HaveTrans("fCCID", id): do transactions already use it?
// `db` is the pool, or the client of a running transaction.
export const haveTrans = async (
  coId: string,
  id: string,
  db: Db = pool,
): Promise<boolean> => {
  const { rows } = await db.query(
    `SELECT dbo.havetrans($1::varchar, 'fCCID', $2::varchar) AS used`,
    [coId, id],
  );
  return rows[0]?.used === true;
};

// ------------------------------------------------------------
// VALIDATION
// ------------------------------------------------------------

const cleanRow = (row: any): NewRow => {
  const ccID = String(row?.ccID ?? "").trim();
  const ccName = String(row?.ccName ?? "").trim();
  const positionNo = Number(row?.positionNo ?? 0);

  if (!ccID || !ccName) {
    throw new ApiError(
      400,
      "Cost Center ID and Cost Center Name are both required",
    );
  }
  if (ccID.length > 8) {
    throw new ApiError(400, "Cost Center ID can be 8 characters at most");
  }
  if (ccName.length > 80) {
    throw new ApiError(400, "Cost Center Name can be 80 characters at most");
  }
  if (!Number.isInteger(positionNo) || positionNo < 0 || positionNo > 32767) {
    throw new ApiError(400, "Position # must be a whole number up to 32767");
  }

  return { ccID, ccName, positionNo };
};

// ------------------------------------------------------------
// SAVE / MODIFY / DELETE
// All or nothing: one transaction (the old BeginTransaction / EndTransaction)
// ------------------------------------------------------------

const callProc = (
  db: Db,
  p: { coId: string; year: string; userId: string },
  mode: "S" | "M" | "D",
  ccID: string | null,
  ccName: string | null,
  positionNo: number,
  originalCCID: string | null,
) =>
  db.query(
    `CALL dbo.sp_pagecostcenter(
       strmode            => $1::varchar,
       pstrcoid           => $2::varchar,
       pstryear           => $3::varchar,
       strccid            => $4::varchar,
       strccname          => $5::varchar,
       intpositionno      => $6::smallint,
       stroriginal_ccid   => $7::varchar,
       stroriginal_ccname => NULL::varchar,
       pstruserid         => $8::varchar,
       strmenuname        => $9::varchar,
       strscreenname      => $10::varchar,
       strmoduleid        => $11::varchar)`,
    [
      mode,
      p.coId,
      p.year || null,
      ccID,
      ccName,
      positionNo,
      originalCCID,
      p.userId || null,
      MENU_NAME,
      SCREEN_NAME,
      MODULE_ID,
    ],
  );

export const saveCostCenters = async (p: SavePayload): Promise<void> => {
  // validate everything before a connection / transaction is opened
  const inserted: NewRow[] = (p.inserted ?? []).map(cleanRow);
  const updated: ChangedRow[] = (p.updated ?? []).map((row: any) => ({
    ...cleanRow(row),
    originalCCID: String(row?.originalCCID ?? "").trim(),
  }));
  const deleted: string[] = (p.deleted ?? []).map((id) =>
    String(id ?? "").trim(),
  );

  if (inserted.length + updated.length + deleted.length === 0) {
    throw new ApiError(400, "Nothing to save");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) removed rows
    for (const id of deleted) {
      if (await haveTrans(p.coId, id, client)) {
        throw new ApiError(
          409,
          `You can't delete. Some transactions already entered with this 'Cost Center' (${id})`,
        );
      }
      await callProc(client, p, "D", null, null, 0, id);
    }

    // 2) changed rows
    for (const row of updated) {
      if (
        row.ccID !== row.originalCCID &&
        (await haveTrans(p.coId, row.originalCCID, client))
      ) {
        throw new ApiError(
          409,
          `You can't Modify. Some transactions already entered with this 'Cost Center' (${row.originalCCID})`,
        );
      }
      await callProc(
        client,
        p,
        "M",
        row.ccID,
        row.ccName,
        row.positionNo,
        row.originalCCID,
      );
    }

    // 3) new rows
    for (const row of inserted) {
      await callProc(client, p, "S", row.ccID, row.ccName, row.positionNo, null);
    }

    // the same name twice in the company is not allowed
    const dup = await client.query(
      `SELECT MIN(fccname) AS name
         FROM dbo.tblcostcenter
        WHERE fcoid = $1
        GROUP BY LOWER(fccname)
       HAVING COUNT(*) > 1
        LIMIT 1`,
      [p.coId],
    );
    if (dup.rows.length > 0) {
      throw new ApiError(
        409,
        `'Cost Center Name' already exists (${dup.rows[0].name})`,
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
};
