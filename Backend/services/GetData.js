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


/* =========================================================
   DOCUMENT TYPE
========================================================= */

function StrDocType(value) {

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
  client,
  {
    mode,
    branch,
    docType,
    docNo,
    cursorName,
  }
) {

  /* =======================================================
     IMPORTANT

     PostgreSQL procedure signature:

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
     23 p_strcbccid
     24 p_strcuserid
     25 p_result_cursor
  ======================================================= */

  const sql = `
    CALL dbo.sp_pagesreceipt(

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
      $23::varchar,
      $24::varchar,

      $25::refcursor

    )
  `;


  const values = [

    /* 1 - p_strmode */
    mode,

    /* 2 - p_pstrcoid */
    PstrCoID,

    /* 3 - p_pstryear */
    PstrYear,

    /* 4 - p_strbrid */
    clean(branch),

    /* 5 - p_strdoctype */
    clean(docType),

    /* 6 - p_strdocno */
    clean(docNo),

    /* 7 - p_intslno */
    0,

    /* 8 - p_dtpdate */
    null,

    /* 9 - p_strcbaccountid */
    null,

    /* 10 - p_strreceivedfrompaidto */
    null,

    /* 11 - p_strref */
    null,

    /* 12 - p_straccountid */
    null,

    /* 13 - p_strgcs */
    null,

    /* 14 - p_strdivid */
    null,

    /* 15 - p_strccid */
    null,

    /* 16 - p_numdebit */
    0,

    /* 17 - p_numcredit */
    0,

    /* 18 - p_strdescription */
    null,

    /* 19 - p_strnote */
    null,

    /* 20 - p_blnmatch */
    false,

    /* 21 - p_pstruserid */
    PstrUserID,

    /* 22 - p_struserdate */
    null,

    /* 23 - p_strcbccid */
    null,

    /* 24 - p_strcuserid */
    null,

    /* 25 - p_result_cursor */
    cursorName,

  ];


  console.log(
    "======================================"
  );

  console.log(
    `Calling sp_pagesreceipt - ${mode}`
  );

  console.log({

    mode,

    companyId: PstrCoID,

    year: PstrYear,

    branch: clean(branch),

    docType: clean(docType),

    docNo: clean(docNo),

  });

  console.log(
    "======================================"
  );


  await client.query(
    sql,
    values
  );


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

  strbranch,

  strdocType,

  strdocNo,

}) {

  console.log(
    "\n======================================"
  );

  console.log(
    "GETDATA TL"
  );

  console.log(
    "Branch:",
    JSON.stringify(strbranch)
  );

  console.log(
    "Doc Type:",
    JSON.stringify(strdocType)
  );

  console.log(
    "Doc No:",
    JSON.stringify(strdocNo)
  );

  console.log(
    "======================================"
  );


  const client =
    await pool.connect();


  try {

    const branch =
      clean(strbranch);

    const docType =
      StrDocType(strdocType);

    const docNo =
      clean(strdocNo);


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


    await client.query(
      "BEGIN"
    );


    const cursorName =
      `cur_receipt_tl_${Date.now()}_${Math.floor(
        Math.random() * 100000
      )}`;


    const rows =
      await callReceiptProcedure(
        client,
        {
          mode: "GETTL",

          branch,

          docType,

          docNo,

          cursorName,
        }
      );


    console.log(
      "GETTL row count:",
      rows.length
    );


    console.log(
      "GETTL rows:",
      rows
    );


    await client.query(
      "COMMIT"
    );


    return rows;


  } catch (error) {

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError) {

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

  strbranch,

  strdocType,

  strdocNo,

}) {

  console.log(
    "\n======================================"
  );

  console.log(
    "GETDATA HD"
  );

  console.log(
    "Branch:",
    JSON.stringify(strbranch)
  );

  console.log(
    "Doc Type:",
    JSON.stringify(strdocType)
  );

  console.log(
    "Doc No:",
    JSON.stringify(strdocNo)
  );

  console.log(
    "======================================"
  );


  const client =
    await pool.connect();


  try {

    const branch =
      clean(strbranch);

    const docType =
      StrDocType(strdocType);

    const docNo =
      clean(strdocNo);


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


    await client.query(
      "BEGIN"
    );


    const cursorName =
      `cur_receipt_hd_${Date.now()}_${Math.floor(
        Math.random() * 100000
      )}`;


    const rows =
      await callReceiptProcedure(
        client,
        {
          mode: "GETHD",

          branch,

          docType,

          docNo,

          cursorName,
        }
      );


    console.log(
      "GETHD row count:",
      rows.length
    );


    console.log(
      "GETHD rows:",
      rows
    );


    await client.query(
      "COMMIT"
    );


    return rows;


  } catch (error) {

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError) {

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

  strbranch,

  strdocType,

  strdocNo,

}) {

  console.log(
    "\n\n======================================"
  );

  console.log(
    "GET RECEIPT FOR MODIFY"
  );

  console.log(
    "Branch:",
    JSON.stringify(strbranch)
  );

  console.log(
    "Doc Type:",
    JSON.stringify(strdocType)
  );

  console.log(
    "Doc No:",
    JSON.stringify(strdocNo)
  );

  console.log(
    "======================================"
  );


  /* =======================================================
     NORMALIZE
  ======================================================= */

  const branch =
    clean(strbranch);

  const docType =
    StrDocType(strdocType);

  const docNo =
    clean(strdocNo);


  /* =======================================================
     VALIDATION
  ======================================================= */

  if (isEmpty(branch)) {

    return {

      exists: false,

      header: null,

      rows: [],

      message:
        "Branch is required",

    };

  }


  if (isEmpty(docType)) {

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

     VB:

     dtRVS = objDoc.GetDataTL(
         strBrID,
         strDocType,
         strDocNo
     )
  ======================================================= */

  console.log(
    "Calling GetDataTL..."
  );


  const detailRows =
    await GetDataTL({

      strbranch:
        branch,

      strdocType:
        docType,

      strdocNo:
        docNo,

    });


  console.log(
    "GetDataTL returned:",
    detailRows.length
  );


  /* =======================================================
     GET HEADER

     VB:

     dr = objDoc.GetDataHD(
         strBrID,
         strDocType,
         strDocNo
     )
  ======================================================= */

  console.log(
    "Calling GetDataHD..."
  );


  const headerRows =
    await GetDataHD({

      strbranch:
        branch,

      strdocType:
        docType,

      strdocNo:
        docNo,

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
     HEADER
  ======================================================= */

  const dbHeader =
    headerRows[0];


  const header = {

    companyId:
      dbHeader.fcoid ??
      PstrCoID,


    year:
      dbHeader.fyear ??
      PstrYear,


    branch:
      dbHeader.fbrid ??
      branch,


    docType:
      dbHeader.fdoctype ??
      docType,


    docNo:
      dbHeader.fdocno ??
      docNo,


    receiptDate:
      dbHeader.fdate ??
      null,


    cashBank:
      dbHeader.fcbaccountid ??
      "",


    /*
       Your current GETHD procedure returns:

       MAX(fccid) AS fccid

       So use fccid here.
    */

    cashBankCcId:
      dbHeader.fcbccid ??
      dbHeader.fccid ??
      "",


    receivedFrom:
      dbHeader.freceivedfrompaidto ??
      "",


    reference:
      dbHeader.fref ??
      "",


    note:
      dbHeader.fnote ??
      "",


    division:
      dbHeader.fdivid ??
      "",


    totalCredit:
      Number(
        dbHeader.totalcredit
      ) || 0,

  };


  /* =======================================================
     DETAIL ROWS
  ======================================================= */

  const rows =
    (detailRows || [])
      .filter(
        (row) =>
          Number(row.fslno) > 0
      )
      .map(
      (row, index) => {

        return {

          id:
            Number(row.fslno) ||
            index + 1,


          accountId:
            row.faccountid ??
            "",


          /*
             Current GETTL procedure does not
             return faccountname.

             Therefore Account Name will need
             a JOIN in PostgreSQL if required.
          */

          accountName:
            row.faccountname ??
            "",


          fgcs:
            row.fgcs ??
            "",


          division:
            row.fdivid ??
            "",


          ccId:
            row.fccid ??
            "",


          creditAmount:
            row.fcredit !== null &&
            row.fcredit !== undefined

              ? String(
                  row.fcredit
                )

              : "",


          match:
            toBoolean(
              row.fmatch
            ),


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
        sum,
        row
      ) => {

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

  const result = {

    exists: true,

    header,

    rows,

    total,

    rowCount:
      rows.length,

    message:
      "Receipt loaded successfully",

  };


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