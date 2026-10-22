import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   ADMINISTRATION > DOCUMENT - calls dbo.sp_pagedocument (the port of the old
   SP_frmDocument). The grid is the documents (document types) of a module of the
   logged-in company: type, name, "to be post" and position. Add, change (the type
   too) and delete, in ONE transaction. The module list is dbo.fillmodule, the
   same function Set Document No. uses.
========================================================= */

export type AdministrationDocumentRow = {
  fmoduleid: string;
  fdoctype: string;
  fdocname: string | null;
  fpositionno: number | null;
  ftobepost: boolean | null;
};

// one row of the grid, as the page sends it. chkSaved = the row was loaded from
// the server (so it is a change), and txtOriginalDocType is the type it had then
export type AdministrationDocumentRowPayload = {
  txtDocType: string;
  txtOriginalDocType?: string | null;
  txtDocName: string;
  chkToBePost?: boolean;
  txtPositionNo?: string | number | null;
  chkSaved?: boolean;
};

export type AdministrationDocumentSaved = {
  mode: "S" | "M" | "D";
  txtDocType: string;
  note: string;
};

// "" / null = no position (the old form saved 0)
export const toPositionNo = (value: unknown): number => {
  const text = String(value ?? "").trim();

  return text === "" ? 0 : Number(text);
};

