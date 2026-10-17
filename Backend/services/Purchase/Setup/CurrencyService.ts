// services/Purchase/Setup/CurrencyPageService.ts
// Data access + business rules for the Currency page.
import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

const SCREEN_NAME = "pageCurrency";
const MENU_NAME = "Currency";
const MODULE_ID = "FIN";

// An error with an HTTP status the controller can send back as it is.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Currency = { fCurrency: string };

export type NewRow = { currency: string };
export type ChangedRow = NewRow & { originalCurrency: string };

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

// the company's currencies (the grid)
export const getCurrencies = async (coId: string): Promise<Currency[]> => {
  const { rows } = await pool.query(
    `SELECT fcurrency AS "fCurrency"
       FROM dbo.tblcurrency
      WHERE fcoid = $1
      ORDER BY fcurrency`,
    [coId],
  );
  return rows;
};

// the old objCommon.HaveTrans("fCurrency", id): do transactions already use it?
// `db` is the pool, or the client of a running transaction.
export const haveTrans = async (
  coId: string,
  id: string,
  db: Db = pool,
): Promise<boolean> => {
  const { rows } = await db.query(
    `SELECT dbo.havetrans($1::varchar, 'fCurrency', $2::varchar) AS used`,
    [coId, id],
  );
  return rows[0]?.used === true;
};

// ------------------------------------------------------------
// VALIDATION
// ------------------------------------------------------------

const cleanRow = (row: any): NewRow => {
  const currency = String(row?.currency ?? "")
    .trim()
    .toUpperCase();

  if (!currency) {
    throw new ApiError(400, "Currency is required");
  }
  if (currency.length > 3) {
    throw new ApiError(400, "Currency can be 3 characters at most");
  }

  return { currency };
};

// ------------------------------------------------------------
// SAVE / MODIFY / DELETE
// All or nothing: one transaction (the old BeginTransaction / EndTransaction)
// ------------------------------------------------------------

const callProc = (
  db: Db,
  p: { coId: string; yearNo: number; userId: string },
  mode: "S" | "M" | "D",
  currency: string | null,
  originalCurrency: string | null,
) =>
  db.query(
    `CALL dbo.sp_pagecurrency(
       p_strmode             => $1::varchar,
       p_pstrcoid            => $2::varchar,
       p_gstryear            => $3::smallint,
       p_original_fcurrency  => $4::varchar,
       p_strcurrency         => $5::varchar,
       p_pstruserid          => $6::varchar,
       p_strmenuname         => $7::varchar,
       p_strscreenname       => $8::varchar,
       p_strmoduleid         => $9::varchar)`,
    [
      mode,
      p.coId,
      p.yearNo,
      originalCurrency,
      currency,
      p.userId || null,
      MENU_NAME,
      SCREEN_NAME,
      MODULE_ID,
    ],
  );

export const saveCurrencies = async (p: SavePayload): Promise<void> => {
  // validate everything before a connection / transaction is opened
  const inserted: NewRow[] = (p.inserted ?? []).map(cleanRow);
  const updated: ChangedRow[] = (p.updated ?? []).map((row: any) => ({
    ...cleanRow(row),
    originalCurrency: String(row?.originalCurrency ?? "").trim(),
  }));
  const deleted: string[] = (p.deleted ?? []).map((id) =>
    String(id ?? "").trim(),
  );

  if (inserted.length + updated.length + deleted.length === 0) {
    throw new ApiError(400, "Nothing to save");
  }

  // p_gstryear is a smallint: no year -> 0
  const ctx = {
    coId: p.coId,
    yearNo: Number(p.year) || 0,
    userId: p.userId,
  };

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) removed rows
    //    (the currency is sent as p_strcurrency too: the procedure's delete
    //     audit uses it as the key)
    for (const id of deleted) {
      if (await haveTrans(p.coId, id, client)) {
        throw new ApiError(
          409,
          `You can't delete. Transactions already entered with this Currency (${id})`,
        );
      }
      await callProc(client, ctx, "D", id, id);
    }

    // 2) changed rows
    for (const row of updated) {
      if (await haveTrans(p.coId, row.originalCurrency, client)) {
        throw new ApiError(
          409,
          `You can't Modify. Transactions already entered with this Currency (${row.originalCurrency})`,
        );
      }
      await callProc(client, ctx, "M", row.currency, row.originalCurrency);
    }

    // 3) new rows
    for (const row of inserted) {
      await callProc(client, ctx, "S", row.currency, null);
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
