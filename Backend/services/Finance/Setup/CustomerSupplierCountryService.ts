// services/Finance/Setup/CustomerSupplierCountryService.ts
// Data access + business rules for the Customer/Supplier Country page.
import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

const SCREEN_NAME = "pageCustSupCountry";
const MENU_NAME = "Customer/Supplier Country";
const MODULE_ID = "FIN";

// An error with an HTTP status the controller can send back as it is.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Country = {
  fCountryID: string;
  fCountryName: string;
  fCountryName_A: string | null;
  fPositionNo: number | null;
};

export type NewRow = {
  countryID: string;
  countryName: string;
  countryNameA: string;
  positionNo: number;
};
export type ChangedRow = NewRow & { originalCountryID: string };

export type SavePayload = {
  coId: string;
  userId: string;
  inserted?: unknown[];
  updated?: unknown[];
  deleted?: unknown[];
};

type Db = Pick<PoolClient, "query">;

type Original = {
  fcountryid: string;
  fcountryname: string | null;
  fcountryname_a: string | null;
};

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

// the company's countries (the grid)
export const getCountries = async (coId: string): Promise<Country[]> => {
  const { rows } = await pool.query(
    `SELECT fcountryid      AS "fCountryID",
            fcountryname    AS "fCountryName",
            fcountryname_a  AS "fCountryName_A",
            fpositionno     AS "fPositionNo"
       FROM dbo.tblcustsupcountry
      WHERE fcoid = $1
      ORDER BY fpositionno, fcountryid`,
    [coId],
  );
  return rows;
};

// the old objCommon.HaveTrans("fCountryID", id): do transactions already use it?
// `db` is the pool, or the client of a running transaction.
export const haveTrans = async (
  coId: string,
  id: string,
  db: Db = pool,
): Promise<boolean> => {
  const { rows } = await db.query(
    `SELECT dbo.havetrans($1::varchar, 'fCountryID', $2::varchar) AS used`,
    [coId, id],
  );
  return rows[0]?.used === true;
};

// the saved values right now - the procedure compares them with the new
// ones to write the audit text, and uses them for the delete audit
const getOriginal = async (
  db: Db,
  coId: string,
  id: string,
): Promise<Original | undefined> => {
  const { rows } = await db.query(
    `SELECT fcountryid, fcountryname, fcountryname_a
       FROM dbo.tblcustsupcountry
      WHERE fcoid = $1 AND fcountryid = $2`,
    [coId, id],
  );
  return rows[0] as Original | undefined;
};

// ------------------------------------------------------------
// VALIDATION
// ------------------------------------------------------------

const cleanRow = (row: any): NewRow => {
  const countryID = String(row?.countryID ?? "").trim();
  const countryName = String(row?.countryName ?? "").trim();
  const countryNameA = String(row?.countryNameA ?? "").trim();
  const positionNo = Number(row?.positionNo ?? 0);

  if (!countryID || !countryName) {
    throw new ApiError(400, "Country ID and Country name are both required");
  }
  if (countryID.length > 4) {
    throw new ApiError(400, "Country ID can be 4 characters at most");
  }
  if (countryName.length > 50) {
    throw new ApiError(400, "Country name can be 50 characters at most");
  }
  if (countryNameA.length > 50) {
    throw new ApiError(
      400,
      "Country name (Arabic) can be 50 characters at most",
    );
  }
  if (!Number.isInteger(positionNo) || positionNo < 0 || positionNo > 32767) {
    throw new ApiError(400, "Position # must be a whole number up to 32767");
  }

  return { countryID, countryName, countryNameA, positionNo };
};

// ------------------------------------------------------------
// SAVE / MODIFY / DELETE
// All or nothing: one transaction (the old BeginTransaction / EndTransaction)
// ------------------------------------------------------------

const callProc = (
  db: Db,
  p: { coId: string; userId: string },
  mode: "S" | "M" | "D",
  countryID: string | null,
  countryName: string | null,
  countryNameA: string | null,
  positionNo: number,
  original: { id: string | null; name: string | null; nameA: string | null },
) =>
  db.query(
    `CALL dbo.sp_pagecustsupcountry(
       p_strmode                => $1::varchar,
       p_pstrcoid               => $2::varchar,
       p_strcountryid           => $3::varchar,
       p_strcountryname         => $4::varchar,
       p_strcountryname_a       => $5::varchar,
       p_intposition            => $6::smallint,
       p_orginal_countryid      => $7::varchar,
       p_orginal_countryname    => $8::varchar,
       p_orginal_countryname_a  => $9::varchar,
       p_pstruserid             => $10::varchar,
       p_strmenuname            => $11::varchar,
       p_strscreenname          => $12::varchar,
       p_strmoduleid            => $13::varchar)`,
    [
      mode,
      p.coId,
      countryID,
      countryName,
      countryNameA,
      positionNo,
      original.id,
      original.name,
      original.nameA,
      p.userId || null,
      MENU_NAME,
      SCREEN_NAME,
      MODULE_ID,
    ],
  );

export const saveCountries = async (p: SavePayload): Promise<void> => {
  // validate everything before a connection / transaction is opened
  const inserted: NewRow[] = (p.inserted ?? []).map(cleanRow);
  const updated: ChangedRow[] = (p.updated ?? []).map((row: any) => ({
    ...cleanRow(row),
    originalCountryID: String(row?.originalCountryID ?? "").trim(),
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
          `You can't delete. Some transactions already entered with this 'Country' (${id})`,
        );
      }
      const orig = await getOriginal(client, p.coId, id);
      if (!orig) continue; // already gone

      // the id is sent twice: the procedure's delete audit reads p_strcountryid
      await callProc(client, p, "D", orig.fcountryid, null, null, 0, {
        id: orig.fcountryid,
        name: orig.fcountryname,
        nameA: orig.fcountryname_a,
      });
    }

    // 2) changed rows
    for (const row of updated) {
      const orig = await getOriginal(client, p.coId, row.originalCountryID);
      if (!orig) {
        throw new ApiError(
          409,
          `Country '${row.originalCountryID}' was changed or removed by someone else. Cancel and try again`,
        );
      }

      if (
        row.countryID !== row.originalCountryID &&
        (await haveTrans(p.coId, row.originalCountryID, client))
      ) {
        throw new ApiError(
          409,
          `You can't Modify. Some transactions already entered with this 'Country' (${row.originalCountryID})`,
        );
      }

      await callProc(
        client,
        p,
        "M",
        row.countryID,
        row.countryName,
        row.countryNameA,
        row.positionNo,
        {
          id: orig.fcountryid,
          name: orig.fcountryname,
          nameA: orig.fcountryname_a,
        },
      );
    }

    // 3) new rows
    for (const row of inserted) {
      await callProc(
        client,
        p,
        "S",
        row.countryID,
        row.countryName,
        row.countryNameA,
        row.positionNo,
        { id: null, name: null, nameA: null },
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
