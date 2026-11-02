-- PROCEDURE: dbo.sp_getmatchfindocuments(character varying, character varying, character varying, character varying, character varying, character varying, bigint, character varying, smallint, smallint, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_getmatchfindocuments(character varying, character varying, character varying, character varying, character varying, character varying, bigint, character varying, smallint, smallint, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_getmatchfindocuments(
	IN p_strmode character varying,
	IN p_strcoid character varying,
	IN p_stryear character varying DEFAULT '0'::character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
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

    /* ---------- GETTL : NON-MATCHED documents (Match screen) ---------- */
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
            a.fcredit,
            v_nummatchamt AS fmatchdocamt,
            v_blnselectmatch AS fmatch,
            0 AS fview

        FROM dbo.tblarap a

        LEFT JOIN dbo.tbldocument b
            ON a.fcoid = b.fcoid
           AND a.fdoctype = b.fdoctype

        WHERE a.fcoid = p_strcoid
          AND a.fdoctype = p_strdoctype
          AND a.fcsaccountid = p_strcsaccountid
          AND a.fpost = TRUE
          AND a.fmatch = FALSE
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
          AND a.fdoctype = p_strdoctype
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
ALTER PROCEDURE dbo.sp_getmatchfindocuments(character varying, character varying, character varying, character varying, character varying, character varying, bigint, character varying, smallint, smallint, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

