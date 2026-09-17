
import type { PoolClient } from "pg";
import pool from "../DB/db.js";



/* =========================================================
   TYPES
========================================================= */

type DbValue = unknown;
type DbRow = Record<string, any>;

interface ReceiptProcedureParams {
  mode: string;
  branch?: DbValue;
  docType?: DbValue;
  docNo?: DbValue;
  slNo?: DbValue;
  receiptDate?: DbValue;
  cbAccountId?: DbValue;
  receivedFrom?: DbValue;
  reference?: DbValue;
  accountId?: DbValue;
  gcs?: DbValue;
  division?: DbValue;
  ccId?: DbValue;
  debit?: DbValue;
  credit?: DbValue;
  description?: DbValue;
  note?: DbValue;
  match?: DbValue;
  userId?: DbValue;
  userDate?: DbValue;
  details?: DbValue;
}

interface ReceiptRow {
  id?: number;
  slNo?: number | string;
  accountId?: string;
  accountName?: string;
  gcs?: string;
  fgcs?: string;
  ccId?: string;
  division?: string;
  divId?: string;
  creditAmount?: string | number;
  debit?: string | number;
  credit?: string | number;
  description?: string;
  note?: string;
  match?: boolean | string | number;
}

interface ReceiptData {
  branch?: DbValue;
  type?: DbValue;
  cashBank?: DbValue;
  receiptNo?: DbValue;
  receiptDate?: DbValue;
  receivedFrom?: DbValue;
  reference?: DbValue;
  note?: DbValue;
  docNo?:DbValue;
  cbCcId?: DbValue;
  rows?: ReceiptRow[];
}

interface ReceiptHeaderParams {
  branch?: DbValue;
  docType?: DbValue;
  docNo?: DbValue;
}

interface ReceiptDocumentParams {
  branch?: DbValue;
  type?: DbValue;
  receiptNo?: DbValue;
}

interface SaveReceiptLineParams {
  branch?: DbValue;
  docType?: DbValue;
  docNo?: DbValue;
  slNo?: DbValue;
  receiptDate?: DbValue;
  receivedFrom?: DbValue;
  reference?: DbValue;
  cbAccountId?: DbValue;
  accountId?: DbValue;
  gcs?: DbValue;
  ccId?: DbValue;
  debit?: DbValue;
  credit?: DbValue;
  description?: DbValue;
  note?: DbValue;
  division?: DbValue;
  match?: DbValue;
  createdUserDate?: DbValue;
}

interface SaveGeneratedEntryParams {
  branch?: DbValue;
  docType?: DbValue;
  docNo?: DbValue;
  receiptDate?: DbValue;
  receivedFrom?: DbValue;
  reference?: DbValue;
  cbAccountId?: DbValue;
  gcs?: DbValue;
  ccId?: DbValue;
  credit?: DbValue;
  description?: DbValue;
  note?: DbValue;
  division?: DbValue;
  match?: DbValue;
  createdUserDate?: DbValue;
}

interface ServiceResult {
  message: string;
  data?: DbRow;
}

/* =========================================================
   ENVIRONMENT
========================================================= */

const PstrCoID =
  process.env.PstrCoID || "01";

const PstrYear =
  String(process.env.PstrYear || "2026");

const PstrUserID =
  process.env.PstrUserID || "ADMIN";


/* =========================================================
   HELPERS
========================================================= */

function isEmpty(value: DbValue): boolean {
  return (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  );
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

  return Number.isFinite(number)
    ? number
    : 0;
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


/* =========================================================
   DOCUMENT TYPE
========================================================= */

function toDocumentType(value: DbValue): string | null {
  if (isEmpty(value)) {
    return null;
  }

  const type =
    String(value)
      .trim()
      .toUpperCase();

  if (type === "B") {
    return "BR";
  }

  if (type === "C") {
    return "CR";
  }

  return type;
}


/* =========================================================
   DATE NORMALIZATION
========================================================= */

/*
   PostgreSQL SP expects:

      DD/MM/YYYY

   Frontend may send:

      YYYY-MM-DD

   or:

      DD/MM/YYYY

   or:

      YYYY-MM-DDTHH:mm:ss...
*/

function normalizeDate(value: DbValue): string | null {

  if (isEmpty(value)) {
    return null;
  }


  const dateString =
    String(value).trim();


  /* -------------------------------------------------------
     YYYY-MM-DD
  ------------------------------------------------------- */

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      dateString
    )
  ) {

    const [
      year,
      month,
      day,
    ] =
      dateString.split("-");


    return `${day}/${month}/${year}`;
  }


  /* -------------------------------------------------------
     DD/MM/YYYY
  ------------------------------------------------------- */

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      dateString
    )
  ) {

    return dateString;
  }


  /* -------------------------------------------------------
     ISO TIMESTAMP
     
     Example:
     2026-09-15T00:00:00.000Z
  ------------------------------------------------------- */

  if (
    /^\d{4}-\d{2}-\d{2}T/.test(
      dateString
    )
  ) {

    const datePart =
      dateString.substring(
        0,
        10
      );


    const [
      year,
      month,
      day,
    ] =
      datePart.split("-");


    return `${day}/${month}/${year}`;
  }


  return dateString;
}


