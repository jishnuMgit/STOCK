import pool from "../DB/db.js";
import dotenv from "dotenv";

dotenv.config();

/* =========================================================
   ENVIRONMENT
========================================================= */

const PstrCoID = process.env.PstrCoID;
const PstrYear = Number(process.env.PstrYear);
const PstrUserID = process.env.PstrUserID;


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


function toNumber(value) {
  if (isEmpty(value)) {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}


/* =========================================================
   DATE VALIDATION
========================================================= */

function parseDateDDMMYYYY(value) {
  if (isEmpty(value)) {
    return null;
  }

  const parts = String(value).split("/");

  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}


/* =========================================================
   SAVE RECEIPT
========================================================= */

export const saveReceiptService = async (receipt) => {
  const client = await pool.connect();

  let transactionStarted = false;

  try {

    /* =====================================================
       ENVIRONMENT DEBUG
    ===================================================== */

    console.log("=================================");
    console.log("Receipt Environment");
    console.log("=================================");
    console.log("PstrCoID:", PstrCoID);
    console.log("PstrYear:", PstrYear);
    console.log("PstrUserID:", PstrUserID);
    console.log("=================================");


    /* =====================================================
       1. GET DATA
    ===================================================== */

    const {
      mode = "S",

      branch,
      type,

      receiptNo,
      receiptDate,

      cashBank,
      cashBankCC = "",

      receivedFrom = "",
      reference = "",
      note = "",

      rows = [],

      userId = PstrUserID,
      createdUserId = PstrUserID,
      createdUserDate = "",

      docNoIncrementMode = "Auto",
    } = receipt;


    /* =====================================================
       2. ENVIRONMENT
    ===================================================== */

    const coid = PstrCoID;
    const year = PstrYear;


    /* =====================================================
       3. NORMALIZE
    ===================================================== */

    const finalCoID =
      String(coid ?? "").trim();

    const finalYear =
      Number(year);

    const finalBranch =
      String(branch ?? "").trim();

    const finalDocType =
      String(type ?? "").trim();

    let finalDocNo =
      String(receiptNo ?? "").trim();

    const finalCashBank =
      String(cashBank ?? "").trim();

    const finalCashBankCC =
      String(cashBankCC ?? "").trim();

    const finalReceivedFrom =
      String(receivedFrom ?? "");

    const finalReference =
      String(reference ?? "");

    const finalNote =
      String(note ?? "");

    const finalUserId =
      String(
        userId ??
        PstrUserID ??
        ""
      ).trim();

    const finalCreatedUserId =
      String(
        createdUserId ||
        userId ||
        PstrUserID ||
        ""
      ).trim();

    const finalCreatedUserDate =
      String(
        createdUserDate ||
        new Date().toISOString()
      );


    /* =====================================================
       4. BASIC VALIDATION
    ===================================================== */

    if (isEmpty(finalCoID)) {
      throw new Error(
        "Company ID is required"
      );
    }

    if (
      !Number.isInteger(finalYear) ||
      finalYear <= 0
    ) {
      throw new Error(
        "Financial year is required"
      );
    }

    if (isEmpty(finalBranch)) {
      throw new Error(
        "Please select a 'Branch'"
      );
    }

    if (isEmpty(finalDocType)) {
      throw new Error(
        "Document Type is required"
      );
    }

    if (isEmpty(finalDocNo)) {
      throw new Error(
        "Please input 'Receipt No.'"
      );
    }

    if (isEmpty(finalCashBank)) {
      throw new Error(
        "Please select an 'Account'"
      );
    }

    if (isEmpty(receiptDate)) {
      throw new Error(
        "Please select 'Date'"
      );
    }


    /* =====================================================
       5. DATE VALIDATION
    ===================================================== */

    const parsedDate =
      parseDateDDMMYYYY(receiptDate);

    if (!parsedDate) {
      throw new Error(
        "Invalid receipt date. Expected DD/MM/YYYY"
      );
    }

    if (
      parsedDate.getFullYear() !==
      finalYear
    ) {
      throw new Error(
        "'Login Year' should be same as 'Transaction Year'"
      );
    }


    /* =====================================================
       6. REMOVE EMPTY ROWS
    ===================================================== */

    const validRows =
      Array.isArray(rows)
        ? rows.filter(
            (row) =>
              !isEmpty(row?.accountId)
          )
        : [];


    /* =====================================================
       7. ROW COUNT
    ===================================================== */

    if (validRows.length === 0) {
      throw new Error(
        "There is no information for saving."
      );
    }


    /* =====================================================
       8. VALIDATE GRID
    ===================================================== */

    for (
      let index = 0;
      index < validRows.length;
      index++
    ) {

      const row =
        validRows[index];

      const slNo =
        index + 1;


      /* -----------------------------------------------
         ACCOUNT ID
      ------------------------------------------------ */

      if (
        isEmpty(row.accountId)
      ) {
        throw new Error(
          `Sl.# : ${slNo} - Please input the 'Account ID'`
        );
      }


      /* -----------------------------------------------
         FOR DOCUMENT -> YEAR
         
         Current procedure has p_strfordocno,
         but does NOT have p_strforyear.
         
         Therefore only validate/use forDocNo here.
      ------------------------------------------------ */

    }


    /* =====================================================
       9. TOTAL
    ===================================================== */

    const totalAmount =
      validRows.reduce(
        (sum, row) =>
          sum +
          toNumber(
            row.creditAmount
          ),
        0
      );


    console.log(
      "Receipt Total:",
      totalAmount
    );


    /* =====================================================
       10. DOCUMENT NUMBER
    ===================================================== */

    let docNoChanged = false;

    let prefixLength = 0;


    /* =====================================================
       11. DUPLICATE CHECK
    ===================================================== */

    if (mode === "S") {

      const duplicateResult =
        await client.query(
          `
          SELECT EXISTS (
            SELECT 1
            FROM dbo.tblFinTrans
            WHERE fcoid = $1
              AND fyear = $2
              AND fbrid = $3
              AND fdoctype = $4
              AND fdocno = $5
          ) AS exists
          `,
          [
            finalCoID,
            finalYear,
            finalBranch,
            finalDocType,
            finalDocNo,
          ]
        );


      const documentExists =
        duplicateResult.rows[0]?.exists === true;


      console.log(
        "Document Exists:",
        documentExists
      );


      if (documentExists) {

        if (
          docNoIncrementMode ===
          "Auto"
        ) {

          docNoChanged = true;

          const nextDoc =
            await getNextValidDocNo(
              client,
              {
                coid: finalCoID,
                year: finalYear,
                branch: finalBranch,
                docType: finalDocType,
              }
            );

          finalDocNo =
            nextDoc.docNo;

          prefixLength =
            nextDoc.prefixLength;


          console.log(
            "New Receipt No:",
            finalDocNo
          );

        } else {

          throw new Error(
            "Receipt Voucher with the same Receipt No. is already saved from other workstation"
          );
        }
      }
    }


    /* =====================================================
       12. PREFIX LENGTH
    ===================================================== */

    if (prefixLength === 0) {

      prefixLength =
        await getDocumentPrefixLength(
          client,
          {
            coid: finalCoID,
            year: finalYear,
            branch: finalBranch,
            docType: finalDocType,
          }
        );
    }


    console.log(
      "Document Number:",
      finalDocNo
    );

    console.log(
      "Prefix Length:",
      prefixLength
    );


    /* =====================================================
       13. BEGIN TRANSACTION
    ===================================================== */

    await client.query(
      "BEGIN"
    );

    transactionStarted = true;


    /* =====================================================
       14. DELETE OLD DOCUMENT
       
       Equivalent to ApplyD()
    ===================================================== */

    await callReceiptProcedure(
      client,
      {
        mode: "D",

        coid: finalCoID,
        year: finalYear,

        branch: finalBranch,
        docType: finalDocType,
        docNo: finalDocNo,

        userId:
          finalUserId,

        createdUserId:
          finalCreatedUserId,

        createdUserDate:
          finalCreatedUserDate,
      }
    );


    /* =====================================================
       15. SAVE LINES
       
       Equivalent to Apply()
    ===================================================== */

    for (
      let index = 0;
      index < validRows.length;
      index++
    ) {

      const row =
        validRows[index];


      const gcs =
        String(
          row.gcs ??
          row.fgcs ??
          ""
        ).trim();


      console.log(
        "Saving receipt row:",
        {
          slNo: index + 1,
          accountId: row.accountId,
          gcs,
          ccId: row.ccId,
          credit: row.creditAmount,
          forDocNo: row.forDocNo,
        }
      );


      await callReceiptProcedure(
        client,
        {
          mode: "S",

          coid: finalCoID,
          year: finalYear,

          branch: finalBranch,
          docType: finalDocType,
          docNo: finalDocNo,

          slNo:
            index + 1,

          receiptDate,

          receivedFrom:
            finalReceivedFrom,

          cbAccountId:
            finalCashBank,

          cbCcId:
            finalCashBankCC,

          accountId:
            String(
              row.accountId ?? ""
            ),

          gcs,

          ccId:
            String(
              row.ccId ?? ""
            ),

          forDocNo:
            String(
              row.forDocNo ?? ""
            ),

          credit:
            toNumber(
              row.creditAmount
            ),

          description:
            String(
              row.description ?? ""
            ),

          note:
            finalNote,

          userId:
            finalUserId,

          createdUserId:
            finalCreatedUserId,

          createdUserDate:
            finalCreatedUserDate,

          update20201206:
            true,
        }
      );
    }


    /* =====================================================
       16. CHECK UI TRANSACTION
    ===================================================== */

    const uiDocumentResult =
      await client.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM dbo.tblFinTrans
          WHERE fcoid = $1
            AND fyear = $2
            AND fbrid = $3
            AND fdoctype = $4
            AND fdocno = $5
            AND forigin = 'UI'
        ) AS exists
        `,
        [
          finalCoID,
          finalYear,
          finalBranch,
          finalDocType,
          finalDocNo,
        ]
      );


    const uiDocumentExists =
      uiDocumentResult.rows[0]?.exists === true;


    console.log(
      "UI Transaction Exists:",
      uiDocumentExists
    );


    /* =====================================================
       17. CREATE SC ENTRY
       
       Equivalent to ApplyG()
    ===================================================== */

    if (uiDocumentExists) {

      await callReceiptProcedure(
        client,
        {
          mode: "SC",

          coid: finalCoID,
          year: finalYear,

          branch: finalBranch,
          docType: finalDocType,
          docNo: finalDocNo,

          slNo: 0,

          receiptDate,

          receivedFrom:
            finalReceivedFrom,

          cbAccountId:
            finalCashBank,

          cbCcId:
            finalCashBankCC,

          accountId:
            finalCashBank,

          gcs:
            "G",

          ccId:
            finalCashBankCC,

          forDocNo:
            "",

          totalAmount,

          description:
            `${finalReference} - ${finalReceivedFrom}`,

          note:
            finalNote,

          userId:
            finalUserId,

          createdUserId:
            finalCreatedUserId,

          createdUserDate:
            finalCreatedUserDate,

          update20201206:
            true,
        }
      );
    }


    /* =====================================================
       18. INCREMENT DOCUMENT NUMBER
    ===================================================== */

    if (
      mode === "S" &&
      !docNoChanged &&
      docNoIncrementMode === "Auto"
    ) {

      await incrementDocumentNumber(
        client,
        {
          coid: finalCoID,
          year: finalYear,
          branch: finalBranch,
          docType: finalDocType,
        }
      );
    }


    /* =====================================================
       19. COMMIT
    ===================================================== */

    await client.query(
      "COMMIT"
    );

    transactionStarted = false;


    /* =====================================================
       20. RESULT
    ===================================================== */

    return {
      message:
        mode === "S"
          ? "Saved"
          : "Modified",

      data: {
        mode,

        docNo:
          finalDocNo,

        total:
          totalAmount,

        rowCount:
          validRows.length,

        docNoChanged,

        ...(docNoChanged
          ? {
              notification:
                `'Receipt No.' is changed to ${finalDocNo}`,
            }
          : {}),
      },
    };

  } catch (error) {

    console.error(
      "saveReceiptService error:",
      error
    );


    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (transactionStarted) {

      try {

        await client.query(
          "ROLLBACK"
        );

      } catch (rollbackError) {

        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }


    throw error;

  } finally {

    client.release();
  }
};


/* =========================================================
   GET NEXT VALID DOCUMENT NUMBER
========================================================= */

async function getNextValidDocNo(
  client,
  {
    coid,
    year,
    branch,
    docType,
  }
) {

  while (true) {

    const result =
      await client.query(
        `
        SELECT *
        FROM dbo.getnextdocno(
          $1,
          $2,
          $3,
          $4,
          $5
        )
        `,
        [
          String(coid),
          Number(year),
          String(branch),
          String(docType),
          "dbo.tblfintrans"
        ]
      );


    if (!result.rows.length) {

      throw new Error(
        "Unable to generate next Receipt No."
      );
    }


    const row =
      result.rows[0];


    console.log(
      "getnextdocno result:",
      row
    );


    const generatedDocNo =
      row.docno ??
      row.strnextdocno ??
      row.nextdocno ??
      row.fdocno ??
      row.getnextdocno ??
      "";


    const prefixLength =
      Number(
        row.prefixlen ??
        row.intprefixlen ??
        row.fprefixlen ??
        0
      );


    if (
      isEmpty(generatedDocNo)
    ) {

      throw new Error(
        "Unable to generate next Receipt No."
      );
    }


    const existsResult =
      await client.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM dbo.tblFinTrans
          WHERE fcoid = $1
            AND fyear = $2
            AND fbrid = $3
            AND fdoctype = $4
            AND fdocno = $5
        ) AS exists
        `,
        [
          coid,
          year,
          branch,
          docType,
          generatedDocNo,
        ]
      );


    const exists =
      existsResult.rows[0]?.exists === true;


    if (!exists) {

      return {
        docNo:
          String(generatedDocNo),

        prefixLength:
          prefixLength,
      };
    }
  }
}


