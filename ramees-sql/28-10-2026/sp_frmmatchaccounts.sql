CREATE OR REPLACE PROCEDURE dbo."SP_frmMatchAccounts"
(
    IN "strMode"       VARCHAR(5),
    IN "gstrCoID"      VARCHAR(3),
    IN "gintYear"      SMALLINT DEFAULT 0,
    IN "strBrID"       VARCHAR(3) DEFAULT NULL,
    IN "strDocType"    VARCHAR(5) DEFAULT NULL,
    IN "strDocNo"      VARCHAR(15) DEFAULT NULL,
    IN "intDocNo"      BIGINT DEFAULT 0,
    IN "dtpDate"       VARCHAR(10) DEFAULT NULL,
    IN "intSlNo"       SMALLINT DEFAULT 0,
    IN "intSlNoSub"    SMALLINT DEFAULT 0,
    IN "gstrUserID"    VARCHAR(20) DEFAULT NULL
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    blnSelectMatch BOOLEAN;
    numMatchAmt    NUMERIC(18,2);
    numPendingAmt  NUMERIC(18,2);
    strPC          VARCHAR(1);
    strStatus      VARCHAR(1);
BEGIN

    numMatchAmt := 0;
    strPC := 'P';
    strStatus := 'M';

    blnSelectMatch := FALSE;

    IF "strMode" = 'GetTL' THEN

        SELECT
            a."fSlNo",
            a."fSlNoSub",
            a."fAccountID",
            a."fCCID",
            a."fDescription",
            a."fDebit",
            a."fCredit",
            numMatchAmt AS "fMatchDocAmt",
            blnSelectMatch AS "fMatch",
            0 AS "fView",
            a."fDate"
        FROM dbo."tblARAP" AS a
        WHERE a."fCoID" = "gstrCoID"
          AND a."fYear" = "gintYear"
          AND a."fBrID" = "strBrID"
          AND a."fDocType" = "strDocType"
          AND a."fDocNo" = "strDocNo"
          AND COALESCE(a."fMatch", 0) = 0
        ORDER BY a."fSlNo";

    END IF;

    IF "strMode" = 'M' THEN

        -- UPDATE PARENT DOC DETAILS ONLY
        UPDATE dbo."tblARAP"
        SET
            "fMatch" = 1,
            "fEfDate" = CURRENT_TIMESTAMP,
            "fClosed" = 1,
            "fMatchUserID" = "gstrUserID",
            "fMatchUserDate" = CURRENT_TIMESTAMP
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "gintYear"
          AND "fBrID" = "strBrID"
          AND "fDocType" = "strDocType"
          AND "fDocNo" = "strDocNo"
          AND "fSlNo" = "intSlNo"
          AND "fSlNoSub" = "intSlNoSub";

        UPDATE dbo."tblFinTrans"
        SET
            "fMatch" = 1,
            "fMUserID" = "gstrUserID",
            "fMUserDate" = CURRENT_TIMESTAMP
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "gintYear"
          AND "fBrID" = "strBrID"
          AND "fDocType" = "strDocType"
          AND "fDocNo" = "strDocNo"
          AND "fSlNo" = "intSlNo";

        -- KEEP PARENT DOCUMENT AS POSTED WHEN MATCHING IS DONE
        UPDATE dbo."tblARAP"
        SET "fPost" = 1
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "gintYear"
          AND "fBrID" = "strBrID"
          AND "fDocType" = "strDocType"
          AND "fDocNo" = "strDocNo";

        UPDATE dbo."tblFinTrans"
        SET "fPost" = 1
        WHERE "fCoID" = "gstrCoID"
          AND "fYear" = "gintYear"
          AND "fBrID" = "strBrID"
          AND "fDocType" = "strDocType"
          AND "fDocNo" = "strDocNo";

    END IF;

END;
$procedure$;