/* =========================================================
   CREATED DATE
========================================================= */

function normalizeCreatedDate(value: DbValue): string | null {

  if (isEmpty(value)) {
    return null;
  }

  return String(value).trim();
}


/* =========================================================
   PROCEDURE CALL
========================================================= */

/*
  ACTUAL POSTGRESQL PROCEDURE

  dbo.sp_pagesreceipt_det(

      1   p_strmode varchar
      2   p_pstrcoid varchar
      3   p_pstryear varchar
      4   p_strbrid varchar
      5   p_strdoctype varchar
      6   p_strdocno varchar
      7   p_intslno smallint
      8   p_dtpdate varchar
      9   p_strcbaccountid varchar
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

  IMPORTANT:

  The current SP DOES NOT have:

      p_strcbccid
      p_strcuserid

  Therefore they are not passed here.
*/


async function callReceiptProcedure(
  client: PoolClient,
  {
    mode,

    branch,

    docType,

    docNo,

    slNo = 0,

    receiptDate = null,

    cbAccountId = null,

    receivedFrom = null,

    reference = null,

    accountId = null,

    gcs = null,

    division = null,

    ccId = null,

    debit = 0,

    credit = 0,

    description = null,

    note = null,

    match = false,

    userId = PstrUserID,

    userDate = null,

    details = null,

  }
: ReceiptProcedureParams
) : Promise<any[]> {

  /* =======================================================
     CURSOR NAME
  ======================================================= */

  const cursorName =
    `cur_receipt_${Date.now()}_${Math.floor(
      Math.random() * 100000
    )}`;


  /* =======================================================
     DETAILS JSON
  ======================================================= */

  let jsonDetails = null;


  if (
    details !== null &&
    details !== undefined
  ) {

    jsonDetails =
      JSON.stringify(details);

  }


  /* =======================================================
     PARAMETERS
  ======================================================= */

  const values = [

    mode,                                  // $1

    PstrCoID,                              // $2

    PstrYear,                              // $3

    clean(branch),                         // $4

    clean(docType),                        // $5

    clean(docNo),                          // $6

    toSmallInt(slNo),                      // $7

    normalizeDate(receiptDate),            // $8

    clean(cbAccountId),                    // $9

    clean(receivedFrom),                   // $10

    clean(reference),                      // $11

    clean(accountId),                      // $12

    clean(gcs),                            // $13

    clean(division),                      // $14

    clean(ccId),                           // $15

    toNumber(debit),                       // $16

    toNumber(credit),                      // $17

    clean(description),                    // $18

    clean(note),                           // $19

    toBoolean(match),                      // $20

    clean(userId),                         // $21

    normalizeCreatedDate(userDate),        // $22

    jsonDetails,                           // $23

    cursorName,                            // $24

  ];


  /* =======================================================
     SQL
  ======================================================= */

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


  /* =======================================================
     DEBUG
  ======================================================= */

  console.log(
    "========================================"
  );

  console.log(
    "sp_pagesreceipt_det"
  );

  console.log(
    "Mode:",
    mode
  );

  console.log(
    "Company:",
    PstrCoID
  );

  console.log(
    "Year:",
    PstrYear
  );

  console.log(
    "Branch:",
    branch
  );

  console.log(
    "Doc Type:",
    docType
  );

  console.log(
    "Doc No:",
    docNo
  );

  console.log(
    "Sl No:",
    slNo
  );

  console.log(
    "Receipt Date:",
    normalizeDate(receiptDate)
  );

  console.log(
    "Details:",
    jsonDetails
  );

  console.log(
    "Cursor:",
    cursorName
  );

  console.log(
    "Values:",
    values
  );

  console.log(
    "========================================"
  );


  /* =======================================================
     CALL PROCEDURE
  ======================================================= */

  await client.query(
    sql,
    values
  );


  /* =======================================================
     FETCH CURSOR ONLY FOR GET MODES
  ======================================================= */

  const cursorModes = [
    "GETHD",
    "GETTL",
  ];


  if (
    cursorModes.includes(
      String(mode).toUpperCase()
    )
  ) {

    const result =
      await client.query(
        `FETCH ALL FROM "${cursorName}"`
      );


    return result.rows;
  }


  /*
     S
     SC
     D
     M

     These modes do not OPEN p_result_cursor
     in the current stored procedure.

     Therefore DO NOT FETCH.
  */

  return [];
}


