import type { PoolClient } from "pg";
import pool from "../DB/db.js";

import type { ReceiptContext } from "../middleware/receiptContext.js";
import { GetStrDocType } from "../utils/docType.js";

import type {
  ReceiptProcedureParams,
  ReceiptData,
  ReceiptRow,
  ReceiptHeaderParams,
  ReceiptDocumentParams,
  SaveReceiptLineParams,
  SaveGeneratedEntryParams,
} from "../types/types.js";

/* =========================================================
   TYPES
========================================================= */

type DbValue = unknown;
type DbRow = Record<string, any>;

interface ServiceResult {
  message: string;
  data?: DbRow;
}

/* The control entry may now be a debit when the net total is negative. */
type SaveGeneratedEntryWithDebit = SaveGeneratedEntryParams & {
  numDebit?: DbValue;
};

/* =========================================================
   HELPERS
========================================================= */

function isEmpty(value: DbValue): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

function clean(value: DbValue): string | null {
  if (isEmpty(value)) {
    return null;
  }

  return String(value).trim();
}

function toNumber(value: DbValue): number {
  if (isEmpty(value)) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function toBoolean(value: DbValue): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE"
  );
}

function toSmallInt(value: DbValue, defaultValue: number = 0): number {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    return defaultValue;
  }

  return number;
}

/*
   if txtDebitCredit > 0
      numCredit = txtDebitCredit, numDebit = 0
   else
      numCredit = 0, numDebit = Abs(txtDebitCredit)
*/
function splitAmount(value: DbValue): { numDebit: number; numCredit: number } {
  const txtDebitCredit = toNumber(value);

  if (txtDebitCredit > 0) {
    return { numDebit: 0, numCredit: txtDebitCredit };
  }

  return { numDebit: Math.abs(txtDebitCredit), numCredit: 0 };
}

/* =========================================================
   DATE NORMALIZATION

   PostgreSQL SP expects DD/MM/YYYY.
   Frontend may send YYYY-MM-DD, DD/MM/YYYY or an ISO timestamp.
========================================================= */

