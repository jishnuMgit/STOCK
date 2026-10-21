import pool from "../DB/db.js";
import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   ADMINISTRATION > DOCUMENT - validations (what the old form checked, and what
   the server must check again). The first rule that fails is returned, with the
   field to put the cursor on (the element id / name on the page).

   Only the changed rows are sent. A saved row is a change of a document that
   exists in the module; a new row is a document that does not. The document type
   is unique across the WHOLE company (it is the key of the table); the document
   name is unique within the module (the old grid showed one module). Uniqueness
   is checked on the documents AS THEY WILL BE after the save: the documents now,
   without the deleted ones, with the sent rows put over them.
========================================================= */

const MAX_TYPE_LENGTH = 5;
const MAX_NAME_LENGTH = 40;
const MAX_POSITION_NO = 32767; // smallint

export async function validateAdministrationDocument(data: {
  PstrCoID?: unknown;
  PstrUserID?: unknown;
  lkpModule?: unknown;
  rows?: unknown;
  // the documents taken out of the list on the screen (deleted by this save)
  deletedRows?: unknown;
}): Promise<ValidationResult> {
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "btnSave", 403);
  }

  const PstrCoID = String(data.PstrCoID ?? "").trim();

  const companyResult = await pool.query(
    `SELECT 1 FROM dbo.tblcompany WHERE fcoid = $1`,
    [PstrCoID]
  );

  if (companyResult.rowCount === 0) {
    return failed(`Company '${PstrCoID}' not found`, "btnSave", 404);
  }

  // the old ValidateMe
  const lkpModule = String(data.lkpModule ?? "").trim();

  if (isNullOrEmpty(lkpModule)) {
    return failed("Please select 'Module'", "lkpModule");
  }

  const moduleResult = await pool.query(
    `SELECT 1 FROM dbo.tblmodule WHERE fcoid = $1 AND fmoduleid = $2`,
    [PstrCoID, lkpModule]
  );

  if (moduleResult.rowCount === 0) {
    return failed(`Module '${lkpModule}' not found`, "lkpModule", 404);
  }

  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  const deletedRows = Array.isArray(data.deletedRows)
    ? (data.deletedRows as Record<string, unknown>[])
    : [];

  if (rows.length === 0 && deletedRows.length === 0) {
    return failed("There is no data to save", "btnSave");
  }

  // ---------- each row on its own ----------

  for (const row of rows) {
    const type = String(row.txtDocType ?? "").trim();
    const name = String(row.txtDocName ?? "").trim();

    if (isNullOrEmpty(type)) {
      return failed("Please enter the 'Document Type'", "txtDocType");
    }

    if (type.length > MAX_TYPE_LENGTH) {
      return failed(
        `The 'Document Type' can have at most ${MAX_TYPE_LENGTH} characters`,
        "txtDocType"
      );
    }

    if (isNullOrEmpty(name)) {
      return failed(`Please enter the 'Document' name of '${type}'`, "txtDocName");
    }

    if (name.length > MAX_NAME_LENGTH) {
      return failed(
        `The 'Document' name can have at most ${MAX_NAME_LENGTH} characters`,
        "txtDocName"
      );
    }

    const position = String(row.txtPositionNo ?? "").trim();

    if (
      position !== "" &&
      (!/^\d+$/.test(position) || Number(position) > MAX_POSITION_NO)
    ) {
      return failed(
        `The 'Position No.' must be a whole number from 0 to ${MAX_POSITION_NO}`,
        "txtPositionNo"
      );
    }
  }

  // ---------- the documents as they will be after the save ----------

  const existingResult = await pool.query(
    `SELECT fdoctype, fdocname, fmoduleid FROM dbo.tbldocument WHERE fcoid = $1`,
    [PstrCoID]
  );

  // key = the type in lower case (the old SQL Server compared without case)
  const after = new Map<string, { type: string; name: string; module: string }>();

  for (const doc of existingResult.rows) {
    after.set(String(doc.fdoctype).toLowerCase(), {
      type: doc.fdoctype,
      name: String(doc.fdocname ?? ""),
      module: String(doc.fmoduleid ?? ""),
    });
  }

  // the documents taken out on the screen: they must be documents of this
  // module, and they are gone before the rows are saved (a new row may use their
  // type or name)
  for (const deleted of deletedRows) {
    const deletedType = String(deleted.txtDocType ?? "").trim();

    if (isNullOrEmpty(deletedType)) {
      return failed("The document to delete is required", "txtDocType");
    }

    const found = after.get(deletedType.toLowerCase());

    if (!found || found.module !== lkpModule) {
      return failed(`Document '${deletedType}' not found`, "txtDocType", 404);
    }

    after.delete(deletedType.toLowerCase());
  }

  const sent = new Set<string>();

  for (const row of rows) {
    const type = String(row.txtDocType).trim();
    const key = type.toLowerCase();
    const name = String(row.txtDocName).trim();

    // the same Document Type twice in the rows
    if (sent.has(key)) {
      return failed("'Document Type' already exists", "txtDocType");
    }

    sent.add(key);

    if (row.chkSaved === true) {
      // a saved row is found by the type it had when it was loaded; its type may
      // have been changed
      const originalType = String(row.txtOriginalDocType ?? "").trim() || type;
      const originalKey = originalType.toLowerCase();
      const original = after.get(originalKey);

      if (!original || original.module !== lkpModule) {
        return failed(`Document '${originalType}' not found`, "txtDocType", 404);
      }

      if (originalKey !== key) {
        // the type is changed: the new one must be free in the whole company
        if (after.has(key)) {
          return failed("'Document Type' already exists", "txtDocType");
        }

        after.delete(originalKey);
      }
    } else if (after.has(key)) {
      return failed("'Document Type' already exists", "txtDocType");
    }

    after.set(key, { type, name, module: lkpModule });
  }

  // a Document name can belong to one document of the module only - checked for
  // the names being saved (a duplicate already in the database elsewhere does not
  // stop an unrelated save)
  for (const key of sent) {
    const nameKey = after.get(key)!.name.trim().toLowerCase();

    const sameName = [...after.values()].filter(
      (doc) =>
        doc.module === lkpModule && doc.name.trim().toLowerCase() === nameKey
    );

    if (sameName.length > 1) {
      return failed("'Document Name' already exists", "txtDocName");
    }
  }

  return passed;
}