/* =========================================================
   GET RECEIPT HEADER
========================================================= */

export async function getReceiptHeader({
  branch,
  docType,
  docNo,
}: ReceiptHeaderParams): Promise<any[]> {

  const client =
    await pool.connect();


  try {

    await client.query(
      "BEGIN"
    );


    const rows =
      await callReceiptProcedure(
        client,
        {

          mode: "GETHD",

          branch,

          docType:
            toDocumentType(docType),

          docNo,

          slNo: 0,

          receiptDate: null,

          details: null,

        }
      );


    await client.query(
      "COMMIT"
    );


    return rows;

  } catch (error: unknown) {

    await client.query(
      "ROLLBACK"
    );


    console.error(
      "getReceiptHeader error:",
      error
    );


    throw error;

  } finally {

    client.release();

  }
}


/* =========================================================
   GET RECEIPT LINES
========================================================= */

export async function getReceiptLines({
  branch,
  docType,
  docNo,
}: ReceiptHeaderParams): Promise<any[]> {

  const client =
    await pool.connect();


  try {

    await client.query(
      "BEGIN"
    );


    const rows =
      await callReceiptProcedure(
        client,
        {

          mode: "GETTL",

          branch,

          docType:
            toDocumentType(docType),

          docNo,

          slNo: 0,

          receiptDate: null,

          details: null,

        }
      );


    await client.query(
      "COMMIT"
    );


    return rows;

  } catch (error: unknown) {

    await client.query(
      "ROLLBACK"
    );


    console.error(
      "getReceiptLines error:",
      error
    );


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
  {
    branch,

    docType,

    docNo,

    slNo,

    receiptDate,

    receivedFrom,

    reference,

    cbAccountId,

    accountId,

    gcs,

    ccId,

    debit,

    credit,

    description,

    note,

    division,

    match,

    createdUserDate,

  }: SaveReceiptLineParams
): Promise<any[]> {

  return callReceiptProcedure(
    client,
    {

      mode: "S",

      branch,

      docType,

      docNo,

      slNo,

      receiptDate,

      cbAccountId,

      receivedFrom,

      reference,

      accountId,

      gcs,

      division,

      ccId,

      debit,

      credit,

      description,

      note,

      match,

      userId:
        PstrUserID,

      userDate:
        createdUserDate,

      /*
         S mode does not use details.
      */

      details: null,

    }
  );
}


/* =========================================================
   SAVE GENERATED ENTRY
========================================================= */

async function saveGeneratedEntry(
  client: PoolClient,
  {
    branch,

    docType,

    docNo,

    receiptDate,

    receivedFrom,

    reference,

    cbAccountId,

    gcs,

    ccId,

    credit,

    description,

    note,

    division,

    match,

    createdUserDate,

  }: SaveGeneratedEntryParams
): Promise<any[]> {

  return callReceiptProcedure(
    client,
    {

      mode: "SC",

      branch,

      docType,

      docNo,

      /*
         SC always uses fslno = 0.
      */

      slNo: 0,

      receiptDate,

      cbAccountId,

      receivedFrom,

      reference,

      /*
         The SP itself uses:

             faccountid =
                 p_strcbaccountid

         for SC.

         Therefore accountId does not need
         to be supplied separately.
      */

      accountId:
        cbAccountId,

      gcs,

      division,

      ccId,

      debit: 0,

      credit,

      description,

      note,

      match,

      userId:
        PstrUserID,

      userDate:
        createdUserDate,

      details: null,

    }
  );
}


/* =========================================================
   DELETE INTERNAL
========================================================= */

async function deleteReceiptInternal(
  client: PoolClient,
  {
    branch,

    docType,

    docNo,

  }: ReceiptHeaderParams
): Promise<any[]> {

  return callReceiptProcedure(
    client,
    {

      mode: "D",

      branch,

      docType,

      docNo,

      slNo: 0,

      details: null,

    }
  );
}


/* =========================================================
   SAVE RECEIPT
========================================================= */

export async function saveReceiptService(
  receipt: ReceiptData,
  existingClient: PoolClient | null = null,
  manageTransaction: boolean = true
): Promise<ServiceResult> {

  const client: PoolClient =
    existingClient ||
    await pool.connect();


  try {

    /* =====================================================
       REQUEST DATA
    ===================================================== */

    const {

      branch,

      type,

      cashBank,

      receiptNo,

      receiptDate,

      receivedFrom,

      reference,

      note,

      cbCcId,

      rows = [],

    } = receipt;


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      isEmpty(branch)
    ) {

      throw new Error(
        "Branch is required"
      );

    }


    if (
      isEmpty(type)
    ) {

      throw new Error(
        "Receipt type is required"
      );

    }


    if (
      isEmpty(receiptNo)
    ) {

      throw new Error(
        "Receipt number is required"
      );

    }


    if (
      isEmpty(receiptDate)
    ) {

      throw new Error(
        "Receipt date is required"
      );

    }


    if (
      isEmpty(cashBank)
    ) {

      throw new Error(
        "Cash/Bank account is required"
      );

    }


    if (
      !Array.isArray(rows)
    ) {

      throw new Error(
        "Receipt rows are invalid"
      );

    }


    /* =====================================================
       DOCUMENT TYPE
    ===================================================== */

    const finalDocType =
      toDocumentType(type);


    /* =====================================================
       VALID ROWS
    ===================================================== */

    const validRows: ReceiptRow[] =
      rows.filter(
        (row: ReceiptRow): boolean =>
          row &&
          !isEmpty(
            row.accountId
          )
      );


    if (
      validRows.length === 0
    ) {

      throw new Error(
        "There is no information for saving."
      );

    }


    /* =====================================================
       TOTAL
    ===================================================== */

    const finalTotal =
      validRows.reduce(
        (sum: number, row: ReceiptRow): number => {

          return (
            sum +
            toNumber(
              row.creditAmount
            )
          );

        },

        0

      );


    console.log(
      "Receipt total:",
      finalTotal
    );


    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    if (
      manageTransaction
    ) {

      await client.query(
        "BEGIN"
      );

    }


    /* =====================================================
       SAVE RECEIPT DETAIL LINES
    ===================================================== */

    for (
      let index = 0;

      index < validRows.length;

      index++
    ) {

      const row =
        validRows[index];


      const slNo =
        Number(row.slNo) ||
        index + 1;


      await saveReceiptLine(
        client,
        {

          branch,

          docType:
            finalDocType,

          docNo:
            receiptNo,

          slNo,

          receiptDate,

          receivedFrom,

          reference,

          cbAccountId:
            cashBank,

          accountId:
            row.accountId,

          /*
             GCS
          */

          gcs:
            row.gcs ||
            row.fgcs ||
            "",

          /*
             Cost Center
          */

          ccId:
            row.ccId ||
            "",

          /*
             Receipt detail:
             debit = 0
             credit = entered amount
          */

          debit:
            0,

          credit:
            toNumber(
              row.creditAmount
            ),

          description:
            row.description ||
            "",

          note:
            note ||
            "",

          division:
            row.division ||
            row.divId ||
            "",

          match:
            toBoolean(
              row.match
            ),

          createdUserDate:
            new Date().toISOString(),

        }
      );

    }


    /* =====================================================
       GENERATED CONTROL ENTRY
    ===================================================== */

    const firstRow =
      validRows[0];


    const generatedDescription =
      [
        reference,

        receivedFrom,

      ]
        .filter(
          (value) =>
            !isEmpty(value)
        )
        .join(
          " - "
        );


    await saveGeneratedEntry(
      client,
      {

        branch,

        docType:
          finalDocType,

        docNo:
          receiptNo,

        receiptDate,

        receivedFrom,

        reference,

        cbAccountId:
          cashBank,

        gcs:
          firstRow.gcs ||
          firstRow.fgcs ||
          "",

        ccId:
          firstRow.ccId ||
          "",

        credit:
          finalTotal,

        description:
          generatedDescription,

        note:
          note ||
          "",

        division:
          firstRow.division ||
          firstRow.divId ||
          "",

        match:
          toBoolean(
            firstRow.match
          ),

        createdUserDate:
          new Date().toISOString(),

      }
    );


    /* =====================================================
       COMMIT
    ===================================================== */

    if (
      manageTransaction
    ) {

      await client.query(
        "COMMIT"
      );

    }


    /* =====================================================
       RESPONSE
    ===================================================== */

    return {

      message:
        "Receipt saved successfully",

      data: {

        companyId:
          PstrCoID,

        year:
          PstrYear,

        branch,

        docType:
          finalDocType,

        receiptNo,

        total:
          finalTotal,

        cashBank,

        rowCount:
          validRows.length,

      },

    };

  } catch (error: unknown) {

    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (
      manageTransaction
    ) {

      try {

        await client.query(
          "ROLLBACK"
        );

      } catch (rollbackError: unknown) {

        console.error(
          "Receipt rollback error:",
          rollbackError
        );

      }

    }


    console.error(
      "saveReceiptService error:",
      error
    );


    throw error;

  } finally {

    if (
      !existingClient
    ) {

      client.release();

    }

  }
}


