import type { PoolClient } from "pg";
import pool from "../DB/db.js";

/* =========================================================
   GET DOCUMENT NO LIST (mode 'G')
========================================================= */

export async function getDocumentNoListService(
  coId: string,
  year: string,
  brId: string,
  moduleId: string
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
        coId,
        year,
        brId,
        moduleId,
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
  docType: string;
  docNoPrefix: string | null;
  startSeqNo: string | null;
  strictSerialSeqNo: boolean;
  seqNoIncrementMode: string | null;
  seqNoResetMode: string | null;
  printAfterSave: number;
  positionNo: number;
}

export async function saveDocumentNoListService(
  coId: string,
  year: string,
  brId: string,
  moduleId: string,
  userId: string,
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
        [coId, year, brId, moduleId, row.docType]
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
          coId,
          year,
          brId,
          moduleId,
          row.docType,
          row.docNoPrefix,
          row.startSeqNo,
          row.strictSerialSeqNo,
          row.seqNoIncrementMode,
          row.seqNoResetMode,
          row.printAfterSave,
          row.positionNo,
          mode === "M" ? row.docType : null,
          userId,
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
  coId: string,
  year: string,
  brId: string,
  moduleId: string,
  docType: string
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
        coId,
        year,
        brId,
        moduleId,
        null, null, null, null, null,
        null, null, null,
        docType,
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