async function fetchDocuments(
  client: PoolClient,
  PstrCoID: string,
  lkpModule: string
): Promise<AdministrationDocumentRow[]> {
  const cursorName =
    `cur_document_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await client.query(
    `
    CALL dbo.sp_pagedocument(
      p_strmode       => 'G'::varchar,
      p_pstrcoid      => $1::varchar,
      p_strmoduleid   => $2::varchar,
      p_result_cursor => $3::refcursor
    )
    `,
    [PstrCoID, lkpModule, cursorName]
  );

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows as AdministrationDocumentRow[];
}

/* =========================================================
   THE SCREEN: the modules (the Module dropdown) and the documents of one module.
   When no module is asked for, the first one is used (as the old form did).
========================================================= */

export async function getAdministrationDocumentService(
  PstrCoID: string,
  lkpModule: string | null
): Promise<{
  modules: { fmoduleid: string; fmodulename: string }[];
  lkpModule: string;
  documents: AdministrationDocumentRow[];
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const modules = await client.query(
      `SELECT fmoduleid, fmodulename FROM dbo.fillmodule($1::varchar)`,
      [PstrCoID]
    );

    const chosen =
      modules.rows.find((row) => row.fmoduleid === lkpModule)?.fmoduleid ??
      modules.rows[0]?.fmoduleid ??
      "";

    const documents = chosen
      ? await fetchDocuments(client, PstrCoID, chosen)
      : [];

    await client.query("COMMIT");

    return { modules: modules.rows, lkpModule: chosen, documents };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getAdministrationDocumentService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE / MODIFY - D for a document taken out of the list on the screen (done
   FIRST so a new row can use its type), S for a new row, M for a saved row whose
   type, name, To Be Post or position changed. All in ONE transaction. Returns what
   was done (with the audit note of each).
========================================================= */

export async function saveAdministrationDocumentService(data: {
  PstrCoID: string;
  PstrUserID: string;
  lkpModule: string;
  rows: AdministrationDocumentRowPayload[];
  deletedRows?: { txtDocType: string }[];
}): Promise<AdministrationDocumentSaved[]> {
  const client: PoolClient = await pool.connect();
  const done: AdministrationDocumentSaved[] = [];

  try {
    await client.query("BEGIN");

    // what the documents of the module are now (for "changed from ... to ...")
    const current = await fetchDocuments(client, data.PstrCoID, data.lkpModule);

    const call = (
      mode: "S" | "M" | "D",
      docType: string,
      docName: string | null,
      toBePost: boolean,
      position: number,
      originalDocType: string | null
    ) =>
      client.query(
        `
        CALL dbo.sp_pagedocument(
          p_strmode              => $1::varchar,
          p_pstrcoid             => $2::varchar,
          p_strmoduleid          => $3::varchar,
          p_strdoctype           => $4::varchar,
          p_strdocname           => $5::varchar,
          p_blntobepost          => $6::boolean,
          p_intposition          => $7::smallint,
          p_stroriginal_doctype  => $8::varchar,
          p_pstruserid           => $9::varchar
        )
        `,
        [
          mode,
          data.PstrCoID,
          data.lkpModule,
          docType,
          docName,
          toBePost,
          position,
          originalDocType,
          data.PstrUserID,
        ]
      );

    for (const removed of data.deletedRows ?? []) {
      const before = current.find(
        (doc) => doc.fdoctype === String(removed.txtDocType).trim()
      );

      if (!before) {
        throw new Error(`Document '${removed.txtDocType}' not found`);
      }

      await call("D", before.fdoctype, null, false, 0, null);

      done.push({
        mode: "D",
        txtDocType: before.fdoctype,
        note: `Document ${before.fdoctype} (${before.fdocname ?? ""}) deleted`,
      });
    }

    for (const row of data.rows) {
      const txtDocType = String(row.txtDocType).trim();
      const txtDocName = String(row.txtDocName).trim();
      const chkToBePost = row.chkToBePost === true;
      const txtPositionNo = toPositionNo(row.txtPositionNo);

      const mode = row.chkSaved ? "M" : "S";

      // a saved row is found by the type it had when it was loaded (the type can
      // be changed here); a new row has no original
      const originalType =
        String(row.txtOriginalDocType ?? "").trim() || txtDocType;

      const before =
        mode === "M"
          ? current.find((doc) => doc.fdoctype === originalType)
          : undefined;

      if (mode === "M" && !before) {
        throw new Error(`Document '${originalType}' not found`);
      }

      let note = "";

      if (mode === "M" && before) {
        const changes: string[] = [];

        if (before.fdoctype !== txtDocType) {
          changes.push(`Type changed from ${before.fdoctype} to ${txtDocType}`);
        }

        if ((before.fdocname ?? "") !== txtDocName) {
          changes.push(
            `Name changed from ${before.fdocname ?? ""} to ${txtDocName}`
          );
        }

        if ((before.ftobepost ?? false) !== chkToBePost) {
          changes.push(
            `To Be Post changed from ${before.ftobepost ? "Yes" : "No"} to ${chkToBePost ? "Yes" : "No"}`
          );
        }

        if ((before.fpositionno ?? 0) !== txtPositionNo) {
          changes.push(
            `Position No. changed from ${before.fpositionno ?? 0} to ${txtPositionNo}`
          );
        }

        // nothing really changed: no call, no audit
        if (changes.length === 0) continue;

        note = `Document ${txtDocType} : ${changes.join("; ")}`;
      } else {
        note = `Document ${txtDocType} (${txtDocName}) added, To Be Post ${chkToBePost ? "Yes" : "No"}, Position No. ${txtPositionNo}`;
      }

      await call(
        mode,
        txtDocType,
        txtDocName,
        chkToBePost,
        txtPositionNo,
        before?.fdoctype ?? null
      );

      done.push({ mode, txtDocType, note });
    }

    await client.query("COMMIT");

    return done;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveAdministrationDocumentService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the same words as the other screens: the new documents were saved, the saved
// ones modified - one taken out of the list is a modification too
export const buildAdministrationDocumentMessage = (
  saved: AdministrationDocumentSaved[]
): string => {
  // the x of a row deletes at once: a request that only deleted
  if (saved.length > 0 && saved.every((entry) => entry.mode === "D")) {
    return "Document deleted successfully";
  }

  const added = saved.some((entry) => entry.mode === "S");
  const modified = saved.some(
    (entry) => entry.mode === "M" || entry.mode === "D"
  );

  if (added && modified) return "Document saved and modified successfully";
  if (modified) return "Document modified successfully";

  return "Document saved successfully";
};
