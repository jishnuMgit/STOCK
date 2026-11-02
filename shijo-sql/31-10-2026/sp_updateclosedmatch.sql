-- PROCEDURE: dbo.sp_updatematchcloseddocs(character varying, character varying, character varying, character varying, character varying, character varying, smallint, character varying, character varying)

-- DROP PROCEDURE IF EXISTS dbo.sp_updatematchcloseddocs(character varying, character varying, character varying, character varying, character varying, character varying, smallint, character varying, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_updatematchcloseddocs(
	IN p_pstrcoid character varying,
	IN p_pstryear character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	IN p_strcsaccountid character varying DEFAULT NULL::character varying,
	IN p_intslno smallint DEFAULT 0,
	IN p_dtpmatchapplydate character varying DEFAULT NULL::character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_numpendingdocamt numeric(18,2) := 0;
    v_numdebit numeric(18,2) := 0;
BEGIN
    DROP TABLE IF EXISTS pg_temp.tblmatcht;
    DROP TABLE IF EXISTS pg_temp.tblmatch;

    CREATE TEMP TABLE tblmatcht (
        fcoid varchar(3),
        fyear varchar(4),
        fbrid varchar(3),
        fdoctype varchar(5),
        fdocno varchar(15),      
        fdate timestamp,
        fcsaccountid varchar(12),
        fdescription varchar(250),
        fslno smallint,
        fslnosub smallint,
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fdrcr numeric(18,2) DEFAULT 0
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tblmatch (
        fcoid varchar(3),
        fyear varchar(4),
        fbrid varchar(3),
        fdoctype varchar(5),
        fdocno varchar(15),      
        fdate timestamp,
        fcsaccountid varchar(12),
        fdescription varchar(250),
        fslno smallint,
        fslnosub smallint,
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fdrcr numeric(18,2) DEFAULT 0
    ) ON COMMIT DROP;

    -------------------------------------------------------------------
    -- Get the selected AR/AP document
    -------------------------------------------------------------------

    INSERT INTO tblmatcht (
        fcoid, fyear, fbrid, fdoctype, fdocno,
         fdate, fcsaccountid, fdescription,
        fslno, fslnosub, fdebit, fcredit
    )
    SELECT
        a.fcoid,
        a.fyear::varchar(4),
        a.fbrid,
        a.fdoctype,
        a.fdocno,       
        a.fdate,
        a.fcsaccountid,
        a.fdescription,
        a.fslno,
        a.fslnosub,
        coalesce(a.fdebit, 0),
        coalesce(a.fcredit, 0)
    FROM dbo.tblarap a
    WHERE a.fcoid = p_pstrcoid
      AND a.fyear::varchar(4) = p_pstryear
      AND a.fbrid = p_strbrid
      AND a.fdoctype = p_strdoctype
      AND a.fdocno = p_strdocno
      AND a.fcsaccountid = p_strcsaccountid
      AND a.fslno = p_intslno;

    SELECT coalesce(max(fdebit), 0)
    INTO v_numdebit
    FROM tblmatcht;

    -------------------------------------------------------------------
    -- Add all matching records for the selected document/account
    -------------------------------------------------------------------

    INSERT INTO tblmatcht (
        fcoid, fyear, fbrid, fdoctype, fdocno,
        fcsaccountid, fslno, fdebit, fcredit
    )
    SELECT
        m.fcoid,
        m.fcyear::varchar(4),
        m.fcbrid,
        m.fcdoctype,
        m.fcdocno,
        m.fcsaccountid,
        m.fcslno,
        coalesce(m.fdebit, 0),
        coalesce(m.fcredit, 0)
    FROM dbo.tblmatchrecords m
    WHERE m.fcoid = p_pstrcoid
      AND EXISTS (
          SELECT 1
          FROM tblmatcht t
          WHERE t.fyear = m.fcyear::varchar(4)
            AND t.fbrid = m.fcbrid
            AND t.fdoctype = m.fcdoctype
            AND t.fdocno = m.fcdocno
            AND t.fcsaccountid = m.fcsaccountid
            AND t.fslno = m.fcslno
      );

    -------------------------------------------------------------------
    -- Group records and calculate the pending amount
    -------------------------------------------------------------------

    INSERT INTO tblmatch (
        fcoid, fyear, fbrid, fdoctype, fdocno,
        fdate, fcsaccountid, fdescription,
        fslno, fslnosub, fdebit, fcredit, fdrcr
    )
    SELECT
        fcoid,
        fyear,
        fbrid,
        fdoctype,
        fdocno,       
        max(fdate),
        fcsaccountid,
        max(fdescription),
        fslno,
        max(fslnosub),
        sum(coalesce(fdebit, 0)),
        sum(coalesce(fcredit, 0)),
        sum(coalesce(fdebit, 0) - coalesce(fcredit, 0))
    FROM tblmatcht
    GROUP BY
        fcoid, fyear, fbrid, fdoctype, fdocno,
        fcsaccountid, fslno;

    UPDATE tblmatch
    SET fdebit = CASE
                     WHEN fdrcr >= 0 THEN abs(fdrcr)
                     ELSE 0
                 END,
        fcredit = CASE
                      WHEN fdrcr < 0 THEN abs(fdrcr)
                      ELSE 0
                  END;

    SELECT coalesce(sum(fdrcr), 0)
    INTO v_numpendingdocamt
    FROM tblmatch;

    RAISE NOTICE 'Pending document amount: %', v_numpendingdocamt;

    -------------------------------------------------------------------
    -- Update document matching/closed status
    -------------------------------------------------------------------

    UPDATE dbo.tblarap
    SET fmatch = true,
        fclosed = (v_numpendingdocamt = 0),
        fmatchapplydate = CASE
    WHEN NULLIF(TRIM(p_dtpmatchapplydate), '') IS NULL THEN NULL
    WHEN TRIM(p_dtpmatchapplydate) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
        THEN TO_DATE(TRIM(p_dtpmatchapplydate), 'FXDD/MM/YYYY')
    WHEN TRIM(p_dtpmatchapplydate) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN TO_DATE(TRIM(p_dtpmatchapplydate), 'FXYYYY-MM-DD')
    ELSE NULL
END,
        fmatchuserid = p_pstruserid,
        fmatchuserdate = CURRENT_TIMESTAMP
    WHERE fcoid = p_pstrcoid
      AND fyear::varchar(4) = p_pstryear
      AND fbrid = p_strbrid
      AND fdoctype = p_strdoctype
      AND fdocno = p_strdocno
      AND fcsaccountid = p_strcsaccountid
      AND fslno = p_intslno;

END;
$BODY$;
ALTER PROCEDURE dbo.sp_updatematchcloseddocs(character varying, character varying, character varying, character varying, character varying, character varying, smallint, character varying, character varying)
    OWNER TO postgres;

