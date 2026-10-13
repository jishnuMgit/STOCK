import { Request, Response } from "express";
import pool from "../../../DB/db.js";

const SCREEN_NAME = "pageCustSupCountry";
const MENU_NAME = "Customer/Supplier Country";
const MODULE_ID = "FIN";

type Params = { coId: string; year: string; userId: string };

// Values come from the request, not the session:
//   POST -> req.body, GET -> req.query (a GET has no body)
const getParams = (req: Request): Params => {
  const src = { ...(req.query ?? {}), ...(req.body ?? {}) } as Record<
    string,
    unknown
  >;
  return {
    coId: String(src.coId ?? "").trim(),
    year: String(src.year ?? "").trim(),
    userId: String(src.userId ?? "").trim(),
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
// GET /api/CustomerCountry?coId=..  -> the company's countries
// ------------------------------------------------------------
export const getCountries = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);

  if (!coId) {
    return res
      .status(400)
      .json({ success: false, message: "Company is not selected" });
  }

  try {
    const result = await pool.query(
      `SELECT fcountryid      AS "fCountryID",
              fcountryname    AS "fCountryName",
              fcountryname_a  AS "fCountryName_A",
              fpositionno     AS "fPositionNo"
       FROM dbo.tblcustsupcountry
       WHERE fcoid = $1
       ORDER BY fpositionno, fcountryid`,
      [coId],
    );

    return res.status(200).json({ success: true, countries: result.rows });
  } catch (error: unknown) {
    console.error("Get countries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load countries",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// GET /api/CustomerCountry/used/:id?coId=..  -> do transactions already use this one?
// (the old objCommon.HaveTrans("fCountryID", id))
// ------------------------------------------------------------
export const checkCountryUsed = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { coId } = getParams(req);

  if (!coId) {
    return res
      .status(400)
      .json({ success: false, message: "Company is not selected" });
  }

  try {
    const result = await pool.query(
      `SELECT dbo.havetrans($1::varchar, 'fCountryID', $2::varchar) AS used`,
      [coId, req.params.id],
    );

    return res
      .status(200)
      .json({ success: true, used: result.rows[0]?.used === true });
  } catch (error: unknown) {
    console.error("Check country used error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check the transactions",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// POST /api/CustomerCountry  -> Save / Modify
// body: { coId, year, userId,
//         inserted: [{countryID, countryName, countryNameA, positionNo}],
//         updated:  [{originalCountryID, countryID, countryName, countryNameA, positionNo}],
//         deleted:  [originalCountryID] }
// All or nothing: one transaction (the old BeginTransaction / EndTransaction)
// ------------------------------------------------------------
type NewRow = {
  countryID: string;
  countryName: string;
  countryNameA: string;
  positionNo: number;
};
type ChangedRow = NewRow & { originalCountryID: string };

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
    throw new ApiError(400, "Country name (Arabic) can be 50 characters at most");
  }
  if (!Number.isInteger(positionNo) || positionNo < 0 || positionNo > 32767) {
    throw new ApiError(400, "Position # must be a whole number up to 32767");
  }

  return { countryID, countryName, countryNameA, positionNo };
};

export const saveCountries = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const params = getParams(req);

  if (!params.coId) {
    return res
      .status(400)
      .json({ success: false, message: "Company is not selected" });
  }

  const client = await pool.connect();

  try {
    const body = req.body ?? {};

    const inserted: NewRow[] = (body.inserted ?? []).map(cleanRow);
    const updated: ChangedRow[] = (body.updated ?? []).map((row: any) => ({
      ...cleanRow(row),
      originalCountryID: String(row?.originalCountryID ?? "").trim(),
    }));
    const deleted: string[] = (body.deleted ?? []).map((id: unknown) =>
      String(id ?? "").trim(),
    );

    if (inserted.length + updated.length + deleted.length === 0) {
      throw new ApiError(400, "Nothing to save");
    }

    const haveTrans = async (id: string): Promise<boolean> => {
      const r = await client.query(
        `SELECT dbo.havetrans($1::varchar, 'fCountryID', $2::varchar) AS used`,
        [params.coId, id],
      );
      return r.rows[0]?.used === true;
    };

    // the saved values right now - the procedure compares them with the new
    // ones to write the audit text, and uses them for the delete audit
    const getOriginal = async (id: string) => {
      const r = await client.query(
        `SELECT fcountryid, fcountryname, fcountryname_a
         FROM dbo.tblcustsupcountry
         WHERE fcoid = $1 AND fcountryid = $2`,
        [params.coId, id],
      );
      return r.rows[0] as
        | {
            fcountryid: string;
            fcountryname: string | null;
            fcountryname_a: string | null;
          }
        | undefined;
    };

    const callProc = (
      mode: "S" | "M" | "D",
      countryID: string | null,
      countryName: string | null,
      countryNameA: string | null,
      positionNo: number,
      original: {
        id: string | null;
        name: string | null;
        nameA: string | null;
      },
    ) =>
      client.query(
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
          params.coId,
          countryID,
          countryName,
          countryNameA,
          positionNo,
          original.id,
          original.name,
          original.nameA,
          params.userId || null,
          MENU_NAME,
          SCREEN_NAME,
          MODULE_ID,
        ],
      );

    await client.query("BEGIN");

    // 1) removed rows
    for (const id of deleted) {
      if (await haveTrans(id)) {
        throw new ApiError(
          409,
          `You can't delete. Some transactions already entered with this 'Country' (${id})`,
        );
      }
      const orig = await getOriginal(id);
      if (!orig) continue; // already gone

      // the id is sent twice: the procedure's delete audit reads p_strcountryid
      await callProc("D", orig.fcountryid, null, null, 0, {
        id: orig.fcountryid,
        name: orig.fcountryname,
        nameA: orig.fcountryname_a,
      });
    }

    // 2) changed rows
    for (const row of updated) {
      const orig = await getOriginal(row.originalCountryID);
      if (!orig) {
        throw new ApiError(
          409,
          `Country '${row.originalCountryID}' was changed or removed by someone else. Cancel and try again`,
        );
      }

      if (
        row.countryID !== row.originalCountryID &&
        (await haveTrans(row.originalCountryID))
      ) {
        throw new ApiError(
          409,
          `You can't Modify. Some transactions already entered with this 'Country' (${row.originalCountryID})`,
        );
      }

      await callProc(
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
        "S",
        row.countryID,
        row.countryName,
        row.countryNameA,
        row.positionNo,
        { id: null, name: null, nameA: null },
      );
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

    console.error("Save countries error:", error);

    const code = (error as { code?: string }).code;
    return res.status(code === "23505" ? 409 : 500).json({
      success: false,
      message: code === "23505" ? "Country ID already exists" : errMsg(error),
    });
  } finally {
    client.release();
  }
};
