-- PROCEDURE: dbo.sp_pagematchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, bigint, character varying, smallint, smallint, character varying)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagematchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, bigint, character varying, smallint, smallint, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_pagematchaccounts(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_pstryear character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	IN p_intdocno bigint DEFAULT 0,
	IN p_dtpdate character varying DEFAULT NULL::character varying,
	IN p_intslno smallint DEFAULT 0,
	IN p_intslnosub smallint DEFAULT 0,
	IN p_pstruserid character varying DEFAULT NULL::character varying)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_blnselectmatch BOOLEAN := FALSE;
    v_nummatchamt    NUMERIC(18,2) := 0;
    v_numpendingamt  NUMERIC(18,2) := 0;
    v_strpc          VARCHAR(1) := 'P';
    v_strstatus      VARCHAR(1) := 'M';
BEGIN

    ------------------------------------------------------------
    -- Get transaction lines
    ------------------------------------------------------------
    IF p_strmode = 'GetTL' THEN

        SELECT
            a.fslno,
            a.fslnosub,
            a.faccountid,
            a.fccid,
            a.fdescription,
            a.fdebit,
            a.fcredit,
            v_nummatchamt AS fmatchdocamt,
            v_blnselectmatch AS fmatch,
            0 AS fview,
            a.fdate
        FROM dbo.tblarap AS a
        WHERE a.fcoid = p_pstrcoid
          AND a.fyear = p_pstryear
          AND a.fbrid = p_strbrid
          AND a.fdoctype = p_strdoctype
          AND a.fdocno = p_strdocno
          AND COALESCE(a.fmatch, 0) = 0
        ORDER BY a.fslno;

    ------------------------------------------------------------
    -- Update parent document matching details
    ------------------------------------------------------------
    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tblarap
        SET
            fmatch = true,
            fmatchapplydate = CURRENT_TIMESTAMP,
            fclosed = true,
            fmatchuserid = p_pstruserid,
            fmatchuserdate = CURRENT_TIMESTAMP
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND fslno = p_intslno
          AND fslnosub = p_intslnosub;

        UPDATE dbo.tblfintrans
        SET
            fmatch = true,
            fmuserid = p_pstruserid,
            fmuserdate = CURRENT_TIMESTAMP
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND fslno = p_intslno;

        -- Keep parent document posted after matching.
        UPDATE dbo.tblarap
        SET fpost = true
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno;

        UPDATE dbo.tblfintrans
        SET fpost = true
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno;

    ELSE
        RAISE EXCEPTION
            'Invalid mode: %. Expected GetTL or M.',
            p_strmode;
    END IF;

END;
$BODY$;
ALTER PROCEDURE dbo.sp_pagematchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, bigint, character varying, smallint, smallint, character varying)
    OWNER TO postgres;

