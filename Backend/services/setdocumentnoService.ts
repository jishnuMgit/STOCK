import type { PoolClient } from "pg";
import pool from "../DB/db.js";

/* =========================================================
   GET DOCUMENT NO LIST (mode 'G')
========================================================= */

export async function getDocumentNoListService(
  PstrCoID: string,
  lkpYear: string,
  lkpBranch: string,
  lkpModule: string
): Promise<any[]> {
  const client: PoolClient = await pool.connect();

  const cursorName =
    `cur_documentno_${Date.now()}_${Math.floor(
      Math.random() * 100000
    )}`;

  try {
    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_setdocumentno(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
        $6::varchar, $7::varchar, $8::varchar, $9::boolean, $10::varchar,
        $11::varchar, $12::smallint, $13::smallint, $14::varchar,
        $15::varchar, $16::refcursor
      )
      `,
      [
        "G",
        PstrCoID,
        lkpYear,
        lkpBranch,
        lkpModule,
        null, null, null, null, null,
        null, null, null, null,
        null,
        cursorName,
      ]
    );

    const result = await client.query(
      `FETCH ALL FROM "${cursorName}"`
    );

    await client.query("COMMIT");

    return result.rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getDocumentNoListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE DOCUMENT NO LIST (one row per document type,
   mode 'S' if new, mode 'M' if it already exists)
========================================================= */

export interface DocumentNoRowPayload {
  lkpDocument: string;
  txtDocPrefix: string | null;
  txtStartSeqNo: string | null;
  chkStrictSerial: boolean;
  lkpMode: string | null;
  lkpResetNo: string | null;
  chkPrintAfterSave: number;
  txtPositionNo: number;
}

export async function saveDocumentNoListService(
  PstrCoID: string,
  lkpYear: string,
  lkpBranch: string,
  lkpModule: string,
  PstrUserID: string,
  rows: DocumentNoRowPayload[]
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const existing = await client.query(
        `
        SELECT 1 FROM dbo.tbldocumentno
        WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3
          AND fmoduleid = $4 AND fdoctype = $5
        `,
        [PstrCoID, lkpYear, lkpBranch, lkpModule, row.lkpDocument]
      );

      const mode = existing.rows.length > 0 ? "M" : "S";

      const cursorName =
        `cur_documentno_${Date.now()}_${Math.floor(
          Math.random() * 100000
        )}`;

      await client.query(
        `
        CALL dbo.sp_setdocumentno(
          $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
          $6::varchar, $7::varchar, $8::varchar, $9::boolean, $10::varchar,
          $11::varchar, $12::smallint, $13::smallint, $14::varchar,
          $15::varchar, $16::refcursor
        )
        `,
        [
          mode,
          PstrCoID,
          lkpYear,
          lkpBranch,
          lkpModule,
          row.lkpDocument,
          row.txtDocPrefix,
          row.txtStartSeqNo,
          row.chkStrictSerial,
          row.lkpMode,
          row.lkpResetNo,
          row.chkPrintAfterSave,
          row.txtPositionNo,
          mode === "M" ? row.lkpDocument : null,
          PstrUserID,
          cursorName,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveDocumentNoListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE ONE ROW (mode 'D1' — a single document type)
========================================================= */

export async function deleteDocumentNoRowService(
  PstrCoID: string,
  lkpYear: string,
  lkpBranch: string,
  lkpModule: string,
  lkpDocument: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  const cursorName =
    `cur_documentno_${Date.now()}_${Math.floor(
      Math.random() * 100000
    )}`;

  try {
    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_setdocumentno(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
        $6::varchar, $7::varchar, $8::varchar, $9::boolean, $10::varchar,
        $11::varchar, $12::smallint, $13::smallint, $14::varchar,
        $15::varchar, $16::refcursor
      )
      `,
      [
        "D1",
        PstrCoID,
        lkpYear,
        lkpBranch,
        lkpModule,
        null, null, null, null, null,
        null, null, null,
        lkpDocument,
        null,
        cursorName,
      ]
    );

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteDocumentNoRowService error:", error);
    throw error;
  } finally {
    client.release();
  }
}
