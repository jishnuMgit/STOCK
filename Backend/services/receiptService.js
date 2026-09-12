import pool from "../DB/db.js";

/* =========================================================
   ENVIRONMENT
========================================================= */

const PstrCoID = process.env.PstrCoID || "01";
const PstrYear = Number(process.env.PstrYear || 2026);
const PstrUserID = process.env.PstrUserID || "ADMIN";


/* =========================================================
   HELPERS
========================================================= */

function isEmpty(value) {
  return (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  );
}


function clean(value) {
  if (isEmpty(value)) {
    return null;
  }

  return String(value).trim();
}


function toNumber(value) {
  if (isEmpty(value)) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}


function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE"
  ) {
    return true;
  }

  return false;
}


function toSmallInt(value, defaultValue = 0) {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    return defaultValue;
  }

  return number;
}


/* =========================================================
   DATE NORMALIZATION
========================================================= */

function normalizeDate(value) {
  if (isEmpty(value)) {
    return null;
  }

  const dateString = String(value).trim();

  /*
   DD/MM/YYYY
   */

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)
  ) {
    const [day, month, year] =
      dateString.split("/");

    return `${year}-${month}-${day}`;
  }

  /*
   Already ISO / PostgreSQL compatible
   */

  return dateString;
}


/* =========================================================
   CREATED DATE
========================================================= */

function normalizeCreatedDate(value) {
  if (isEmpty(value)) {
    return null;
  }

  const dateString = String(value).trim();

  /*
   DD/MM/YYYY
   */

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)
  ) {
    const [day, month, year] =
      dateString.split("/");

    return `${year}-${month}-${day}`;
  }

  return dateString;
}


/* =========================================================
   PROCEDURE CALL
========================================================= */

/*
  dbo.sp_receiptpage

  EXACT SIGNATURE

   1  p_strmode
   2  p_gstrcoid
   3  p_gintyear
   4  p_strbrid
   5  p_strdoctype
   6  p_strdocno
   7  p_intmslno
   8  p_dtpdate
   9  p_strreceivedfrompaidto
  10  p_strref
  11  p_strcbaccountid
  12  p_strcbccid
  13  p_straccountid
  14  p_strgcs
  15  p_strccid
  16  p_strfordocno
  17  p_numcredit
  18  p_strdescription
  19  p_strnote
  20  p_strdivid
  21  p_blnmatch
  22  p_gstruserid
  23  p_strcreateduserid
  24  p_dtpcreateduserdate
  25  p_blnupdate20201206
  26  p_result_cursor
*/


