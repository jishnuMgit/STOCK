CREATE OR REPLACE PROCEDURE dbo."SP_frmMatchRecords"
(
    IN "strMode" VARCHAR(5),
    IN "gstrCoID" VARCHAR(3),
    IN "strBrID" VARCHAR(3) DEFAULT NULL,
    IN "strAccountID" VARCHAR(12) DEFAULT NULL,
    IN "intYear" SMALLINT DEFAULT 0,
    IN "strDocType" VARCHAR(5) DEFAULT NULL,
    IN "strDocNo" VARCHAR(15) DEFAULT NULL,
    IN "intSlNo" SMALLINT DEFAULT 0,
    IN "intMAccountSlNo" SMALLINT DEFAULT 0,
    IN "intMAccountSlNoSub" SMALLINT DEFAULT 0,
    IN "intSlNoSub" SMALLINT DEFAULT 0,
    IN "IntDocNo" BIGINT DEFAULT 0,
    IN "dtpDate" VARCHAR(10) DEFAULT NULL,
    IN "strDescription" VARCHAR(100) DEFAULT NULL,
    IN "strCurrency" VARCHAR(3) DEFAULT NULL,
    IN "numCurrencyRate" NUMERIC(18,4) DEFAULT 0,
    IN "numDocAmt" NUMERIC(18,2) DEFAULT 0,
    IN "numDebit" NUMERIC(18,2) DEFAULT 0,
    IN "numCredit" NUMERIC(18,2) DEFAULT 0,
    IN "numDebit_FC" NUMERIC(18,4) DEFAULT 0,
    IN "numCredit_FC" NUMERIC(18,4) DEFAULT 0,
    IN "strStatus" VARCHAR(1) DEFAULT NULL,
    IN "dtpEFDate" VARCHAR(10) DEFAULT NULL,
    IN "blnPost" BOOLEAN DEFAULT TRUE,
    IN "blnMatch" BOOLEAN DEFAULT TRUE,
    IN "numMatchAmt" NUMERIC(18,2) DEFAULT 0,
    IN "numMatchAmt_FC" NUMERIC(18,4) DEFAULT 0,
    IN "intMYear" SMALLINT DEFAULT 0,
    IN "strMBrID" VARCHAR(3) DEFAULT NULL,
    IN "strMDocType" VARCHAR(5) DEFAULT NULL,
    IN "strMDocNo" VARCHAR(15) DEFAULT NULL,
    IN "intMDocNo" INTEGER DEFAULT 0,
    IN "intMSlNo" SMALLINT DEFAULT 0,
    IN "intMSlNoSub" SMALLINT DEFAULT 0,
    IN "strUMDKey" VARCHAR(30) DEFAULT NULL,
    IN "gstrUserID" VARCHAR(20) DEFAULT NULL,
    INOUT "result_cursor" REFCURSOR DEFAULT 'match_records_cursor'
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    numMatchAmtDr NUMERIC(10,2) := 0;
    numMatchAmtCr NUMERIC(10,2) := 0;

    numMatchAmtDr_FC NUMERIC(10,4) := 0;
    numMatchAmtCr_FC NUMERIC(10,4) := 0;

    blnMatch BOOLEAN := FALSE;
    blnDebit BOOLEAN := FALSE;
    numMatchAmt NUMERIC(18,2) := 0;
BEGIN

    IF "strMode" = 'GNM' THEN

        CALL dbo."SP_GetPendingMatchDocs"(
            "strMode",
            "gstrCoID",
            "intYear",
            "strBrID",
            "strDocType",
            "strDocNo",
            "strAccountID",
            "intMAccountSlNo",
            "intMAccountSlNoSub",
            "strUMDKey"
        );

    ELSIF "strMode" = 'GM' THEN

        CREATE TEMP TABLE IF NOT EXISTS tblMatch
        (
            "fCoID" VARCHAR(3),
            "fYear" SMALLINT,
            "fBrID" VARCHAR(3),
            "fDocType" VARCHAR(5),
            "fDocNo" VARCHAR(15),
            "fDate" TIMESTAMP,
            "fAccountID" VARCHAR(12),
            "fDescription" VARCHAR(250),
            "fSupplierRef" VARCHAR(30),
            "fSlNo" SMALLINT,
            "fDocAmt" NUMERIC(18,2) DEFAULT 0,
            "fDebit" NUMERIC(18,2) DEFAULT 0,
            "fCredit" NUMERIC(18,2) DEFAULT 0,
            "fDrCr" NUMERIC(18,2) DEFAULT 0,
            "fEFDate" TIMESTAMP,
            "fPC" VARCHAR(1)
        ) ON COMMIT DROP;

        TRUNCATE TABLE pg_temp.tblMatch;

        INSERT INTO pg_temp.tblMatch
        (
            "fCoID",
            "fYear",
            "fBrID",
            "fDocType",
            "fDocNo",
            "fDate",
            "fEFDate",
            "fAccountID",
            "fDescription",
            "fSupplierRef",
            "fSlNo",
            "fDocAmt",
            "fDebit",
            "fCredit",
            "fPC"
        )
        SELECT
            a."fCoID",
            a."fMYear",
            a."fMBrID",
            a."fMDocType",
            a."fMDocNo",
            a."fDate",
            a."fEfDate",
            a."fAccountID",
            b."fDescription",
            b."fSupplierRef",
            a."fSlNo",
            COALESCE(b."fDocAmt", 0),
            COALESCE(a."fCredit", 0),
            COALESCE(a."fDebit", 0),
            'C'
        FROM dbo."tblMatchRecords" AS a
        LEFT JOIN dbo."tblARAP" AS b
            ON a."fCoID" = b."fCoID"
           AND a."fMYear" = b."fYear"
           AND a."fMBrID" = b."fBrID"
           AND a."fMDocType" = b."fDocType"
           AND a."fMDocNo" = b."fDocNo"
           AND a."fMSlNo" = b."fSlNo"
        WHERE a."fCoID" = "gstrCoID"
          AND a."fYear" = "intYear"
          AND a."fBrID" = "strBrID"
          AND a."fDocType" = "strDocType"
          AND a."fDocNo" = "strDocNo"
          AND a."fSlNo" = "intMAccountSlNo";

        OPEN "result_cursor" FOR
        SELECT
            "intMAccountSlNo" AS "fMAccountSlNo",
            "intMAccountSlNoSub" AS "fMAccountSlNoSub",
            m."fYear",
            m."fBrID",
            m."fDocType",
            m."fDocNo",
            m."fSlNo",
            m."fAccountID",
            m."fDate",
            m."fEFDate",
            m."fDescription",
            m."fSupplierRef",
            m."fDocAmt",
            m."fDebit",
            m."fCredit",
            COALESCE(m."fDebit", 0) - COALESCE(m."fCredit", 0)
                AS "fMatchAmt",
            dbo."ConvertMStatus2Boolean"('M') AS "fMatch"
        FROM pg_temp.tblMatch AS m
        ORDER BY m."fAccountID", m."fDate";

    ELSIF "strMode" = 'S' THEN

        numMatchAmt := ABS("numMatchAmt");
        "numMatchAmt_FC" := ABS("numMatchAmt_FC");

        IF COALESCE("numDebit", 0) > 0 THEN
            blnDebit := TRUE;
        ELSE
            blnDebit := FALSE;
        END IF;

        -- Debit document: matching amount goes to credit.
        IF blnDebit AND numMatchAmt > 0 THEN
            numMatchAmtCr := numMatchAmt;
            numMatchAmtCr_FC := "numMatchAmt_FC";
        END IF;

        -- Credit document: matching amount goes to debit.
        IF NOT blnDebit AND numMatchAmt > 0 THEN
            numMatchAmtDr := numMatchAmt;
            numMatchAmtDr_FC := "numMatchAmt_FC";
        END IF;

        INSERT INTO dbo."tblMatchRecords"
        (
            "fCoID",
            "fYear",
            "fBrID",
            "fDocType",
            "fDocNo",
            "fSlNo",
            "fSlNoSub",
            "fIntDocNo",
            "fDate",
            "fEfDate",
            "fAccountID",
            "fDescription",
            "fCurrency",
            "fCurrencyRate",
            "fDebit",
            "fCredit",
            "fDebit_FC",
            "fCredit_FC",
            "fMYear",
            "fMBrID",
            "fMDocType",
            "fMDocNo",
            "fMSlNo",
            "fMatchUserID",
            "fMatchUserDate",
            "fPost"
        )
        VALUES
        (
            "gstrCoID",
            "intMYear",
            "strMBrID",
            "strMDocType",
            "strMDocNo",
            "intMSlNo",
            "intMSlNoSub",
            "intMDocNo",
            TO_DATE("dtpDate", 'DD/MM/YYYY'),
            TO_DATE("dtpEFDate", 'DD/MM/YYYY'),
            "strAccountID",
            "strDescription",
            "strCurrency",
            "numCurrencyRate",
            numMatchAmtDr,
            numMatchAmtCr,
            numMatchAmtDr_FC,
            numMatchAmtCr_FC,
            "intYear",
            "strBrID",
            "strDocType",
            "strDocNo",
            "intSlNo",
            "gstrUserID",
            CURRENT_TIMESTAMP,
            1
        );

        -- Update parent document account details.
        UPDATE dbo."tblARAP"
        SET
            "fMatch" = 1,
            "fClosed" = 1,
            "fEfDate" = TO_DATE("dtpEFDate", 'DD/MM/YYYY'),
            "fMatchUserID" = "gstrUserID",
            "fMatchUserDate" = CURRENT_TIMESTAMP
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "intMYear"
          AND "fBrID" = "strMBrID"
          AND "fDocType" = "strMDocType"
          AND "fDocNo" = "strMDocNo"
          AND "fSlNo" = "intMSlNo"
          AND "fSlNoSub" = "intMSlNoSub";

        UPDATE dbo."tblFinTrans"
        SET "fMatch" = 1
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "intMYear"
          AND "fBrID" = "strMBrID"
          AND "fDocType" = "strMDocType"
          AND "fDocNo" = "strMDocNo"
          AND "fSlNo" = "intMSlNo";

        -- Keep parent document posted after matching.
        UPDATE dbo."tblARAP"
        SET "fPost" = 1
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "intMYear"
          AND "fBrID" = "strMBrID"
          AND "fDocType" = "strMDocType"
          AND "fDocNo" = "strMDocNo";

        UPDATE dbo."tblFinTrans"
        SET "fPost" = 1
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "intMYear"
          AND "fBrID" = "strMBrID"
          AND "fDocType" = "strMDocType"
          AND "fDocNo" = "strMDocNo";

    ELSIF "strMode" = 'D' THEN

        DELETE FROM dbo."tblMatchRecords"
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "intYear"
          AND "fBrID" = "strBrID"
          AND "fDocType" = "strDocType"
          AND "fDocNo" = "strDocNo"
          AND "fSlNo" = "intSlNo"
          AND "fSlNoSub" = "intSlNoSub";

    END IF;

END;
$procedure$;