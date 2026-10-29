-- PROCEDURE: dbo.sp_getpendingmatchdocs(character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_getpendingmatchdocs(character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_getpendingmatchdocs(
	IN p_strmode character varying,
	IN p_strcoid character varying,
	IN p_stryear character varying DEFAULT '0'::character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	IN p_strcsaccountid character varying DEFAULT NULL::character varying,
	IN p_intmaccountslno smallint DEFAULT 0,
	IN p_intmaccountslnosub smallint DEFAULT 0,
	IN p_strumdkey character varying DEFAULT NULL::character varying,
	INOUT p_result_cursor refcursor DEFAULT 'cur_getpendingmatchdocs'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_numparentdocamt    numeric(18,2) := 0;
    v_nummatcheddocamt   numeric(18,2) := 0;
    v_blnmatch           boolean := false;
    v_nummatchamt        numeric(18,2) := 0;
    v_nummatchamt_fc     numeric(18,4) := 0;
BEGIN

    ----------------------------------------------------------------------
    -- TEMP TABLE: tblMatchT
    ----------------------------------------------------------------------
    CREATE TEMP TABLE tmp_tblmatcht
    (
        fcoid          varchar(3),
        fyear          varchar(4),
        fbrid          varchar(3),
        fdoctype       varchar(5),
        fdoctypeno     varchar(20),
        fdocno         varchar(15),
        fintdocno      bigint,
        fdate          timestamp,
        faccountid     varchar(12),
        fcsaccountid   varchar(12),
        fdescription   varchar(250),
        fsupplierref   varchar(30),
        fslno          smallint,
        fslnosub       smallint,
        fdocamt        numeric(18,2) DEFAULT 0,
        fdebit         numeric(18,2) DEFAULT 0,
        fcredit        numeric(18,2) DEFAULT 0,
        fdebit_fc      numeric(18,4) DEFAULT 0,
        fcredit_fc     numeric(18,4) DEFAULT 0,
        fcurrency      varchar(3),
        fcurrencyrate  numeric(18,4) DEFAULT 0,
        fdrcr          numeric(18,2) DEFAULT 0
    )
    ON COMMIT DROP;

    ----------------------------------------------------------------------
    -- TEMP TABLE: tblMatch
    ----------------------------------------------------------------------
    CREATE TEMP TABLE tmp_tblmatch
    (
        fcoid          varchar(3),
        fyear          varchar(4),
        fbrid          varchar(3),
        fdoctype       varchar(5),
        fdoctypeno     varchar(20),
        fdocno         varchar(15),
        fintdocno      bigint,
        fdate          timestamp,
        faccountid     varchar(12),
        fcsaccountid   varchar(12),
        fdescription   varchar(250),
        fsupplierref   varchar(30),
        fslno          smallint,
        fslnosub       smallint,
        fdocamt        numeric(18,2) DEFAULT 0,
        fdebit         numeric(18,2) DEFAULT 0,
        fcredit        numeric(18,4) DEFAULT 0,
        fdebit_fc      numeric(18,4) DEFAULT 0,
        fcredit_fc     numeric(18,2) DEFAULT 0,
        fcurrency      varchar(3),
        fcurrencyrate  numeric(18,4) DEFAULT 0,
        fdrcr          numeric(18,2) DEFAULT 0
    )
    ON COMMIT DROP;

    ----------------------------------------------------------------------
    -- MODE: GNM
    -- GET ALL PENDING DOCUMENTS FOR MATCHING AGAINST AN ACCOUNT
    ----------------------------------------------------------------------
    IF p_strmode = 'GNM' THEN

        ------------------------------------------------------------------
        -- INSERT ALL PENDING DOCUMENTS FROM tblARAP
        -- (tblarap.fyear is varchar -> cast to smallint)
        ------------------------------------------------------------------
        INSERT INTO tmp_tblmatcht
        (
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            fdoctypeno,
            fdate,
            faccountid,
            fcsaccountid,
            fdescription,
            fslno,
            fslnosub,
            fdocamt,
            fdebit,
            fcredit
        )
        SELECT
            a.fcoid,
            a.fyear,
            a.fbrid,
            a.fdoctype,
            a.fdocno,
            a.fdoctypeno,
            a.fdate,
            a.faccountid,
            a.fcsaccountid,
            a.fdescription,
            a.fslno,
            a.fslnosub,
            COALESCE(a.fdocamt, 0),
            COALESCE(a.fdebit, 0),
            COALESCE(a.fcredit, 0)
        FROM dbo.tblarap a
        WHERE a.fcoid = p_strcoid
          AND a.fcsaccountid = p_strcsaccountid
          AND a.fpost = TRUE
          AND COALESCE(a.fclosed, FALSE) = FALSE
          AND (
                COALESCE(a.fyear::text, '0') ||
                COALESCE(a.fbrid, '') ||
                COALESCE(a.fdoctype, '') ||
                COALESCE(a.fdocno, '')
              ) <> COALESCE(p_strumdkey, '')
        ORDER BY
            a.fcsaccountid,
            a.fdate;

        ------------------------------------------------------------------
        -- INSERT MATCHED RECORDS FROM tblMatchRecords
        -- (fcyear and fcslno are smallint here)
        ------------------------------------------------------------------
        INSERT INTO tmp_tblmatcht
        (
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            faccountid,
            fcsaccountid,
            fslno,
            fdebit,
            fcredit
        )
        SELECT
            a.fcoid,
            a.fcyear,
            a.fcbrid,
            a.fcdoctype,
            a.fcdocno,
            a.faccountid,
            a.fcsaccountid,
            a.fcslno,
            COALESCE(a.fdebit, 0),
            COALESCE(a.fcredit, 0)
        FROM dbo.tblmatchrecords a
        WHERE a.fcoid = p_strcoid
          AND a.fcsaccountid = p_strcsaccountid
          AND (
                COALESCE(a.fcoid, '') ||
                COALESCE(a.fcyear::text, '0') ||
                COALESCE(a.fcbrid, '') ||
                COALESCE(a.fcdoctype, '') ||
                COALESCE(a.fcdocno, '') ||
                COALESCE(a.faccountid, '') ||
                COALESCE(a.fcsaccountid, '') ||
                COALESCE(a.fcslno::text, '0')
              )
              IN
              (
                  SELECT
                      COALESCE(b.fcoid, '') ||
                      COALESCE(b.fyear::text, '0') ||
                      COALESCE(b.fbrid, '') ||
                      COALESCE(b.fdoctype, '') ||
                      COALESCE(b.fdocno, '') ||
                      COALESCE(b.faccountid, '') ||
                      COALESCE(b.fcsaccountid, '') ||
                      COALESCE(b.fslno::text, '0')
                  FROM tmp_tblmatcht b
              );

        ------------------------------------------------------------------
        -- GROUP & APPEND
        -- fdoctypeno is NOT in the GROUP BY (it is NULL on the
        -- tblmatchrecords rows and would split a document from its matches)
        ------------------------------------------------------------------
        INSERT INTO tmp_tblmatch
        (
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            fdoctypeno,
            fintdocno,
            fdate,
            faccountid,
            fcsaccountid,
            fdescription,
            fsupplierref,
            fslno,
            fslnosub,
            fdocamt,
            fdebit,
            fcredit,
            fdrcr
        )
        SELECT
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            MAX(fdoctypeno),
            MAX(fintdocno),
            MAX(fdate),
            faccountid,
            fcsaccountid,
            MAX(fdescription),
            MAX(fsupplierref),
            fslno,
            MAX(fslnosub),
            SUM(COALESCE(fdocamt, 0)),
            SUM(COALESCE(fdebit, 0)),
            SUM(COALESCE(fcredit, 0)),
            SUM(
                COALESCE(fdebit, 0) -
                COALESCE(fcredit, 0)
            )
        FROM tmp_tblmatcht
        GROUP BY
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            faccountid,
            fcsaccountid,
            fslno;

        ------------------------------------------------------------------
        -- REMOVE MATCHING CLOSED DOCUMENTS
        ------------------------------------------------------------------
        DELETE FROM tmp_tblmatch
        WHERE fdrcr = 0;

        ------------------------------------------------------------------
        -- NORMALIZE DEBIT / CREDIT
        ------------------------------------------------------------------
        UPDATE tmp_tblmatch
        SET
            fdebit =
                CASE
                    WHEN fdrcr >= 0 THEN ABS(fdrcr)
                    ELSE 0
                END,
            fcredit =
                CASE
                    WHEN fdrcr < 0 THEN ABS(fdrcr)
                    ELSE 0
                END;

        ------------------------------------------------------------------
        -- RETURN RESULT
        ------------------------------------------------------------------
        OPEN p_result_cursor FOR
        SELECT
            p_intmaccountslno AS fmaccountslno,
            p_intmaccountslnosub AS fmaccountslnosub,
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            fdoctypeno,
            fintdocno,
            fdate,
            faccountid,
            fcsaccountid,
            fdescription,
            fsupplierref,
            fslno,
            fslnosub,
            fdocamt,
            fdebit,
            fcredit,
            fdrcr,
            v_nummatchamt AS fmatchamt,
            v_nummatchamt_fc AS fmatchamt_fc,
            v_blnmatch AS fmatch
        FROM tmp_tblmatch
        ORDER BY
            faccountid,
            fdate;

        RETURN;

    END IF;

END;
$BODY$;
ALTER PROCEDURE dbo.sp_getpendingmatchdocs(character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, refcursor)
    OWNER TO postgres;

