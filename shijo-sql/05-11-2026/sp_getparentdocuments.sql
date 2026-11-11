-- PROCEDURE: dbo.sp_getparentdocuments
-- Only mode 'GETTL' is changed (shows receipt balance after matches). Mode 'GM' is unchanged.

CREATE OR REPLACE PROCEDURE dbo.sp_getparentdocuments(
	IN p_strmode character varying,
	IN p_strcoid character varying,
	IN p_stryear character varying DEFAULT '0'::character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	IN p_intdocno bigint DEFAULT 0,
	IN p_dtpdate character varying DEFAULT NULL::character varying,
	IN p_intslno smallint DEFAULT 0,
	IN p_intslnosub smallint DEFAULT 0,
	IN p_struserid character varying DEFAULT NULL::character varying,
	IN p_strcsaccountid character varying DEFAULT NULL::character varying,
	IN p_strdivid character varying DEFAULT NULL::character varying,
	INOUT p_result_cursor refcursor DEFAULT 'cur_matchaccounts'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$

DECLARE

    v_blnselectmatch boolean := false;
    v_nummatchamt numeric(18,2) := 0;

BEGIN

    /* ---------- GETTL : receipts with an open balance (Match screen) ----------
       Balance = receipt credit - matched total (P row in tblmatchrecords).
       e.g. receipt 13000, matched 10000 -> shows 3000.
       Fully matched receipts (balance = 0) are not listed.                     */
    IF UPPER(TRIM(p_strmode)) = 'GETTL' THEN

        OPEN p_result_cursor FOR

        SELECT
            a.fslno,
            a.fslnosub,
            a.fyear,
            a.fbrid,
            a.faccountid,
            a.fcsaccountid,
            a.fdoctype,
            b.fdocname,
            a.fdocno,
            a.fdoctypeno,
            TO_CHAR(a.fdate, 'DD/MM/YYYY') AS fdate,
            a.fccid,
            a.fdescription,
            a.fdebit,
            (a.fcredit - COALESCE(m.fmatchedamt, 0)) AS fcredit,   -- balance
            v_nummatchamt AS fmatchdocamt,
            v_blnselectmatch AS fmatch,
            0 AS fview,
            a.fcredit AS fcreditamt,                               -- original receipt amount
            COALESCE(m.fmatchedamt, 0) AS fmatchedamt              -- already matched

        FROM dbo.tblarap a

        LEFT JOIN dbo.tbldocument b
            ON a.fcoid = b.fcoid
           AND a.fdoctype = b.fdoctype

        LEFT JOIN (
            SELECT fcoid, fyear, fbrid, fdoctype, fdocno, fslno,
                   SUM(COALESCE(fcredit, 0) + COALESCE(fdebit, 0)) AS fmatchedamt
            FROM dbo.tblmatchrecords
            WHERE fpc = 'P'
            GROUP BY fcoid, fyear, fbrid, fdoctype, fdocno, fslno
        ) m
            ON m.fcoid    = a.fcoid
           AND m.fyear    = a.fyear
           AND m.fbrid    = a.fbrid
           AND m.fdoctype = a.fdoctype
           AND m.fdocno   = a.fdocno
           AND m.fslno    = a.fslno

        WHERE a.fcoid = p_strcoid
          AND a.fcsaccountid = p_strcsaccountid
          AND a.fpost = TRUE
          AND a.fcredit > 0
          AND (a.fcredit - COALESCE(m.fmatchedamt, 0)) > 0
          AND (
                p_strdivid IS NULL
                OR TRIM(p_strdivid) = ''
                OR COALESCE(a.fdivid, '') = p_strdivid
              )

        ORDER BY a.fslno;

    /* ---------- GM : MATCHED documents (Match Reversal screen) ---------- */
    ELSIF UPPER(TRIM(p_strmode)) = 'GM' THEN

        OPEN p_result_cursor FOR

        SELECT
            a.fslno,
            a.fslnosub,
            a.fyear,
            a.fbrid,
            a.faccountid,
            a.fcsaccountid,
            a.fdoctype,
            b.fdocname,
            a.fdocno,
            a.fdoctypeno,
            TO_CHAR(a.fdate, 'DD/MM/YYYY') AS fdate,
            a.fccid,
            a.fdescription,
            a.fdebit,
            a.fcredit,
            v_nummatchamt AS fmatchdocamt,
            v_blnselectmatch AS fmatch,
            0 AS fview

        FROM dbo.tblarap a

        LEFT JOIN dbo.tbldocument b
            ON a.fcoid = b.fcoid
           AND a.fdoctype = b.fdoctype

        WHERE a.fcoid = p_strcoid
          AND a.fcsaccountid = p_strcsaccountid
          AND a.fpost = TRUE
          AND a.fmatch = TRUE
          AND (
                p_strdivid IS NULL
                OR TRIM(p_strdivid) = ''
                OR COALESCE(a.fdivid, '') = p_strdivid
              )

        ORDER BY a.fslno;

    END IF;

END;

$BODY$;