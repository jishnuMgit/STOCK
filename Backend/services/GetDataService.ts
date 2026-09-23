import type { PoolClient } from "pg";
import pool from "../DB/db.js";

import {GetDataParams} from '../types/types.js'
/* =========================================================
   TYPES
========================================================= */



interface ReceiptProcedureParams {
  mode: string;
  branch: string | null;
  lkpType: string | null;
  docNo: string | null;
  cursorName: string;
}

/*
  Database rows are dynamic because the queries use SELECT *.
  Keep this flexible for now while converting the existing JS code.
*/
type DbRow = Record<string, any>;

interface ReceiptHeader {
  companyId: any;
  year: any;
  branch: any;
  lkpType: any;
  docNo: any;
  receiptDate: any;
  cbAccountName: any;
  ccId: any;
  receivedFrom: any;
  reference: any;
  note: any;
  division: any;
  totalCredit: number;
}

interface ReceiptDetailRow {
  id: number;
  accountId: any;
  accountName: any;
  fgcs: any;
  division: any;
  ccId: any;
  creditAmount: string;
  match: boolean;
  description: any;
}

interface GetDataResult {
  exists: boolean;
  header: ReceiptHeader | null;
  rows: ReceiptDetailRow[];
  total?: number;
  rowCount?: number;
  message: string;
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

function isEmpty(
  value: unknown
): boolean {
  return (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  );
}

function clean(
  value: unknown
): string | null {
  if (isEmpty(value)) {
    return null;
  }

  return String(value).trim();
}

function toBoolean(
  value: unknown
): boolean {
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

/* =========================================================
   DOCUMENT TYPE
========================================================= */

function toDocumentType(
  value: unknown
): string | null {
  if (isEmpty(value)) {
    return null;
  }

  const type =
    String(value)
      .trim()
      .toUpperCase();

  /*
     Frontend can send:

     B  -> BR
     C  -> CR

     If already BR / CR,
     keep it unchanged.
  */

  if (type === "B") {
    return "BR";
  }

  if (type === "C") {
    return "CR";
  }

  return type;
}

/* =========================================================
   COMMON PROCEDURE CALL
========================================================= */

async function callReceiptProcedure(
  client: PoolClient,
  {
    mode,
    branch,
    lkpType,
    docNo,
    cursorName,
  }: ReceiptProcedureParams
): Promise<DbRow[]> {

  /* =======================================================
     PostgreSQL procedure signature

     1  p_strmode
     2  p_pstrcoid
     3  p_pstryear
     4  p_strbrid
     5  p_strdoctype
     6  p_strdocno
     7  p_intslno
     8  p_dtpdate
     9  p_strcbaccountid
     10 p_strreceivedfrompaidto
     11 p_strref
     12 p_straccountid
     13 p_strgcs
     14 p_strdivid
     15 p_strccid
     16 p_numdebit
     17 p_numcredit
     18 p_strdescription
     19 p_strnote
     20 p_blnmatch
     21 p_pstruserid
     22 p_struserdate
     23 p_result_cursor
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

  const values = [

    /* =====================================================
       1 - p_strmode
    ===================================================== */

    mode,

    /* =====================================================
       2 - p_pstrcoid
    ===================================================== */

    PstrCoID,

    /* =====================================================
       3 - p_pstryear
    ===================================================== */

    PstrYear,

    /* =====================================================
       4 - p_strbrid
    ===================================================== */

    clean(branch),

    /* =====================================================
       5 - p_strdoctype
    ===================================================== */

    clean(lkpType),

    /* =====================================================
       6 - p_strdocno
    ===================================================== */

    clean(docNo),

    /* =====================================================
       7 - p_intslno
    ===================================================== */

    0,

    /* =====================================================
       8 - p_dtpdate
    ===================================================== */

    null,

    /* =====================================================
       9 - p_strcbaccountid
    ===================================================== */

    null,

    /* =====================================================
       10 - p_strreceivedfrompaidto
    ===================================================== */

    null,

    /* =====================================================
       11 - p_strref
    ===================================================== */

    null,

    /* =====================================================
       12 - p_straccountid
    ===================================================== */

    null,

    /* =====================================================
       13 - p_strgcs
    ===================================================== */

    null,

    /* =====================================================
       14 - p_strdivid
    ===================================================== */

    null,

    /* =====================================================
       15 - p_strccid
    ===================================================== */

    null,

    /* =====================================================
       16 - p_numdebit
    ===================================================== */

    0,

    /* =====================================================
       17 - p_numcredit
    ===================================================== */

    0,

    /* =====================================================
       18 - p_strdescription
    ===================================================== */

    null,

    /* =====================================================
       19 - p_strnote
    ===================================================== */

    null,

    /* =====================================================
       20 - p_blnmatch
    ===================================================== */

    false,

    /* =====================================================
       21 - p_pstruserid
    ===================================================== */

    PstrUserID,

    /* =====================================================
       22 - p_struserdate
    ===================================================== */

    null,

    /* =====================================================
       JSONB
    ===================================================== */

    null,

    /* =====================================================
       24 - p_result_cursor
    ===================================================== */

    cursorName,

  ];

  /* =======================================================
     DEBUG
  ======================================================= */

  console.log(
    "======================================"
  );

  console.log(
    `Calling sp_pagesreceipt - ${mode}`
  );

  console.log({
    mode,

    companyId:
      PstrCoID,

    year:
      PstrYear,

    branch:
      clean(branch),

    lkpType:
      clean(lkpType),

    docNo:
      clean(docNo),
  });

  console.log(
    "Procedure parameter count:",
    values.length
  );

  console.log(
    "======================================"
  );

  /* =======================================================
     CALL PROCEDURE
  ======================================================= */

  await client.query(
    sql,
    values
  );

  /* =======================================================
     FETCH CURSOR
  ======================================================= */

  const result =
    await client.query(
      `FETCH ALL FROM "${cursorName}"`
    );

  return result.rows;
}

/* =========================================================
   GET DATA TL
   PostgreSQL mode:

   ELSIF UPPER(TRIM(p_strmode)) = 'GETTL' THEN
========================================================= */

export async function GetDataTL({
  lkpBranch,
  lkpType,
  txtReceiptNo,
}: GetDataParams): Promise<DbRow[]> {

  console.log(
    "\n======================================"
  );

  console.log(
    "GETDATA TL"
  );

  console.log(
    "Branch:",
    JSON.stringify(lkpBranch)
  );

  console.log(
    "Doc lkpType:",
    JSON.stringify(lkpType)
  );

  console.log(
    "Doc No:",
    JSON.stringify(txtReceiptNo)
  );

  console.log(
    "======================================"
  );

  const client = await pool.connect();

  try {

    /* =====================================================
       NORMALIZE
    ===================================================== */

    const branch = clean(lkpBranch);

    const docType = toDocumentType(lkpType);

    const docNo = clean(txtReceiptNo);


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (isEmpty(branch)) {

      throw new Error(
        "Branch is required"
      );

    }

    if (isEmpty(docType)) {

      throw new Error(
        "Receipt type is required"
      );

    }

    if (isEmpty(docNo)) {

      throw new Error(
        "Receipt number is required"
      );

    }


    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await client.query(
      "BEGIN"
    );


    /* =====================================================
       CURSOR NAME
    ===================================================== */

    const cursorName =
      `cur_receipt_tl_${Date.now()}_${Math.floor(
        Math.random() * 100000
      )}`;


    /* =====================================================
       CALL PROCEDURE
    ===================================================== */

    const rows =
      await callReceiptProcedure(
        client,
        {
          mode: "GETTL",

          branch,

         lkpType: docType,

          docNo,

          cursorName,
        }
      );


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
      "GETTL row count:",
      rows.length
    );

    console.log(
      "GETTL rows:",
      rows
    );


    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query(
      "COMMIT"
    );

    return rows;

  } catch (error: unknown) {

    /* =====================================================
       ROLLBACK
    ===================================================== */

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError: unknown) {

      console.error(
        "GETTL rollback error:",
        rollbackError
      );

    }

