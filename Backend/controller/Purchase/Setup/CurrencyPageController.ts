import { Response } from "express";
import pool from "../../../DB/db.js";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";

const SCREEN_NAME = "pageCurrency";
const MENU_NAME = "Currency";
const MODULE_ID = "FIN";

type Params = { coId: string; year: string; userId: string };

// CoID and userId come from the logged-in user (auth middleware), never from
// the request body / query, so a caller cannot act on another company.
// year is not in the session, so it still comes from the request:
//   POST -> req.body, GET -> req.query (a GET has no body)
// STOPGAP: falls back to coId / userId sent by the page until the router uses
// the auth middleware and the page sends the token. Then remove the
// `?? src.coId` and `?? src.userId` parts.
const getParams = (req: AuthenticatedRequest): Params => {
  const src = { ...(req.query ?? {}), ...(req.body ?? {}) } as Record<
    string,
    unknown
  >;
  return {
    coId: String(req.user?.CoID ?? src.coId ?? "").trim(),
    year: String(src.year ?? "").trim(),
    userId: String((req.user as any)?.userId ?? src.userId ?? "").trim(),
  };
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ------------------------------------------------------------
// GET /api/Currency?coId=..  -> the company's currencies
// ------------------------------------------------------------
export const getCurrencies = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);

  if (!coId) {
    return res
      .status(401)
      .json({ success: false, message: "Company not found in session" });
  }

  try {
    const result = await pool.query(
      `SELECT fcurrency AS "fCurrency"
       FROM dbo.tblcurrency
       WHERE fcoid = $1
       ORDER BY fcurrency`,
      [coId],
    );

    return res.status(200).json({ success: true, currencies: result.rows });
  } catch (error: unknown) {
    console.error("Get currencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load currencies",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// GET /api/Currency/used/:id?coId=..  -> do transactions already use this one?
// (the old objCommon.HaveTrans("fCurrency", id))
// ------------------------------------------------------------
export const checkCurrencyUsed = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);

  if (!coId) {
    return res
      .status(401)
      .json({ success: false, message: "Company not found in session" });
  }

  try {
    const result = await pool.query(
      `SELECT dbo.havetrans($1::varchar, 'fCurrency', $2::varchar) AS used`,
      [coId, req.params.id],
    );

    return res
      .status(200)
      .json({ success: true, used: result.rows[0]?.used === true });
  } catch (error: unknown) {
    console.error("Check currency used error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check the transactions",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// POST /api/Currency  -> Save / Modify
// body: { coId, year, userId,
//         inserted: [{currency}],
//         updated:  [{originalCurrency, currency}],
//         deleted:  [originalCurrency] }
// All or nothing: one transaction (the old BeginTransaction / EndTransaction)
// ------------------------------------------------------------
type NewRow = { currency: string };
type ChangedRow = NewRow & { originalCurrency: string };

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

export const saveCurrencies = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const params = getParams(req);

  if (!params.coId) {
    return res
      .status(401)
      .json({ success: false, message: "Company not found in session" });
  }

  const client = await pool.connect();

  try {
    const body = req.body ?? {};

    const inserted: NewRow[] = (body.inserted ?? []).map(cleanRow);
    const updated: ChangedRow[] = (body.updated ?? []).map((row: any) => ({
      ...cleanRow(row),
      originalCurrency: String(row?.originalCurrency ?? "").trim(),
    }));
    const deleted: string[] = (body.deleted ?? []).map((id: unknown) =>
      String(id ?? "").trim(),
    );

    if (inserted.length + updated.length + deleted.length === 0) {
      throw new ApiError(400, "Nothing to save");
    }

    const haveTrans = async (id: string): Promise<boolean> => {
      const r = await client.query(
        `SELECT dbo.havetrans($1::varchar, 'fCurrency', $2::varchar) AS used`,
        [params.coId, id],
      );
      return r.rows[0]?.used === true;
    };

    // p_gstryear is a smallint: no year -> 0
    const yearNo = Number(params.year) || 0;

    const callProc = (
      mode: "S" | "M" | "D",
      currency: string | null,
      originalCurrency: string | null,
    ) =>
      client.query(
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
          params.coId,
          yearNo,
          originalCurrency,
          currency,
          params.userId || null,
          MENU_NAME,
          SCREEN_NAME,
          MODULE_ID,
        ],
      );

    await client.query("BEGIN");

    // 1) removed rows
    //    (the currency is sent as p_strcurrency too: the procedure's delete
    //     audit uses it as the key)
    for (const id of deleted) {
      if (await haveTrans(id)) {
        throw new ApiError(
          409,
          `You can't delete. Transactions already entered with this Currency (${id})`,
        );
      }
      await callProc("D", id, id);
    }

    // 2) changed rows
    for (const row of updated) {
      if (await haveTrans(row.originalCurrency)) {
        throw new ApiError(
          409,
          `You can't Modify. Transactions already entered with this Currency (${row.originalCurrency})`,
        );
      }
      await callProc("M", row.currency, row.originalCurrency);
    }

    // 3) new rows
    for (const row of inserted) {
      await callProc("S", row.currency, null);
    }

    await client.query("COMMIT");
    return res.status(200).json({ success: true, message: "Saved" });
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    if (error instanceof ApiError) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }

    console.error("Save currencies error:", error);

    const code = (error as { code?: string }).code;
    return res.status(code === "23505" ? 409 : 500).json({
      success: false,
      message: code === "23505" ? "Currency already exists" : errMsg(error),
    });
  } finally {
    client.release();
  }
};