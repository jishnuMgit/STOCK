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

/* Input for saveReceiptLine / saveGeneratedEntry (ctx fields come from ctx). */
type LineInput = Omit<
  ReceiptProcedureParams,
  "strMode" | "pstrCoID" | "pstrYear" | "PstrUserID"
>;

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

/*
   if txtDebitCredit > 0
      numCredit = txtDebitCredit, numDebit = 0
   else
      numCredit = 0, numDebit = Abs(txtDebitCredit)
*/
function AssignDebitCredit(value: DbValue): {
  numDebit: number;
  numCredit: number;
} {
  const txtDebitCredit = toNumber(value);

  if (txtDebitCredit > 0) {
    return { numDebit: 0, numCredit: txtDebitCredit };
  }

  return { numDebit: Math.abs(txtDebitCredit), numCredit: 0 };
}

/*
   Signed value stored in fdebitcredit for a control row:
   the exact opposite of the total signed detail amount.
   (avoids sending -0)
*/
function oppositeOf(total: number): number {
  return total === 0 ? 0 : -total;
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
      18  p_numdebitcredit numeric      <-- NEW
      19  p_strdescription varchar
      20  p_strnote varchar
      21  p_blnmatch boolean
      22  p_pstruserid varchar
      23  p_struserdate varchar
      24  p_strdetails jsonb
      25  p_result_cursor refcursor
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

    lkpCBAccountName = null,

    txtReceivedFrom = null,

    txtReference = null,

    lkpAccountID = null,

    strGCS = null,

    lkpDivID = null,

    lkpCCID = null,

    numDebit = 0,

    numCredit = 0,

    /* NULL by default: the SP rejects S / SC / M calls that forget it. */
    numDebitCredit = null,

    txtDescription = null,

    txtNote = null,

    chkMatch = false,

    PstrUserID,

    strUserDate = null,

    details = null,
  }: ReceiptProcedureParams,
): Promise<any[]> {
  if (!pstrCoID || !pstrYear) {
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

    pstrCoID, // $2

    pstrYear, // $3

    lkpBranch, // $4

    strDocType, // $5

    txtDocNo, // $6

    txtSlNo, // $7

    dtpDate, // $8

    lkpCBAccountName, // $9

    txtReceivedFrom, // $10

    txtReference, // $11

    lkpAccountID, // $12

    strGCS, // $13

    lkpDivID, // $14

    lkpCCID, // $15

    numDebit, // $16

    numCredit, // $17

    numDebitCredit, // $18  (NEW)

    txtDescription, // $19

    txtNote, // $20

    chkMatch, // $21

    PstrUserID, // $22

    strUserDate, // $23

    jsonDetails, // $24

    cursorName, // $25
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
      $18::numeric,
      $19::varchar,
      $20::varchar,
      $21::boolean,
      $22::varchar,
      $23::varchar,
      $24::jsonb,
      $25::refcursor
    )
  `;

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
  { pstrCoID, pstrYear, pstrUserID }: ReceiptContext,
  line: LineInput,
): Promise<any[]> {
  return callReceiptProcedure(client, {
    ...line,

    strMode: "S",

    pstrCoID,

    pstrYear,

    PstrUserID: pstrUserID,

    details: null,
  });
}

/* =========================================================
   SAVE GENERATED (CONTROL) ENTRY
========================================================= */

async function saveGeneratedEntry(
  client: PoolClient,
  { pstrCoID, pstrYear, pstrUserID }: ReceiptContext,
  entry: LineInput,
): Promise<any[]> {
  return callReceiptProcedure(client, {
    ...entry,

    strMode: "SC",

    pstrCoID,

    pstrYear,

    /* SC always uses fslno = 0. */

    txtSlNo: 0,

    /* The SP uses faccountid = p_strlkpCBAccountID for SC. */

    lkpAccountID: entry.lkpCBAccountName,

    PstrUserID: pstrUserID,

    details: null,
  });
}

/* =========================================================
   DELETE INTERNAL
========================================================= */

async function deleteReceiptInternal(
  client: PoolClient,
  { pstrCoID, pstrYear, pstrUserID }: ReceiptContext,
  { lkpBranch, strDocType, txtDocNo }: ReceiptHeaderParams,
): Promise<any[]> {
  return callReceiptProcedure(client, {
    strMode: "D",

    pstrCoID,

    pstrYear,

    lkpBranch,

    strDocType,

    txtDocNo,

    txtSlNo: 0,

    PstrUserID: pstrUserID,

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

  const { pstrCoID, pstrYear } = ctx;

  try {
    const {
      lkpBranch,
      lkpType,
      txtDocNo,
      dtpDate,
      lkpCBAccountName,
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

    const strDocType = GetStrDocType(lkpType);

    if (isEmpty(txtDocNo)) {
      throw new Error("Receipt number is required");
    }

    if (isEmpty(dtpDate)) {
      throw new Error("Receipt date is required");
    }

    if (isEmpty(lkpCBAccountName)) {
      throw new Error("Cash/Bank account is required");
    }

    if (!Array.isArray(rows)) {
      throw new Error("Receipt rows are invalid");
    }

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

      const { numDebit, numCredit } = AssignDebitCredit(row.txtDebitCredit);

      /* signed user-entered amount, saved as-is in fdebitcredit */
      const numDebitCredit = toNumber(row.txtDebitCredit);

      await saveReceiptLine(client, ctx, {
        lkpBranch,

        strDocType,

        txtDocNo,

        dtpDate,

        txtReceivedFrom,

        txtReference,

        txtSlNo,

        lkpCBAccountName,

        lkpAccountID: row.lkpAccountID,

        strGCS: row.strGCS || "",

        lkpCCID: row.lkpCCID || "",

        numDebit,

        numCredit,

        numDebitCredit,

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

    const control = AssignDebitCredit(TottxtDebitCredit);

    /* control fdebitcredit = opposite of the total signed detail amount */
    const controlDebitCredit = oppositeOf(TottxtDebitCredit);

    await saveGeneratedEntry(client, ctx, {
      lkpBranch,

      strDocType,

      txtDocNo,

      dtpDate,

      txtReceivedFrom,

      txtReference,

      lkpCBAccountName,

      strGCS: firstRow.strGCS || "",

      numDebit: control.numDebit,

      numCredit: control.numCredit,

      numDebitCredit: controlDebitCredit,

      txtDescription: generatedDescription,

      txtNote: strNote || "",

      chkMatch: toBoolean(firstRow.ckhMatch),

      strUserDate: new Date().toISOString(),
    });

    if (manageTransaction) {
      await client.query("COMMIT");
    }

    return {
      message: "Saved Successfully",

      data: {
        pstrCoID,

        pstrYear,

        lkpBranch,

        strDocType,

        txtDocNo,

        total: TottxtDebitCredit,

        lkpCBAccountName,

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

  const { pstrCoID, pstrYear } = ctx;

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

    const strDocType = GetStrDocType(lkpType);

    await client.query("BEGIN");

    await deleteReceiptInternal(client, ctx, {
      lkpBranch,
      strDocType,
      txtDocNo,
    });

    await client.query("COMMIT");

    return {
      message: "Deleted Successfully",

      data: {
        pstrCoID,

        pstrYear,

        lkpBranch,

        type: strDocType,

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
  const { pstrCoID, pstrYear, pstrUserID } = ctx;

  const {
    lkpBranch,
    lkpType,
    txtDocNo,
    dtpDate,
    txtReceivedFrom,
    txtReference,
    lkpCBAccountName,
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

    if (isEmpty(lkpCBAccountName)) {
      throw new Error("Cash/Bank account is required");
    }

    if (!Array.isArray(rows)) {
      throw new Error("Receipt rows are invalid");
    }

    const strDocType = GetStrDocType(lkpType);

    const validRows: ReceiptRow[] = rows.filter(
      (row: ReceiptRow): boolean => row && !isEmpty(row.lkpAccountID),
    );

    if (validRows.length === 0) {
      throw new Error("There is no information for modifying.");
    }

    const TottxtDebitCredit = validRows.reduce(
      (tot: number, row: ReceiptRow): number => {
        return tot + toNumber(row.txtDebitCredit);
      },
      0,
    );

    await client.query("BEGIN");

    /*
       1. MODIFY CONTROL ENTRY (M + txtSlNo = 0)
       Updates tblfintrans where fslno = 0. NO DELETE. NO INSERT.
    */

    const control = AssignDebitCredit(TottxtDebitCredit);

    /* control fdebitcredit = opposite of the total signed detail amount */
    const controlDebitCredit = oppositeOf(TottxtDebitCredit);

    await callReceiptProcedure(client, {
      strMode: "M",

      pstrCoID,

      pstrYear,

      lkpBranch,

      strDocType,

      txtDocNo: clean(txtDocNo),

      txtSlNo: 0,

      dtpDate,

      lkpCBAccountName,

      txtReceivedFrom,

      txtReference,

      lkpAccountID: lkpCBAccountName,

      strGCS: validRows[0]?.strGCS || "",

      lkpDivID: validRows[0]?.lkpDivID || "",

      lkpCCID: validRows[0]?.lkpCCID || cbCcId || "",

      numDebit: control.numDebit,

      numCredit: control.numCredit,

      numDebitCredit: controlDebitCredit,

      txtDescription: [txtReference, txtReceivedFrom]
        .filter((value) => !isEmpty(value))
        .join(" - "),

      txtNote: strNote || "",

      chkMatch: toBoolean(validRows[0]?.ckhMatch),

      PstrUserID: pstrUserID,

      strUserDate: new Date().toISOString(),

      details: null,
    });

    /*
       2. BUILD DETAILS FOR M MODE
       Property names MUST match jsonb_to_recordset() in the procedure.
    */

    const details = validRows.map((row: ReceiptRow, index: number) => {
      const { numDebit, numCredit } = AssignDebitCredit(row.txtDebitCredit);

      return {
        slno: Number(row.txtslNo) || index + 1,

        dtpdate: normalizeDate(dtpDate),

        cbaccountid: lkpCBAccountName || "",

        receivedfrompaidto: txtReceivedFrom || "",

        ref: txtReference || "",

        accountid: row.lkpAccountID || "",

        gcs: row.strGCS || "",

        divid: row.lkpDivID || "",

        ccid: row.lkpCCID || "",

        debit: numDebit,

        credit: numCredit,

        /* signed user-entered amount, saved as-is in fdebitcredit */
        debitcredit: toNumber(row.txtDebitCredit),

        description: row.txtDescription || "",

        note: strNote || "",

        match: toBoolean(row.ckhMatch),
      };
    });

    /*
       3. MODIFY ALL DETAIL ROWS (M + details JSON)
       numDebitCredit is not used on this call; each row carries
       its own "debitcredit" inside the JSON.
    */

    await callReceiptProcedure(client, {
      strMode: "M",

      pstrCoID,

      pstrYear,

      lkpBranch,

      strDocType,

      txtDocNo: clean(txtDocNo),

      txtSlNo: 1,

      dtpDate,

      lkpCBAccountName,

      txtReceivedFrom,

      txtReference,

      lkpAccountID: null,

      strGCS: null,

      lkpDivID: null,

      lkpCCID: null,

      numDebit: 0,

      numCredit: 0,

      numDebitCredit: 0,

      txtDescription: null,

      txtNote: null,

      chkMatch: false,

      PstrUserID: pstrUserID,

      strUserDate: new Date().toISOString(),

      details,
    });

    await client.query("COMMIT");

    return {
      message: "Modified Successfully",

      data: {
        pstrCoID,

        pstrYear,

        lkpBranch,

        strDocType,

        txtDocNo,

        total: TottxtDebitCredit,

        lkpCBAccountName,

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