/* =========================================================
   GET PREFIX LENGTH
========================================================= */

async function getDocumentPrefixLength(
  client,
  {
    coid,
    year,
    branch,
    docType,
  }
) {

  const result =
    await client.query(
      `
      SELECT *
      FROM dbo.getnextdocno(
        $1,
        $2,
        $3,
        $4,
        $5
      )
      `,
      [
        String(coid),
        Number(year),
        String(branch),
        String(docType),
        "dbo.tblfintrans"
      ]
    );


  if (!result.rows.length) {
    return 0;
  }


  const row =
    result.rows[0];


  console.log(
    "getnextdocno prefix row:",
    row
  );


  return Number(
    row.prefixlen ??
    row.intprefixlen ??
    row.fprefixlen ??
    0
  );
}


/* =========================================================
   CALL RECEIPT PROCEDURE
========================================================= */

async function callReceiptProcedure(
  client,
  data
) {

  /*
   ============================================================
   CURRENT POSTGRESQL PROCEDURE SIGNATURE
   ============================================================

   p_strchequeno DOES NOT EXIST.

   $1  p_strmode
   $2  p_gstrcoid
   $3  p_gintyear
   $4  p_strbrid
   $5  p_strdoctype
   $6  p_strdocno
   $7  p_intmslno
   $8  p_dtpdate
   $9  p_strreceivedfrompaidto
   $10 p_strcbaccountid
   $11 p_strcbccid
   $12 p_straccountid
   $13 p_strgcs
   $14 p_strccid
   $15 p_strfordocno
   $16 p_numcredit
   $17 p_strdescription
   $18 p_strnote
   $19 p_gstruserid
   $20 p_strcreateduserid
   $21 p_dtpcreateduserdate
   $22 p_blnupdate20201206
   $23 p_result_cursor
  */


  /* =======================================================
     COMMON QUERY
  ======================================================= */

  const query = `
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
      $16::numeric,
      $17::varchar,
      $18::varchar,
      $19::varchar,
      $20::varchar,
      $21::varchar,
      $22::boolean,
      $23::refcursor
    )
  `;


  /* =======================================================
     MODE D
  ======================================================= */

  if (data.mode === "D") {

    console.log(
      "Calling sp_receiptpage MODE D",
      {
        coid: data.coid,
        year: data.year,
        branch: data.branch,
        docType: data.docType,
        docNo: data.docNo,
      }
    );


    const values = [
      "D",                                // $1
      String(data.coid ?? ""),            // $2
      Number(data.year ?? 0),             // $3
      String(data.branch ?? ""),          // $4
      String(data.docType ?? ""),         // $5
      String(data.docNo ?? ""),           // $6

      0,                                  // $7
      null,                               // $8
      null,                               // $9
      null,                               // $10
      null,                               // $11
      null,                               // $12
      null,                               // $13
      null,                               // $14
      null,                               // $15
      0,                                  // $16
      null,                               // $17
      null,                               // $18
      String(data.userId ?? ""),          // $19
      String(data.createdUserId ?? ""),   // $20
      String(data.createdUserDate ?? ""), // $21
      false,                              // $22
      "cur_receiptpage"                   // $23
    ];


    await client.query(
      query,
      values
    );

    return;
  }


  /* =======================================================
     MODE S
  ======================================================= */

  if (data.mode === "S") {

    console.log(
      "Calling sp_receiptpage MODE S",
      {
        slNo:
          data.slNo,

        receiptDate:
          data.receiptDate,

        receivedFrom:
          data.receivedFrom,

        cbAccountId:
          data.cbAccountId,

        cbCcId:
          data.cbCcId,

        accountId:
          data.accountId,

        gcs:
          data.gcs,

        ccId:
          data.ccId,

        forDocNo:
          data.forDocNo,

        credit:
          data.credit,
      }
    );


    const values = [
      "S",                                // $1
      String(data.coid ?? ""),            // $2
      Number(data.year ?? 0),             // $3
      String(data.branch ?? ""),          // $4
      String(data.docType ?? ""),         // $5
      String(data.docNo ?? ""),           // $6

      Number(data.slNo ?? 0),             // $7

      String(data.receiptDate ?? ""),     // $8
      String(data.receivedFrom ?? ""),    // $9

      String(data.cbAccountId ?? ""),     // $10
      String(data.cbCcId ?? ""),          // $11
      String(data.accountId ?? ""),       // $12
      String(data.gcs ?? ""),             // $13
      String(data.ccId ?? ""),            // $14
      String(data.forDocNo ?? ""),        // $15

      Number(data.credit ?? 0),            // $16

      String(data.description ?? ""),     // $17
      String(data.note ?? ""),            // $18
      String(data.userId ?? ""),          // $19
      String(data.createdUserId ?? ""),   // $20
      String(data.createdUserDate ?? ""), // $21

      Boolean(data.update20201206),       // $22

      "cur_receiptpage"                   // $23
    ];


    await client.query(
      query,
      values
    );

    return;
  }


  /* =======================================================
     MODE SC
  ======================================================= */

  if (data.mode === "SC") {

    console.log(
      "Calling sp_receiptpage MODE SC",
      {
        totalAmount:
          data.totalAmount,

        accountId:
          data.accountId,

        gcs:
          data.gcs,

        cbAccountId:
          data.cbAccountId,

        cbCcId:
          data.cbCcId,
      }
    );


    const values = [
      "SC",                               // $1
      String(data.coid ?? ""),            // $2
      Number(data.year ?? 0),             // $3
      String(data.branch ?? ""),          // $4
      String(data.docType ?? ""),         // $5
      String(data.docNo ?? ""),           // $6

      Number(data.slNo ?? 0),             // $7

      String(data.receiptDate ?? ""),     // $8
      String(data.receivedFrom ?? ""),    // $9

      String(data.cbAccountId ?? ""),     // $10
      String(data.cbCcId ?? ""),          // $11
      String(data.accountId ?? ""),       // $12
      String(data.gcs ?? ""),             // $13
      String(data.ccId ?? ""),            // $14
      String(data.forDocNo ?? ""),        // $15

      Number(
        data.totalAmount ??
        data.credit ??
        0
      ),                                  // $16

      String(data.description ?? ""),     // $17
      String(data.note ?? ""),            // $18
      String(data.userId ?? ""),          // $19
      String(data.createdUserId ?? ""),   // $20
      String(data.createdUserDate ?? ""), // $21

      Boolean(data.update20201206),       // $22

      "cur_receiptpage"                   // $23
    ];


    await client.query(
      query,
      values
    );

    return;
  }


  throw new Error(
    `Unsupported receipt procedure mode: ${data.mode}`
  );
}


/* =========================================================
   INCREMENT DOCUMENT NUMBER
========================================================= */

async function incrementDocumentNumber(
  client,
  {
    coid,
    year,
    branch,
    docType,
  }
) {

  console.log(
    "Incrementing document number:",
    {
      coid,
      year,
      branch,
      docType,
    }
  );


  /*
   * TEMPORARY
   *
   * This only calls getnextdocno().
   *
   * The exact old VB IncrementDocNo()
   * implementation has not been provided here.
   */

  await client.query(
    `
    SELECT *
    FROM dbo.getnextdocno(
      $1,
      $2,
      $3,
      $4,
      $5
    )
    `,
    [
      String(coid),
      Number(year),
      String(branch),
      String(docType),
      "dbo.tblfintrans"
    ]
  );
}