    console.error(
      "GetDataTL error:",
      error
    );

    throw error;

  } finally {

    client.release();

  }

}

/* =========================================================
   GET DATA HD
   PostgreSQL mode:

   ELSIF UPPER(TRIM(p_strmode)) = 'GETHD' THEN
========================================================= */

export async function GetDataHD({
  lkpBranch,
  lkpType,
  txtReceiptNo,
}: GetDataParams): Promise<DbRow[]> {

  console.log(
    "\n======================================"
  );

  console.log(
    "GETDATA HD"
  );

  console.log(
    "Branch:",
    JSON.stringify(lkpBranch)
  );

  console.log(
    "Doc lkpType:",
    JSON.stringify(lkpType)
  );

  console.log(
    "Doc No:",
    JSON.stringify(txtReceiptNo)
  );

  console.log(
    "======================================"
  );

  const client = await pool.connect();

  try {

    /* =====================================================
       NORMALIZE
    ===================================================== */

    const branch =
      clean(lkpBranch);

    const docType =
      toDocumentType(lkpType);

    const docNo =
      clean(txtReceiptNo);


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (isEmpty(branch)) {

      throw new Error(
        "Branch is required"
      );

    }

    if (isEmpty(docType)) {

      throw new Error(
        "Receipt type is required"
      );

    }

    if (isEmpty(docNo)) {

      throw new Error(
        "Receipt number is required"
      );

    }


    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await client.query(
      "BEGIN"
    );


    /* =====================================================
       CURSOR NAME
    ===================================================== */

    const cursorName =
      `cur_receipt_hd_${Date.now()}_${Math.floor(
        Math.random() * 100000
      )}`;


    /* =====================================================
       CALL PROCEDURE
    ===================================================== */

    const rows =
      await callReceiptProcedure(
        client,
        {
          mode: "GETHD",

          branch,

        lkpType:docType,

          docNo,

          cursorName,
        }
      );


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
      "GETHD row count:",
      rows.length
    );

    console.log(
      "GETHD rows:",
      rows
    );


    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query(
      "COMMIT"
    );

    return rows;

  } catch (error: unknown) {

    /* =====================================================
       ROLLBACK
    ===================================================== */

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError: unknown) {

      console.error(
        "GETHD rollback error:",
        rollbackError
      );

    }

    console.error(
      "GetDataHD error:",
      error
    );

    throw error;

  } finally {

    client.release();

  }

}

