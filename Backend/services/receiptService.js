import pool from "../DB/db.js";

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

  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE"
  );
}


function toSmallInt(
  value,
  defaultValue = 0
) {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    return defaultValue;
  }

  return number;
}


/* =========================================================
   DOCUMENT TYPE
========================================================= */

function toDocumentType(value) {
  if (isEmpty(value)) {
    return null;
  }

  const type =
    String(value).trim().toUpperCase();

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

function normalizeDate(value) {
  if (isEmpty(value)) {
    return null;
  }

  const dateString =
    String(value).trim();

  /*
     DD/MM/YYYY
  */

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      dateString
    )
  ) {
    const [
      day,
      month,
      year,
    ] = dateString.split("/");

    return `${year}-${month}-${day}`;
  }

  return dateString;
}


/* =========================================================
   CREATED DATE
========================================================= */

function normalizeCreatedDate(value) {
  if (isEmpty(value)) {
    return null;
  }

  const dateString =
    String(value).trim();

  /*
     DD/MM/YYYY
  */

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      dateString
    )
  ) {
    const [
      day,
      month,
      year,
    ] = dateString.split("/");

    return `${year}-${month}-${day}`;
  }

  return dateString;
}


/* =========================================================
   PROCEDURE CALL
========================================================= */

/*
  dbo.sp_pagesReceipt

  EXACT PARAMETER ORDER

   1  p_strmode
   2  p_pstrcoid
   3  p_pstryear
   4  p_strbrid
   5  p_strdoctype
   6  p_strdocno
   7  p_intslno
   8  p_dtpdate
   9  p_strcbaccountid
  10  p_strreceivedfrompaidto
  11  p_strref
  12  p_straccountid
  13  p_strgcs
  14  p_strdivid
  15  p_strccid
  16  p_numdebit
  17  p_numcredit
  18  p_strdescription
  19  p_strnote
  20  p_blnmatch
  21  p_pstruserid
  22  p_struserdate
  23  p_strcbccid
  24  p_strcuserid
  25  p_result_cursor
*/


async function callReceiptProcedure(
  client,
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

    cbCcId = null,

    cUserId = null,
  }
) {

  /* =======================================================
     CURSOR
  ======================================================= */

  const cursorName =
    `cur_receipt_${Date.now()}_${Math.floor(
      Math.random() * 100000
    )}`;


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

    clean(division),                       // $14

    clean(ccId),                           // $15

    toNumber(debit),                       // $16

    toNumber(credit),                      // $17

    clean(description),                    // $18

    clean(note),                           // $19

    toBoolean(match),                      // $20

    clean(userId),                         // $21

    normalizeCreatedDate(userDate),        // $22                   

    cursorName                             // $23
  ];


  /* =======================================================
     SQL
  ======================================================= */

  const sql = `
    CALL dbo.sp_pagesReceipt(

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

  

      $23::refcursor

    )
  `;


  /* =======================================================
     DEBUG
  ======================================================= */

  console.log(
    "========================================"
  );

  console.log(
    "sp_pagesReceipt"
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

        }
      );


    await client.query(
      "COMMIT"
    );


    return rows;

  } catch (error) {

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
}) {

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

        }
      );


    await client.query(
      "COMMIT"
    );


    return rows;

  } catch (error) {

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

    debit,

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

      cbCcId,

      cUserId:
        createdUserId,

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

      mode: "SC",

      branch,

      docType,

      docNo,

      /*
         SC uses fslno = 0
      */

      slNo: 0,

      receiptDate,

      cbAccountId,

      receivedFrom,

      reference,

      accountId,

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

      cbCcId,

      cUserId:
        createdUserId,

    }
  );
}


/* =========================================================
   DELETE INTERNAL
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

    }
  );
}


/* =========================================================
   SAVE RECEIPT
========================================================= */

export async function saveReceiptService(
  receipt,
  existingClient = null,
  manageTransaction = true
) {

  const client =
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
       DOCUMENT TYPE
    ===================================================== */

    const finalDocType =
      toDocumentType(type);


    /* =====================================================
       VALID ROWS
    ===================================================== */

    const validRows =
      rows.filter(
        (row) =>
          row &&
          !isEmpty(row.accountId)
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


    console.log(
      "Receipt total:",
      finalTotal
    );


    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    if (manageTransaction) {
      await client.query(
        "BEGIN"
      );
    }


    /* =====================================================
       SAVE RECEIPT LINES
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


          cbCcId:
            cbCcId ||
            receipt.cashBankCcId ||
            "",


          accountId:
            row.accountId,


          /*
             fgcs from React row
          */

          gcs:
            row.gcs ||
            row.fgcs ||
            "",


          ccId:
            row.ccId ||
            "",


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


          createdUserId:
            PstrUserID,


          createdUserDate:
            new Date().toISOString(),

        }
      );

    }


    /* =====================================================
       GENERATED SC ENTRY
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
        .join(" - ");


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


        cbCcId:
          cbCcId ||
          receipt.cashBankCcId ||
          "",


        accountId:
          firstRow.accountId,


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


        createdUserId:
          PstrUserID,


        createdUserDate:
          new Date().toISOString(),

      }
    );


    /* =====================================================
       COMMIT
    ===================================================== */

    if (manageTransaction) {
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

  } catch (error) {

    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (manageTransaction) {
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
    }


    console.error(
      "saveReceiptService error:",
      error
    );


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

export async function deleteReceiptService({
  branch,

  type,

  receiptNo,
}) {

  const client =
    await pool.connect();


  try {

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

  } catch (error) {

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError) {

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

export async function updateReceiptService(receipt) {
  const {
    branch,
    type,
    docNo,
  } = receipt || {};

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const finalDocType = toDocumentType(type);

    await deleteReceiptInternal(client, {
      branch,
      docType: finalDocType,
      docNo,
    });

    const result = await saveReceiptService(
      {
        ...receipt,
        receiptNo: docNo,
      },
      client,
      false
    );

    await client.query("COMMIT");

    return {
      ...result,
      message: "Receipt modified successfully",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}