function normalizeDate(value: DbValue): string | null {
  if (isEmpty(value)) {
    return null;
  }

  const dateString = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-");

    return `${day}/${month}/${year}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
    const [year, month, day] = dateString.substring(0, 10).split("-");

    return `${day}/${month}/${year}`;
  }

  return dateString;
}

function normalizeCreatedDate(value: DbValue): string | null {
  if (isEmpty(value)) {
    return null;
  }

  return String(value).trim();
}

/* =========================================================
   PROCEDURE CALL

  dbo.sp_pagesreceipt_det(
      1   p_strmode varchar
      2   p_pstrcoid varchar
      3   p_pstryear varchar
      4   p_strbrid varchar
      5   p_strDocType varchar
      6   p_strdocno varchar
      7   p_intslno smallint
      8   p_dtpdate varchar
      9   p_strlkpCBAccountID varchar
      10  p_strreceivedfrompaidto varchar
      11  p_strref varchar
      12  p_straccountid varchar
      13  p_strgcs varchar
      14  p_strdivid varchar
      15  p_strccid varchar
      16  p_numdebit numeric
      17  p_numcredit numeric
      18  p_strdescription varchar
      19  p_strnote varchar
      20  p_blnmatch boolean
      21  p_pstruserid varchar
      22  p_struserdate varchar
      23  p_strdetails jsonb
      24  p_result_cursor refcursor
  )
========================================================= */

async function callReceiptProcedure(
  client: PoolClient,
  {
    strMode,

    pstrCoID,

    pstrYear,

    lkpBranch,

    strDocType,

    txtDocNo,

    txtSlNo = 0,

    dtpDate = null,

    lkpCBAccountID = null,

    txtReceivedFrom = null,

    txtReference = null,

    lkpAccountID = null,

    strGCS = null,

    lkpDivID = null,

    lkpCCID = null,

    numDebit = 0,

    numCredit = 0,

    txtDescription = null,

    txtNote = null,

    chkMatch = false,

    PstrUserID,

    strUserDate = null,

    details = null,
  }: ReceiptProcedureParams,
): Promise<any[]> {
  const coId = clean(pstrCoID);

  const year = clean(pstrYear);

  if (!coId || !year) {
    throw new Error("Company ID and financial year are required");
  }

  const cursorName = `cur_receipt_${Date.now()}_${Math.floor(
    Math.random() * 100000,
  )}`;

  let jsonDetails: string | null = null;

  if (details !== null && details !== undefined) {
    jsonDetails = JSON.stringify(details);
  }

  const values = [
    strMode, // $1

    coId, // $2

    year, // $3

    clean(lkpBranch), // $4

    clean(strDocType), // $5

    clean(txtDocNo), // $6

    toSmallInt(txtSlNo), // $7

    normalizeDate(dtpDate), // $8

    clean(lkpCBAccountID), // $9

    clean(txtReceivedFrom), // $10

    clean(txtReference), // $11

    clean(lkpAccountID), // $12

    clean(strGCS), // $13

    clean(lkpDivID), // $14

    clean(lkpCCID), // $15

    toNumber(numDebit), // $16

    toNumber(numCredit), // $17

    clean(txtDescription), // $18

    clean(txtNote), // $19

    toBoolean(chkMatch), // $20

    clean(PstrUserID), // $21

    normalizeCreatedDate(strUserDate), // $22

    jsonDetails, // $23

    cursorName, // $24
  ];

  const sql = `
    CALL dbo.sp_pagesreceipt_det(
      $1::varchar,
      $2::varchar,
      $3::varchar,
      $4::varchar,
      $5::varchar,
      $6::varchar,
      $7::smallint,
      $8::varchar,
      $9::varchar,
      $10::varchar,
      $11::varchar,
      $12::varchar,
      $13::varchar,
      $14::varchar,
      $15::varchar,
      $16::numeric,
      $17::numeric,
      $18::varchar,
      $19::varchar,
      $20::boolean,
      $21::varchar,
      $22::varchar,
      $23::jsonb,
      $24::refcursor
    )
  `;

  console.log("sp_pagesreceipt_det", {
    strMode,
    coId,
    year,
    lkpBranch,
    strDocType,
    txtDocNo,
    txtSlNo,
  });

  await client.query(sql, values);

  /* Only GETHD / GETTL open the cursor. S, SC, D and M do not. */

  const cursorModes = ["GETHD", "GETTL"];

  if (cursorModes.includes(String(strMode).toUpperCase())) {
    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    return result.rows;
  }

  return [];
}

/* =========================================================
   GET RECEIPT HEADER

   pstrCoID / pstrYear must now be passed by the caller
   (GetData service) - they are no longer read from .env.
========================================================= */

export async function getReceiptHeader({
  pstrCoID,
  pstrYear,
  lkpBranch,
  strDocType,
  txtDocNo,
}: ReceiptHeaderParams): Promise<any[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await callReceiptProcedure(client, {
      strMode: "GETHD",

      pstrCoID,

      pstrYear,

      lkpBranch,

      strDocType,

      txtDocNo,

      txtSlNo: 0,

      dtpDate: null,

      details: null,
    });

    await client.query("COMMIT");

    return rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    console.error("getReceiptHeader error:", error);

    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   GET RECEIPT LINES
========================================================= */

export async function getReceiptLines({
  pstrCoID,
  pstrYear,
  lkpBranch,
  strDocType,
  txtDocNo,
}: ReceiptHeaderParams): Promise<any[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await callReceiptProcedure(client, {
      strMode: "GETTL",

      pstrCoID,

      pstrYear,

      lkpBranch,

      strDocType,

      txtDocNo,

      txtSlNo: 0,

      dtpDate: null,

      details: null,
    });

    await client.query("COMMIT");

    return rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    console.error("getReceiptLines error:", error);

    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE ONE RECEIPT LINE
========================================================= */

async function saveReceiptLine(
  client: PoolClient,
  ctx: ReceiptContext,
  {
    lkpBranch,

    strDocType,

    txtDocNo,

    dtpDate,

    txtReceivedFrom,

    txtReference,

    txtSlNo,

    lkpCBAccountID,

    lkpAccountID,

    strGCS,

    lkpCCID,

    numDebit,

    numCredit,

    txtDescription,

    txtNote,

    lkpDivID,

    chkMatch,

    strUserDate,
  }: SaveReceiptLineParams,
): Promise<any[]> {
  return callReceiptProcedure(client, {
    strMode: "S",

    pstrCoID: ctx.pstrCoID,

    pstrYear: ctx.pstrYear,

    lkpBranch,

    strDocType,

    txtDocNo,

    txtSlNo,

    dtpDate,

    lkpCBAccountID,

    txtReceivedFrom,

    txtReference,

    lkpAccountID,

    strGCS,

    lkpDivID,

    lkpCCID,

    numDebit,

    numCredit,

    txtDescription,

    txtNote,

    chkMatch,

    PstrUserID: ctx.pstrUserID,

    strUserDate: strUserDate,

    details: null,
  });
}

/* =========================================================
   SAVE GENERATED (CONTROL) ENTRY
========================================================= */

async function saveGeneratedEntry(
  client: PoolClient,
  ctx: ReceiptContext,
  {
    lkpBranch,

    strDocType,

    txtDocNo,

    dtpDate,

    txtReceivedFrom,

    txtReference,

    lkpCBAccountID,

    strGCS,

    lkpCCID,

    numDebit = 0,

    numCredit,

    txtDescription,

    strNote,

    lkpDivID,

    chkMatch,

    strUserDate,
  }: SaveGeneratedEntryWithDebit,
): Promise<any[]> {
  return callReceiptProcedure(client, {
    strMode: "SC",

    pstrCoID: ctx.pstrCoID,

    pstrYear: ctx.pstrYear,

    lkpBranch,

    strDocType,

    txtDocNo,

    /* SC always uses fslno = 0. */

    txtSlNo: 0,

    dtpDate,

    lkpCBAccountID,

    txtReceivedFrom,

    txtReference,

    /* The SP uses faccountid = p_strlkpCBAccountID for SC. */

    lkpAccountID: lkpCBAccountID,

    strGCS,

    lkpDivID,

    lkpCCID,

    numDebit,

    numCredit,

    txtDescription,

    txtNote: strNote,

    chkMatch,

    PstrUserID: ctx.pstrUserID,

    strUserDate: strUserDate,

    details: null,
  });
}

/* =========================================================
   DELETE INTERNAL
========================================================= */

async function deleteReceiptInternal(
  client: PoolClient,
  ctx: ReceiptContext,
  { lkpBranch, strDocType, txtDocNo }: ReceiptHeaderParams,
): Promise<any[]> {
  return callReceiptProcedure(client, {
    strMode: "D",

    pstrCoID: ctx.pstrCoID,

    pstrYear: ctx.pstrYear,

    lkpBranch,

    strDocType,

    txtDocNo,

    txtSlNo: 0,

    PstrUserID: ctx.pstrUserID,

    details: null,
  });
}

/* =========================================================
   SAVE RECEIPT
========================================================= */

export async function saveReceiptService(
  receipt: ReceiptData,
  ctx: ReceiptContext,
  existingClient: PoolClient | null = null,
  manageTransaction: boolean = true,
): Promise<ServiceResult> {
  const client: PoolClient = existingClient || (await pool.connect());

  try {
    const {
      lkpBranch,
      lkpType,
      cbAccountName,
      txtDocNo,
      dtpDate,
      txtReceivedFrom,
      txtReference,
      strNote,
      rows = [],
    } = receipt;

    /* VALIDATION */

    if (isEmpty(lkpBranch)) {
      throw new Error("Branch is required");
    }

    if (isEmpty(lkpType)) {
      throw new Error("Receipt type is required");
    }

    if (isEmpty(txtDocNo)) {
      throw new Error("Receipt number is required");
    }

    if (isEmpty(dtpDate)) {
      throw new Error("Receipt date is required");
    }

    if (isEmpty(cbAccountName)) {
      throw new Error("Cash/Bank account is required");
    }

    if (!Array.isArray(rows)) {
      throw new Error("Receipt rows are invalid");
    }

    const finalDocType = GetStrDocType(lkpType);

    const validRows: ReceiptRow[] = rows.filter(
      (row: ReceiptRow): boolean => row && !isEmpty(row.lkpAccountID),
    );

    if (validRows.length === 0) {
      throw new Error("There is no information for saving.");
    }

    /* Signed net total of all lines. */

    const TottxtDebitCredit = validRows.reduce(
      (sum: number, row: ReceiptRow): number => {
        return sum + toNumber(row.txtDebitCredit);
      },
      0,
    );

    if (manageTransaction) {
      await client.query("BEGIN");
    }

    /* SAVE RECEIPT DETAIL LINES */

    for (let index = 0; index < validRows.length; index++) {
      const row = validRows[index];

      const txtSlNo = Number(row.txtslNo) || index + 1;

      const { numDebit, numCredit } = splitAmount(row.txtDebitCredit);

      await saveReceiptLine(client, ctx, {
        lkpBranch,

        strDocType: finalDocType,

        txtDocNo,

        dtpDate,

        txtReceivedFrom,

        txtReference,

        txtSlNo,

        lkpCBAccountID: cbAccountName,

        lkpAccountID: row.lkpAccountID,

        strGCS: row.strGCS || "",

        lkpCCID: row.lkpCCID || "",

        numDebit,

        numCredit,

        txtDescription: row.txtDescription || "",

        txtNote: strNote || "",

        lkpDivID: row.lkpDivID || "",

        chkMatch: toBoolean(row.ckhMatch),

        strUserDate: new Date().toISOString(),
      });
    }

    /* GENERATED CONTROL ENTRY */

    const firstRow = validRows[0];

    const generatedDescription = [txtReference, txtReceivedFrom]
      .filter((value) => !isEmpty(value))
      .join(" - ");

    const control = splitAmount(TottxtDebitCredit);

    await saveGeneratedEntry(client, ctx, {
      lkpBranch,

      strDocType: finalDocType,

      txtDocNo,

      dtpDate,

      txtReceivedFrom,

      txtReference,

      lkpCBAccountID: cbAccountName,

      strGCS: firstRow.strGCS || "",

      lkpCCID: firstRow.lkpCCID || "",

      numDebit: control.numDebit,

      numCredit: control.numCredit,

      txtDescription: generatedDescription,

      strNote: strNote || "",

      lkpDivID: firstRow.lkpDivID || "",

      chkMatch: toBoolean(firstRow.ckhMatch),

      strUserDate: new Date().toISOString(),
    });

    if (manageTransaction) {
      await client.query("COMMIT");
    }

    return {
      message: "saved ",

      data: {
        pstrCoID: ctx.pstrCoID,

        year: ctx.pstrYear,

        lkpBranch,

        strDocType: finalDocType,

        txtDocNo,

        total: finalTotal,

        cbAccountName,

        rowCount: validRows.length,
      },
    };
  } catch (error: unknown) {
    if (manageTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError: unknown) {
        console.error("Receipt rollback error:", rollbackError);
      }
    }

    console.error("saveReceiptService error:", error);

    throw error;
  } finally {
    if (!existingClient) {
      client.release();
    }
  }
}

/* =========================================================
   DELETE RECEIPT
========================================================= */

export async function deleteReceiptService(
  { lkpBranch, lkpType, txtDocNo }: ReceiptDocumentParams,
  ctx: ReceiptContext,
): Promise<ServiceResult> {
  const client = await pool.connect();

  try {
    if (isEmpty(lkpBranch)) {
      throw new Error("Branch is required");
    }

    if (isEmpty(lkpType)) {
      throw new Error("Receipt type is required");
    }

    if (isEmpty(txtDocNo)) {
      throw new Error("Document number is required");
    }

    const finalDocType = GetStrDocType(lkpType);

    await client.query("BEGIN");

    await deleteReceiptInternal(client, ctx, {
      lkpBranch,
      strDocType: finalDocType,
      txtDocNo,
    });

    await client.query("COMMIT");

    return {
      message: "Receipt deleted successfully",

      data: {
        pstrCoID: ctx.pstrCoID,

        year: ctx.pstrYear,

        lkpBranch,

        type: finalDocType,

        txtDocNo,
      },
    };
  } catch (error: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError: unknown) {
      console.error("Delete rollback error:", rollbackError);
    }

    console.error("deleteReceiptService error:", error);

    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   UPDATE RECEIPT - TRUE MODIFY USING MODE : M
========================================================= */

export async function updateReceiptService(
  receipt: ReceiptData,
  ctx: ReceiptContext,
): Promise<ServiceResult> {
  const {
    lkpBranch,
    lkpType,
    txtDocNo,
    dtpDate,
    txtReceivedFrom,
    txtReference,
    cbAccountName,
    strNote,
    cbCcId,
    rows = [],
  } = receipt;

  const client = await pool.connect();

  try {
    if (isEmpty(lkpBranch)) {
      throw new Error("Branch is required");
    }

    if (isEmpty(lkpType)) {
      throw new Error("Receipt type is required");
    }

    if (isEmpty(txtDocNo)) {
      throw new Error("Document number is required");
    }

    if (isEmpty(dtpDate)) {
      throw new Error("Receipt date is required");
    }

    if (isEmpty(cbAccountName)) {
      throw new Error("Cash/Bank account is required");
    }

    if (!Array.isArray(rows)) {
      throw new Error("Receipt rows are invalid");
    }

    const finalDocType = GetStrDocType(lkpType);

    const validRows: ReceiptRow[] = rows.filter(
      (row: ReceiptRow): boolean => row && !isEmpty(row.lkpAccountID),
    );

    if (validRows.length === 0) {
      throw new Error("There is no information for modifying.");
    }

    const finalTotal = validRows.reduce(
      (sum: number, row: ReceiptRow): number => {
        return sum + toNumber(row.txtDebitCredit);
      },
      0,
    );

    await client.query("BEGIN");

    /*
       1. MODIFY CONTROL ENTRY (M + slNo = 0)
       Updates tblfintrans where fslno = 0. NO DELETE. NO INSERT.
    */

    const control = splitAmount(finalTotal);

    await callReceiptProcedure(client, {
      strMode: "M",

      pstrCoID: ctx.pstrCoID,

      pstrYear: ctx.pstrYear,

      lkpBranch,

      strDocType: finalDocType,

      txtDocNo: clean(txtDocNo),

      txtSlNo: 0,

      dtpDate,

      lkpCBAccountID: cbAccountName,

      txtReceivedFrom,

      txtReference,

      lkpAccountID: cbAccountName,

      strGCS: validRows[0]?.strGCS || "",

      lkpDivID: validRows[0]?.lkpDivID || "",

      lkpCCID: validRows[0]?.lkpCCID || cbCcId || "",

      numDebit: control.numDebit,

      numCredit: control.numCredit,

      txtDescription: [txtReference, txtReceivedFrom]
        .filter((value) => !isEmpty(value))
        .join(" - "),

      txtNote: strNote || "",

      chkMatch: toBoolean(validRows[0]?.ckhMatch),

      PstrUserID: ctx.pstrUserID,

      strUserDate: new Date().toISOString(),

      details: null,
    });

    /*
       2. BUILD DETAILS FOR M MODE
       Property names MUST match jsonb_to_recordset() in the procedure.
    */

    const details = validRows.map((row: ReceiptRow, index: number) => {
      const { numDebit, numCredit } = splitAmount(row.txtDebitCredit);

      return {
        slno: Number(row.txtslNo) || index + 1,

        dtpdate: normalizeDate(dtpDate),

        lkpCBAccountID: cbAccountName || "",

        receivedfrompaidto: txtReceivedFrom || "",

        ref: txtReference || "",

        lkpAccountID: row.lkpAccountID || "",

        strGCS: row.strGCS || "",

        lkpDivID: row.lkpDivID || "",

        lkpCCID: row.lkpCCID || "",

        debit: numDebit,

        credit: numCredit,

        /* signed value as typed, in case the SP wants it for fdebitcredit */

        txtDebitCredit: toNumber(row.txtDebitCredit),

        txtDescription: row.txtDescription || "",

        strNote: strNote || "",

        ckhMatch: toBoolean(row.ckhMatch),
      };
    });

    /*
       3. MODIFY ALL DETAIL ROWS (M + details JSON)
    */

    await callReceiptProcedure(client, {
      strMode: "M",

      pstrCoID: ctx.pstrCoID,

      pstrYear: ctx.pstrYear,

      lkpBranch,

      strDocType: finalDocType,

      txtDocNo: clean(txtDocNo),

      txtSlNo: 1,

      dtpDate,

      lkpCBAccountID: cbAccountName,

      txtReceivedFrom,

      txtReference,

      lkpAccountID: null,

      strGCS: null,

      lkpDivID: null,

      lkpCCID: null,

      numDebit: 0,

      numCredit: 0,

      txtDescription: null,

      txtNote: null,

      chkMatch: false,

      PstrUserID: ctx.pstrUserID,

      strUserDate: new Date().toISOString(),

      details,
    });

    await client.query("COMMIT");

    return {
      message: "Receipt modified successfully",

      data: {
        pstrCoID: ctx.pstrCoID,

        year: ctx.pstrYear,

        lkpBranch,

        strDocType: finalDocType,

        txtDocNo,

        total: finalTotal,

        cbAccountName,

        rowCount: validRows.length,
      },
    };
  } catch (error: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError: unknown) {
      console.error("Receipt modify rollback error:", rollbackError);
    }

    console.error("updateReceiptService error:", error);

    throw error;
  } finally {
    client.release();
  }
}
