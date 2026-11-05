// services/Finance/Setup/CustomerDivisionService.ts
// Data access + business rules for the Customer Division page (the port of the old frmCustomerDivision /
// clsCustomerDivision). The rules (unique ID and name per customer, a used division cannot be deleted or re-numbered)
// are in dbo.sp_pagecustomerdivision; this file validates the typed values and runs the changed rows in one transaction.
//
// Names: the function is <verb>CustomerDivision..., the values are lkp / txt / Pstr named (the same as the page and the
// request), the f... columns of the table stay in this file.
import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";
import { customerDivisionRowKeys, mapRows } from "../../../utils/responseKeys.js";

const SCREEN_NAME = "Customer Division"; // the caption of the menu (the audit trail names the screen)

type Db = Pick<PoolClient, "query">;

// An error with an HTTP status the controller can send back as it is.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// the values of one division row
export type DivisionValues = {
  txtDivisionID: string | null;
  txtDivisionName: string | null;
  txtDivisionName_AR: string | null;
};

export type NewDivisionRow = {
  txtDivisionID: string;
  txtDivisionName: string;
  txtDivisionName_AR: string;
};
export type ChangedDivisionRow = NewDivisionRow & { txtOriginalDivisionID: string };

export type CustomerDivisionChanges = {
  inserted: NewDivisionRow[];
  updated: ChangedDivisionRow[];
  deleted: string[];
};

export type SaveCustomerDivisionPayload = {
  PstrCoID: string;
  PstrUserID: string;
  lkpCsAccountID: string;
  inserted?: unknown[];
  updated?: unknown[];
  deleted?: unknown[];
};

type SavedDivision = {
  fdivid: string;
  fdivname: string | null;
  fdivname_ar: string | null;
};

const noValues: DivisionValues = {
  txtDivisionID: null,
  txtDivisionName: null,
  txtDivisionName_AR: null,
};

/* ---------------------------------------------------------------- READ */

