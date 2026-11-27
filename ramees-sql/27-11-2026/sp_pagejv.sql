-- Drop the old procedure
DROP PROCEDURE IF EXISTS dbo.sp_frmjv(character varying, character varying, smallint, character varying, character varying, character varying, smallint, integer, character varying, character varying, character varying, character varying, character varying, numeric, numeric, character varying, character varying, character varying);

-- PROCEDURE: dbo.sp_pagejv(...)

CREATE OR REPLACE PROCEDURE dbo.sp_pagejv(
	IN p_strmode character varying,
	IN p_gstrcoid character varying,
	IN p_gintyear smallint,
	IN p_strbrid character varying,
	IN p_strdoctype character varying,
	IN p_strdocno character varying,
	IN p_intslno smallint DEFAULT 0,
	IN p_intdocno integer DEFAULT 0,
	IN p_dtpdate character varying DEFAULT NULL::character varying,
	IN p_strnote character varying DEFAULT NULL::character varying,
	IN p_straccountid character varying DEFAULT NULL::character varying,
	IN p_strccid character varying DEFAULT NULL::character varying,
	IN p_strdescription character varying DEFAULT NULL::character varying,
	IN p_numdebit numeric DEFAULT 0,
	IN p_numcredit numeric DEFAULT 0,
	IN p_gstruserid character varying DEFAULT NULL::character varying,
	IN p_strcreateduserid character varying DEFAULT NULL::character varying,
	IN p_dtpcreateduserdate character varying DEFAULT NULL::character varying)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_cuserid   VARCHAR(20);
    v_cuserdate TIMESTAMP;
    v_muserid   VARCHAR(20);
    v_muserdate TIMESTAMP;
    v_date      DATE;
    v_year      VARCHAR(10) := p_gintyear::varchar;
BEGIN

    IF p_strmode NOT IN ('S', 'D') THEN
        RAISE EXCEPTION 'sp_pagejv: invalid mode %', p_strmode;
    END IF;

    /* DELETE (also the first step of a modify) */
    IF p_strmode = 'D' THEN

        DELETE FROM dbo.tblfintrans
        WHERE fcoid = p_gstrcoid
          AND fyear = v_year
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno;

        DELETE FROM dbo.tblarap
        WHERE fcoid = p_gstrcoid
          AND fyear = v_year
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno;

        RETURN;
    END IF;

    /* SAVE (one line per call) */
    IF dbo.isnullorempty(p_straccountid)::int = 1 THEN
        RAISE EXCEPTION 'sp_pagejv: account id is required';
    END IF;

    IF NULLIF(TRIM(p_dtpdate), '') IS NULL THEN
        RAISE EXCEPTION 'sp_pagejv: date is required';
    END IF;

    v_date := TO_DATE(TRIM(p_dtpdate), 'DD/MM/YYYY');

    /* Audit: new document -> created only;
       modified -> keep original creator + stamp modifier */
    IF dbo.isnullorempty(p_strcreateduserid)::int = 1 THEN
        v_cuserid   := p_gstruserid;
        v_cuserdate := NOW();
        v_muserid   := NULL;
        v_muserdate := NULL;
    ELSE
        v_cuserid   := p_strcreateduserid;
        v_cuserdate := COALESCE(NULLIF(TRIM(p_dtpcreateduserdate), '')::TIMESTAMP, NOW());
        v_muserid   := p_gstruserid;
        v_muserdate := NOW();
    END IF;

    INSERT INTO dbo.tblfintrans
    (
        fcoid, fyear, fbrid, fdoctype, fdocno, fslno,
        fdoctypeno,
        fdate, fnote, faccountid, fccid, fdescription,
        fdebit, fcredit, forigin, fpost, fyearclose,
        fcuserid, fcuserdate, fmuserid, fmuserdate
    )
    VALUES
    (
        p_gstrcoid, v_year, p_strbrid, p_strdoctype, p_strdocno, p_intslno,
        p_intdocno::varchar,
        v_date, p_strnote, p_straccountid, p_strccid, COALESCE(p_strdescription, ''),
        COALESCE(p_numdebit, 0), COALESCE(p_numcredit, 0), 'UI', false, false,
        v_cuserid, v_cuserdate, v_muserid, v_muserdate
    );

    IF dbo.isarap(p_gstrcoid, p_straccountid)::int = 1 THEN

        INSERT INTO dbo.tblarap
        (
            fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fslnosub,
            fdoctypeno,
            fdate, faccountid, fccid, fdescription,
            fdocamt, fdebit, fcredit, fstatus, fpost,
            fuserid, fuserdate,
            fcuserid, fcuserdate, fmuserid, fmuserdate
        )
        VALUES
        (
            p_gstrcoid, v_year, p_strbrid, p_strdoctype, p_strdocno, p_intslno, 0,
            p_intdocno::varchar,
            v_date, p_straccountid, p_strccid, COALESCE(p_strdescription, ''),
            (COALESCE(p_numdebit, 0) - COALESCE(p_numcredit, 0)),
            COALESCE(p_numdebit, 0), COALESCE(p_numcredit, 0), 'N', false,
            p_gstruserid, NOW(),
            v_cuserid, v_cuserdate, v_muserid, v_muserdate
        );

    END IF;

END;
$BODY$;

ALTER PROCEDURE dbo.sp_pagejv(character varying, character varying, smallint, character varying, character varying, character varying, smallint, integer, character varying, character varying, character varying, character varying, character varying, numeric, numeric, character varying, character varying, character varying)
    OWNER TO postgres;