/* =========================================================
   DELETE RECEIPT
========================================================= */

export async function deleteReceiptService({
  branch,
  type,
  receiptNo,
}: ReceiptDocumentParams): Promise<ServiceResult> {

  const client =
    await pool.connect();


  try {

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      isEmpty(branch)
    ) {

      throw new Error(
        "Branch is required"
      );

    }


    if (
      isEmpty(type)
    ) {

      throw new Error(
        "Receipt type is required"
      );

    }


    if (
      isEmpty(receiptNo)
    ) {

      throw new Error(
        "Receipt number is required"
      );

    }


    /* =====================================================
       DOCUMENT TYPE
    ===================================================== */

    const finalDocType =
      toDocumentType(type);


    /* =====================================================
       BEGIN
    ===================================================== */

    await client.query(
      "BEGIN"
    );


    /* =====================================================
       DELETE
    ===================================================== */

    await deleteReceiptInternal(
      client,
      {

        branch,

        docType:
          finalDocType,

        docNo:
          receiptNo,

      }
    );


    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query(
      "COMMIT"
    );


    /* =====================================================
       RESPONSE
    ===================================================== */

    return {

      message:
        "Receipt deleted successfully",

      data: {

        companyId:
          PstrCoID,

        year:
          PstrYear,

        branch,

        docType:
          finalDocType,

        receiptNo,

      },

    };

  } catch (error: unknown) {

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError: unknown) {

      console.error(
        "Delete rollback error:",
        rollbackError
      );

    }


    console.error(
      "deleteReceiptService error:",
      error
    );


    throw error;

  } finally {

    client.release();

  }
}