// the divisions of one customer (the grid): the procedure, mode G
export const fetchCustomerDivisions = async (PstrCoID: string, lkpCsAccountID: string) => {
  const client = await pool.connect();
  const cursorName = "cur_custdivision";

  try {
    await client.query("BEGIN");

    await client.query(
      `CALL dbo.sp_pagecustomerdivision(
         p_strmode        => 'G',
         p_pstrcoid       => $1::varchar,
         p_lkpcsaccountid => $2::varchar,
         p_result         => '${cursorName}')`,
      [PstrCoID, lkpCsAccountID],
    );

    const { rows } = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");
    return mapRows(rows, customerDivisionRowKeys);
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

// the old objCommon.HaveTrans("fDivID", id) - of THIS customer's division
export const haveCustomerDivisionTrans = async (
  PstrCoID: string,
  lkpCsAccountID: string,
  txtDivisionID: string,
): Promise<boolean> => {
  const { rows } = await pool.query(
    `SELECT dbo.havecustomerdivisiontrans($1::varchar, $2::varchar, $3::varchar) AS used`,
    [PstrCoID, lkpCsAccountID, txtDivisionID],
  );
  return rows[0]?.used === true;
};

// the saved values right now: the row a change is made on must still be there, and the procedure writes the audit text
// from them
const getSavedCustomerDivision = async (
  db: Db,
  PstrCoID: string,
  lkpCsAccountID: string,
  txtDivisionID: string,
): Promise<SavedDivision | undefined> => {
  const { rows } = await db.query(
    `SELECT fdivid, fdivname, fdivname_ar
       FROM dbo.tblcustdivision
      WHERE fcoid = $1 AND fcustomerid = $2 AND fdivid = $3`,
    [PstrCoID, lkpCsAccountID, txtDivisionID],
  );
  return rows[0] as SavedDivision | undefined;
};

/* ---------------------------------------------------------- VALIDATION */

const cleanDivisionRow = (row: any): NewDivisionRow => {
  const txtDivisionID = String(row?.txtDivisionID ?? "").trim();
  const txtDivisionName = String(row?.txtDivisionName ?? "").trim();
  const txtDivisionName_AR = String(row?.txtDivisionName_AR ?? "").trim();

  if (!txtDivisionID || !txtDivisionName) {
    throw new ApiError(400, "Division ID and Division Name are both required");
  }
  if (txtDivisionID.length > 8) {
    throw new ApiError(400, "Division ID can be 8 characters at most");
  }
  if (txtDivisionName.length > 60) {
    throw new ApiError(400, "Division Name can be 60 characters at most");
  }
  if (txtDivisionName_AR.length > 60) {
    throw new ApiError(400, "Division Name (Arabic) can be 60 characters at most");
  }

  return { txtDivisionID, txtDivisionName, txtDivisionName_AR };
};

// what the save asks for, validated - the controller checks the Save / Modify / Delete rights with it before any change
export const prepareCustomerDivisionSave = (
  payload: SaveCustomerDivisionPayload,
): CustomerDivisionChanges => {
  if (!payload.lkpCsAccountID) {
    throw new ApiError(400, "Please select 'Customer'");
  }

  const inserted = (payload.inserted ?? []).map(cleanDivisionRow);
  const updated: ChangedDivisionRow[] = (payload.updated ?? []).map((row: any) => ({
    ...cleanDivisionRow(row),
    txtOriginalDivisionID: String(row?.txtOriginalDivisionID ?? "").trim(),
  }));
  const deleted = (payload.deleted ?? []).map((txtDivisionID) =>
    String(txtDivisionID ?? "").trim(),
  );

  if (inserted.length + updated.length + deleted.length === 0) {
    throw new ApiError(400, "Nothing to save");
  }
  if (updated.some((row) => !row.txtOriginalDivisionID) || deleted.some((id) => !id)) {
    throw new ApiError(400, "The original Division ID is missing");
  }

  return { inserted, updated, deleted };
};

/* ------------------------------------------------ SAVE / MODIFY / DELETE
   All or nothing: one transaction (the old BeginTransaction / EndTransaction).
   Removed rows first, then changed rows, then new rows - the order of the old DataAdapter. */

const callCustomerDivisionProc = (
  db: Db,
  payload: SaveCustomerDivisionPayload,
  strMode: "S" | "M" | "D",
  now: DivisionValues,
  original: DivisionValues,
) =>
  db.query(
    `CALL dbo.sp_pagecustomerdivision(
       p_strmode                     => $1::varchar,
       p_pstrcoid                    => $2::varchar,
       p_lkpcsaccountid              => $3::varchar,
       p_txtdivisionid               => $4::varchar,
       p_txtdivisionname             => $5::varchar,
       p_txtdivisionname_ar           => $6::varchar,
       p_txtoriginaldivisionid       => $7::varchar,
       p_txtoriginaldivisionname     => $8::varchar,
       p_txtoriginaldivisionname_ar   => $9::varchar,
       p_pstrscreenname              => $10::varchar,
       p_pstruserid                  => $11::varchar)`,
    [
      strMode,
      payload.PstrCoID,
      payload.lkpCsAccountID,
      now.txtDivisionID,
      now.txtDivisionName,
      now.txtDivisionName_AR,
      original.txtDivisionID,
      original.txtDivisionName,
      original.txtDivisionName_AR,
      SCREEN_NAME,
      payload.PstrUserID || null,
    ],
  );

export const saveCustomerDivisionChanges = async (
  payload: SaveCustomerDivisionPayload,
  changes: CustomerDivisionChanges,
): Promise<void> => {
  const { PstrCoID, lkpCsAccountID } = payload;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) removed rows
    for (const txtDivisionID of changes.deleted) {
      const saved = await getSavedCustomerDivision(client, PstrCoID, lkpCsAccountID, txtDivisionID);
      if (!saved) continue; // already gone

      await callCustomerDivisionProc(client, payload, "D", noValues, {
        txtDivisionID: saved.fdivid,
        txtDivisionName: saved.fdivname,
        txtDivisionName_AR: saved.fdivname_ar,
      });
    }

    // 2) changed rows
    for (const row of changes.updated) {
      const saved = await getSavedCustomerDivision(
        client,
        PstrCoID,
        lkpCsAccountID,
        row.txtOriginalDivisionID,
      );

      await callCustomerDivisionProc(client, payload, "M", row, {
        txtDivisionID: row.txtOriginalDivisionID,
        txtDivisionName: saved?.fdivname ?? null,
        txtDivisionName_AR: saved?.fdivname_ar ?? null,
      });
    }

    // 3) new rows
    for (const row of changes.inserted) {
      await callCustomerDivisionProc(client, payload, "S", row, noValues);
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
