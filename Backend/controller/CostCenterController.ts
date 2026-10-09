import { Request, Response } from "express";
import pool from "../DB/db.js";

const SCREEN_NAME = "pageCostCenter";
const MENU_NAME = "Cost Center";
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
// GET /api/CostCenter?coId=..  -> the company's cost centers
// ------------------------------------------------------------
export const getCostCenters = async (
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
      `SELECT fccid       AS "fCCID",
              fccname     AS "fCCName",
              fpositionno AS "fPositionNo"
       FROM dbo.tblcostcenter
       WHERE fcoid = $1
       ORDER BY fpositionno, fccid`,
      [coId],
    );

    return res.status(200).json({ success: true, costCenters: result.rows });
  } catch (error: unknown) {
    console.error("Get cost centers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load cost centers",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// GET /api/CostCenter/used/:id?coId=..  -> do transactions already use this one?
// (the old objCommon.HaveTrans("fCCID", id))
// ------------------------------------------------------------
export const checkCostCenterUsed = async (
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
      `SELECT dbo.havetrans($1::varchar, 'fCCID', $2::varchar) AS used`,
      [coId, req.params.id],
    );

    return res
      .status(200)
      .json({ success: true, used: result.rows[0]?.used === true });
  } catch (error: unknown) {
    console.error("Check cost center used error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check the transactions",
      error: errMsg(error),
    });
  }
};

// ------------------------------------------------------------
// POST /api/CostCenter  -> Save / Modify
// body: { coId, year, userId,
//         inserted: [{ccID, ccName, positionNo}],
//         updated:  [{originalCCID, ccID, ccName, positionNo}],
//         deleted:  [originalCCID] }
// All or nothing: one transaction (the old BeginTransaction / EndTransaction)
// ------------------------------------------------------------
type NewRow = { ccID: string; ccName: string; positionNo: number };
type ChangedRow = NewRow & { originalCCID: string };

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

export const saveCostCenters = async (
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
      originalCCID: String(row?.originalCCID ?? "").trim(),
    }));
    const deleted: string[] = (body.deleted ?? []).map((id: unknown) =>
      String(id ?? "").trim(),
    );

    if (inserted.length + updated.length + deleted.length === 0) {
      throw new ApiError(400, "Nothing to save");
    }

    const haveTrans = async (id: string): Promise<boolean> => {
      const r = await client.query(
        `SELECT dbo.havetrans($1::varchar, 'fCCID', $2::varchar) AS used`,
        [params.coId, id],
      );
      return r.rows[0]?.used === true;
    };

    const callProc = (
      mode: "S" | "M" | "D",
      ccID: string | null,
      ccName: string | null,
      positionNo: number,
      originalCCID: string | null,
    ) =>
      client.query(
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
          params.coId,
          params.year || null,
          ccID,
          ccName,
          positionNo,
          originalCCID,
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
          `You can't delete. Some transactions already entered with this 'Cost Center' (${id})`,
        );
      }
      await callProc("D", null, null, 0, id);
    }

    // 2) changed rows
    for (const row of updated) {
      if (row.ccID !== row.originalCCID && (await haveTrans(row.originalCCID))) {
        throw new ApiError(
          409,
          `You can't Modify. Some transactions already entered with this 'Cost Center' (${row.originalCCID})`,
        );
      }
      await callProc("M", row.ccID, row.ccName, row.positionNo, row.originalCCID);
    }

    // 3) new rows
    for (const row of inserted) {
      await callProc("S", row.ccID, row.ccName, row.positionNo, null);
    }

    // the same name twice in the company is not allowed
    const dup = await client.query(
      `SELECT MIN(fccname) AS name
       FROM dbo.tblcostcenter
       WHERE fcoid = $1
       GROUP BY LOWER(fccname)
       HAVING COUNT(*) > 1
       LIMIT 1`,
      [params.coId],
    );
    if (dup.rows.length > 0) {
      throw new ApiError(
        409,
        `'Cost Center Name' already exists (${dup.rows[0].name})`,
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

    console.error("Save cost centers error:", error);

    const code = (error as { code?: string }).code;
    return res.status(code === "23505" ? 409 : 500).json({
      success: false,
      message:
        code === "23505" ? "'Cost Center ID' already exists" : errMsg(error),
    });
  } finally {
    client.release();
  }
};