/* =========================================================
   UPDATE RECEIPT
========================================================= */

export async function updateReceiptService(
  receipt: ReceiptData
): Promise<ServiceResult> {

  const {

    branch,

    type,

    docNo,

  } = receipt;


  const client =
    await pool.connect();


  try {

    /* =====================================================
       BEGIN
    ===================================================== */

    await client.query(
      "BEGIN"
    );


    /* =====================================================
       DOCUMENT TYPE
    ===================================================== */

    const finalDocType =
      toDocumentType(type);


    /* =====================================================
       DELETE OLD RECEIPT
    ===================================================== */

    await deleteReceiptInternal(
      client,
      {

        branch,

        docType:
          finalDocType,

        docNo,

      }
    );


    /* =====================================================
       SAVE UPDATED RECEIPT
    ===================================================== */

    const result =
      await saveReceiptService(
        {

          ...receipt,

          receiptNo:
            docNo,

        },

        client,

        false

      );


    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query(
      "COMMIT"
    );


    /* =====================================================
       RESPONSE
    ===================================================== */

    return {

      ...result,

      message:
        "Receipt modified successfully",

    };

  } catch (error: unknown) {

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError: unknown) {

      console.error(
        "Update rollback error:",
        rollbackError
      );

    }


    console.error(
      "updateReceiptService error:",
      error
    );


    throw error;

  } finally {

    client.release();

  }
}