/* =========================================================
   GET DATA

   Equivalent to VB:

   Private Sub GetData(
       ByVal strBrID As String,
       ByVal strDocType As String,
       ByVal strDocNo As String
   )

       dtRVS = objDoc.GetDataTL(...)

       dr = objDoc.GetDataHD(...)

   End Sub
========================================================= */

export async function GetData({
  lkpBranch,
  lkpType,
  txtReceiptNo,
}: GetDataParams): Promise<GetDataResult> {

  console.log(
    "\n\n======================================"
  );

  console.log(
    "GET RECEIPT FOR MODIFY"
  );

  console.log(
    "Branch:",
    JSON.stringify(lkpBranch)
  );

  console.log(
    "Doc lkpType:",
    JSON.stringify(lkpType)
  );

  console.log(
    "Doc No:",
    JSON.stringify(txtReceiptNo)
  );

  console.log(
    "======================================"
  );


  /* =======================================================
     NORMALIZE
  ======================================================= */

  const branch =
    clean(lkpBranch);

  const docType =
    toDocumentType(lkpType);

  const docNo =
    clean(txtReceiptNo);


  /* =======================================================
     VALIDATION
  ======================================================= */

  if (isEmpty(lkpBranch)) {

    return {
      exists: false,

      header: null,

      rows: [],

      message:
        "Branch is required",
    };

  }


  if (isEmpty(lkpType)) {

    return {
      exists: false,

      header: null,

      rows: [],

      message:
        "Receipt type is required",
    };

  }


  if (isEmpty(docNo)) {

    return {
      exists: false,

      header: null,

      rows: [],

      message:
        "Receipt number is required",
    };

  }


  /* =======================================================
     NORMALIZED DATA
  ======================================================= */

  console.log(
    "Normalized GetData:",
    {
      branch,
      docType,
      docNo,
    }
  );


  /* =======================================================
     GET DETAIL FIRST
  ======================================================= */

  console.log(
    "Calling GetDataTL..."
  );

  const detailRows =
    await GetDataTL({
      lkpBranch: branch,
      lkpType: docType,
      txtReceiptNo: docNo,
    });

  console.log(
    "GetDataTL returned:",
    detailRows.length
  );


  /* =======================================================
     GET HEADER
  ======================================================= */

  console.log(
    "Calling GetDataHD..."
  );

  const headerRows =
    await GetDataHD({
      lkpBranch: branch,
      lkpType: docType,
      txtReceiptNo: docNo,
    });

  console.log(
    "GetDataHD returned:",
    headerRows.length
  );


  /* =======================================================
     CHECK RECEIPT
  ======================================================= */

  if (
    !headerRows ||
    headerRows.length === 0
  ) {

    console.log(
      "Receipt not found"
    );

    return {
      exists: false,

      header: null,

      rows: [],

      message:
        "Receipt not found",
    };

  }


  /* =======================================================
     DATABASE HEADER
  ======================================================= */

  const dbHeader =
    headerRows[0];


  /* =======================================================
     HEADER
  ======================================================= */

  const header: ReceiptHeader = {

    companyId:
      dbHeader.fcoid ??
      PstrCoID,

    year:
      dbHeader.fyear ??
      PstrYear,

    branch:
      dbHeader.fbrid ??
      branch,

    lkpType:
      dbHeader.fdoctype ??
      docType,

    docNo:
      dbHeader.fdocno ??
      docNo,

    receiptDate:
      dbHeader.fdate ??
      null,


    /* =====================================================
       CASH / BANK ACCOUNT
    ===================================================== */

    cbAccountName:
      dbHeader.fcbaccountid ??
      "",


    /* =====================================================
       COST CENTER
    ===================================================== */

    ccId:
      dbHeader.fccid ??
      "",


    /* =====================================================
       RECEIVED FROM / PAID TO
    ===================================================== */

    receivedFrom:
      dbHeader.freceivedfrompaidto ??
      "",


    /* =====================================================
       REFERENCE
    ===================================================== */

    reference:
      dbHeader.freference ??
      "",


    /* =====================================================
       NOTE
    ===================================================== */

    note:
      dbHeader.fnote ??
      "",


    /* =====================================================
       DIVISION
    ===================================================== */

    division:
      dbHeader.fdivid ??
      "",


    /* =====================================================
       TOTAL CREDIT
    ===================================================== */

    totalCredit:
      Number(
        dbHeader.totalcredit
      ) || 0,

  };


  /* =======================================================
     DETAIL ROWS
  ======================================================= */

  const rows: ReceiptDetailRow[] =
    (detailRows || [])
      .filter(
        (row: DbRow) =>
          Number(row.fslno) > 0
      )
      .map(
        (
          row: DbRow,
          index: number
        ): ReceiptDetailRow => {

          return {

            /* =================================================
               ROW ID
            ================================================= */

            id:
              Number(row.fslno) ||
              index + 1,


            /* =================================================
               ACCOUNT
            ================================================= */

            accountId:
              row.faccountid ??
              "",


            /* =================================================
               ACCOUNT NAME
            ================================================= */

            accountName:
              row.faccountname ??
              "",


            /* =================================================
               G / CS
            ================================================= */

            fgcs:
              row.fgcs ??
              "",


            /* =================================================
               DIVISION
            ================================================= */

            division:
              row.fdivid ??
              "",


            /* =================================================
               COST CENTER
            ================================================= */

            ccId:
              row.fccid ??
              "",


            /* =================================================
               CREDIT AMOUNT
            ================================================= */

            creditAmount:

              row.fcredit !== null &&
              row.fcredit !== undefined

                ? String(
                    row.fcredit
                  )

                : "",


            /* =================================================
               MATCH
            ================================================= */

            match:
              toBoolean(
                row.fmatch
              ),


            /* =================================================
               DESCRIPTION
            ================================================= */

            description:
              row.fdescription ??
              "",

          };

        }
      );


  /* =======================================================
     TOTAL
  ======================================================= */

  const total =
    rows.reduce(
      (
        sum: number,
        row: ReceiptDetailRow
      ): number => {

        return (
          sum +
          (
            Number(
              row.creditAmount
            ) || 0
          )
        );

      },

      0
    );


  /* =======================================================
     FINAL RESULT
  ======================================================= */

  const result: GetDataResult = {

    exists: true,

    header,

    rows,

    total,

    rowCount:
      rows.length,

    message:
      `${header?.docNo} loaded`,

  };


  /* =======================================================
     DEBUG
  ======================================================= */

  console.log(
    "\n======================================"
  );

  console.log(
    "GET RECEIPT SUCCESS"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  console.log(
    "======================================"
  );


  return result;
}