async function callReceiptProcedure(
  client,
  {
    mode,

    branch,
    docType=docType+"R",
    docNo,

    slNo = 0,

    receiptDate = null,

    receivedFrom = null,
    reference = null,

    cbAccountId = null,
    cbCcId = null,

    accountId = null,
    gcs = null,
    ccId = null,

    forDocNo = null,

    credit = 0,

    description = null,
    note = null,

    division = null,
    match = false,

    userId = PstrUserID,
    createdUserId = null,
    createdUserDate = null,

    update20201206 = false,
  }
) {

  /*
   Cursor name must be unique per transaction.
  */

 const cursorName = `cur_receipt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;



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

    clean(receivedFrom),                   // $9

    clean(reference),                      // $10

    clean(cbAccountId),                    // $11

    clean(cbCcId),                         // $12

    clean(accountId),                      // $13

    clean(gcs),                            // $14

    clean(ccId),                           // $15

    clean(forDocNo),                       // $16

    toNumber(credit),                      // $17

    clean(description),                    // $18

    clean(note),                           // $19

    clean(division),                       // $20

    toBoolean(match),                      // $21

    clean(userId),                         // $22

    clean(createdUserId),                  // $23

    normalizeCreatedDate(createdUserDate), // $24

    Boolean(update20201206),               // $25

    cursorName                             // $26
  ];


  /* =======================================================
     SQL
  ======================================================= */

  const sql = `
    CALL dbo.sp_receiptpage(
      $1::varchar,
      $2::varchar,
      $3::smallint,
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
      $16::varchar,
      $17::numeric,
      $18::varchar,
      $19::varchar,
      $20::varchar,
      $21::boolean,
      $22::varchar,
      $23::varchar,
      $24::varchar,
      $25::boolean,
      $26::refcursor
    )
  `;


  console.log(
    "sp_receiptpage mode:",
    mode
  );

  console.log(
    "sp_receiptpage values:",
    values
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
   GET RECEIPT HEADER
========================================================= */

export async function getReceiptHeader({
  branch,
  docType,
  docNo,
}) {

  const client =
    await pool.connect();

  try {

    await client.query("BEGIN");


    const rows =
      await callReceiptProcedure(
        client,
        {
          mode: "GetHD",

          branch,
          docType,
          docNo,

          slNo: 0,

          update20201206: false,
        }
      );


    await client.query("COMMIT");


    return rows;

  } catch (error) {

    await client.query("ROLLBACK");

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
}) {

  const client =
    await pool.connect();

  try {

    await client.query("BEGIN");


    const rows =
      await callReceiptProcedure(
        client,
        {
          mode: "GetTL",

          branch,
          docType,
          docNo,

          slNo: 0,

          update20201206: false,
        }
      );


    await client.query("COMMIT");


    return rows;

  } catch (error) {

    await client.query("ROLLBACK");

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
  client,
  {
    branch,
    docType,
    docNo,

    slNo,

    receiptDate,

    receivedFrom,
    reference,

    cbAccountId,
    cbCcId,

    accountId,
    gcs,
    ccId,

    forDocNo,

    credit,

    description,
    note,

    division,
    match,

    createdUserId,
    createdUserDate,
  }
) {

  return callReceiptProcedure(
    client,
    {
      mode: "S",

      branch,
      docType,
      docNo,

      slNo,

      receiptDate,

      receivedFrom,
      reference,

      cbAccountId,
      cbCcId,

      accountId,
      gcs,
      ccId,

      forDocNo,

      credit,

      description,
      note,

      division,
      match,

      userId: PstrUserID,

      createdUserId,
      createdUserDate,

      update20201206: true,
    }
  );
}


/* =========================================================
   SAVE GENERATED ENTRY
========================================================= */

async function saveGeneratedEntry(
  client,
  {
    branch,
    docType,
    docNo,

    receiptDate,

    receivedFrom,
    reference,

    cbAccountId,
    cbCcId,

    accountId,
    gcs,
    ccId,

    forDocNo,

    total,

    description,
    note,

    division,
    match,

    createdUserId,
    createdUserDate,
  }
) {

  return callReceiptProcedure(
    client,
    {
      mode: "SC",

      branch,
      docType,
      docNo,

      /*
       SC internally creates fslno = 0.
       */

      slNo: 0,

      receiptDate,

      receivedFrom,
      reference,

      cbAccountId,
      cbCcId,

      accountId,
      gcs,
      ccId,

      forDocNo,

      credit: total,

      description,
      note,

      division,
      match,

      userId: PstrUserID,

      createdUserId,
      createdUserDate,

      update20201206: true,
    }
  );
}


/* =========================================================
   DELETE
========================================================= */

async function deleteReceiptInternal(
  client,
  {
    branch,
    docType,
    docNo,
  }
) {

  return callReceiptProcedure(
    client,
    {
      mode: "D",

      branch,
      docType,
      docNo,

      slNo: 0,

      update20201206: false,
    }
  );
}


/* =========================================================
   SAVE RECEIPT
========================================================= */

export async function saveReceiptService(
  receipt
) {

  const client =
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

      total,

    } = receipt || {};


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (isEmpty(branch)) {

      throw new Error(
        "Branch is required"
      );

    }


    if (isEmpty(type)) {

      throw new Error(
        "Receipt type is required"
      );

    }


    if (isEmpty(receiptNo)) {

      throw new Error(
        "Receipt number is required"
      );

    }


    if (isEmpty(receiptDate)) {

      throw new Error(
        "Receipt date is required"
      );

    }


    if (isEmpty(cashBank)) {

      throw new Error(
        "Cash/Bank account is required"
      );

    }


    if (!Array.isArray(rows)) {

      throw new Error(
        "Receipt rows are invalid"
      );

    }


    /* =====================================================
       ONLY ROWS WITH ACCOUNT
    ===================================================== */

    const validRows =
      rows.filter(
        (row) =>
          row &&
          !isEmpty(row.accountId)
      );


    if (validRows.length === 0) {

      throw new Error(
        "There is no information for saving."
      );

    }


    /* =====================================================
       TOTAL
    ===================================================== */

    const calculatedTotal =
      validRows.reduce(
        (sum, row) => {

          return (
            sum +
            toNumber(
              row.creditAmount
            )
          );

        },
        0
      );


    /*
     Always calculate from actual rows.
     This prevents frontend total mismatch.
    */

    const finalTotal =
      calculatedTotal;


    console.log(
      "Receipt total:",
      finalTotal
    );


    /* =====================================================
       TRANSACTION
    ===================================================== */

    await client.query("BEGIN");


    /* =====================================================
       SAVE EACH LINE
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

          docType: type,

          docNo: receiptNo,

          slNo,


          receiptDate,

          receivedFrom,

          reference,


          cbAccountId:
            cashBank,

          cbCcId:
            cbCcId ||
            receipt.cashBankCcId ||
            "",


          accountId:
            row.accountId,


          /*
           Account classification
           */

          gcs:
            row.gcs ||
            row.fgcs ||
            "",


          ccId:
            row.ccId ||
            "",


          forDocNo:
            row.forDocNo ||
            "",


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


          createdUserId:
            PstrUserID,


          createdUserDate:
            new Date().toISOString(),

        }
      );

    }


    /* =====================================================
       GENERATED / SC ENTRY
    =====================================================

       The procedure creates the generated entry
       with fslno = 0.

       We use the first valid row only for the
       account classification information.
    */

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
        .join(" - ");


    await saveGeneratedEntry(
      client,
      {

        branch,

        docType: type,

        docNo: receiptNo,


        receiptDate,

        receivedFrom,

        reference,


        cbAccountId:
          cashBank,

        cbCcId:
          cbCcId ||
          receipt.cashBankCcId ||
          "",


        /*
         Original receipt account
         */

        accountId:
          firstRow.accountId,


        gcs:
          firstRow.gcs ||
          firstRow.fgcs ||
          "",


        ccId:
          firstRow.ccId ||
          "",


        forDocNo:
          firstRow.forDocNo ||
          "",


        total:
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


        createdUserId:
          PstrUserID,


        createdUserDate:
          new Date().toISOString(),

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
        "Receipt saved successfully",

      data: {

        companyId:
          PstrCoID,

        year:
          PstrYear,

        branch,

        docType:
          type,

        receiptNo,

        total:
          finalTotal,
          cashBank: cashBank,

        rowCount:
          validRows.length,

      },

    };

  } catch (error) {

    /* =====================================================
       ROLLBACK
    ===================================================== */

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError) {

      console.error(
        "Receipt rollback error:",
        rollbackError
      );

    }


    console.error(
      "saveReceiptService error:",
      error
    );


    throw error;

  } finally {

    client.release();

  }
}


/* =========================================================
   DELETE RECEIPT SERVICE
========================================================= */

export async function deleteReceiptService({
  branch,
  type,
  receiptNo,
}) {

  const client =
    await pool.connect();


  try {

    if (isEmpty(branch)) {

      throw new Error(
        "Branch is required"
      );

    }


    if (isEmpty(type)) {

      throw new Error(
        "Receipt type is required"
      );

    }


    if (isEmpty(receiptNo)) {

      throw new Error(
        "Receipt number is required"
      );

    }


    await client.query(
      "BEGIN"
    );


    await deleteReceiptInternal(
      client,
      {
        branch,
        docType: type,
        docNo: receiptNo,
      }
    );


    await client.query(
      "COMMIT"
    );


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
          type,

        receiptNo,

      },

    };

  } catch (error) {

    await client.query(
      "ROLLBACK"
    );


    console.error(
      "deleteReceiptService error:",
      error
    );


    throw error;

  } finally {

    client.release();

  }
}