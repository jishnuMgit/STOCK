-- PROCEDURE: dbo.sp_rptpayables(character varying, smallint, character varying, smallint, character varying, character varying, character varying, smallint, boolean, boolean, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_rptpayables(character varying, smallint, character varying, smallint, character varying, character varying, character varying, smallint, boolean, boolean, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptpayables(
	IN p_pstrcoid character varying,
	IN p_rdgbranch smallint,
	IN p_strbrid character varying,
	IN p_rdgperiod smallint,
	IN p_strfromdate character varying,
	IN p_strtodate character varying,
	IN p_strasondate character varying,
	IN p_cbopoststatus smallint,
	IN p_blnprint0bal boolean,
	IN p_chkorderbyacname boolean,
	INOUT p_result refcursor DEFAULT 'rptpayables_cursor'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_year varchar(4);
    v_fromdate date;
    v_todate date;
    v_asondate date;
BEGIN
    v_fromdate := to_date(p_strfromdate, 'DD/MM/YYYY');
    v_todate   := to_date(p_strtodate,   'DD/MM/YYYY');
    v_asondate := to_date(p_strasondate, 'DD/MM/YYYY');

    v_year := to_char(v_fromdate, 'YYYY');

    DROP TABLE IF EXISTS tmp_tblpayables;
    DROP TABLE IF EXISTS tmp_tblpayablessum;

    CREATE TEMP TABLE tmp_tblpayables
    (
        fcoid varchar(3),
        fcsaccountid varchar(12),
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fopbal numeric(18,2) DEFAULT 0,
        fbalance numeric(18,2) DEFAULT 0,
        fdrcr numeric(18,2) DEFAULT 0,
        fcu_drcr numeric(18,2) DEFAULT 0
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_tblpayablessum
    (
        fcoid varchar(3),
        fcsaccountid varchar(12),
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fopbal numeric(18,2) DEFAULT 0,
        fbalance numeric(18,2) DEFAULT 0,
        fcu_drcr numeric(18,2) DEFAULT 0
    ) ON COMMIT DROP;

    ----------------------------------------------------------------
    -- MODE 0 : PAYABLES AS ON DATE
    ----------------------------------------------------------------
    IF p_rdgperiod = 0 THEN

        INSERT INTO tmp_tblpayables (fcoid, fcsaccountid, fdrcr)
        SELECT f.fcoid, f.fcsaccountid,
               SUM(COALESCE(f.fdebit, 0) - COALESCE(f.fcredit, 0))
        FROM dbo.tblarap f
        WHERE f.fcoid = p_pstrcoid
          AND f.fyear = v_year
          AND dbo.isap(f.fcoid, f.fcsaccountid) = true
          AND (p_rdgbranch <> 0 OR f.fbrid = p_strbrid)
          AND (
                p_cbopoststatus NOT IN (0, 1)
                OR (p_cbopoststatus = 0 AND f.fpost = false)
                OR (p_cbopoststatus = 1 AND f.fpost = true)
              )
          AND f.fdate::date <= v_asondate
        GROUP BY f.fcoid, f.fcsaccountid;

        IF p_blnprint0bal = false THEN
            DELETE FROM tmp_tblpayables WHERE fdrcr = 0;   -- FIX: was fdrc
        END IF;

        UPDATE tmp_tblpayables
        SET fdebit  = CASE WHEN fdrcr > 0 THEN ABS(fdrcr) ELSE 0 END,
            fcredit = CASE WHEN fdrcr < 0 THEN ABS(fdrcr) ELSE 0 END;

        IF p_chkorderbyacname = false THEN
            OPEN p_result FOR
            SELECT a.*, b.fcsaccountname
            FROM tmp_tblpayables a
            LEFT JOIN dbo.tblaccountcs b
                   ON a.fcoid = b.fcoid AND a.fcsaccountid = b.fcsaccountid
            ORDER BY a.fcsaccountid;
        ELSE
            OPEN p_result FOR
            SELECT a.*, b.fcsaccountname
            FROM tmp_tblpayables a
            LEFT JOIN dbo.tblaccountcs b
                   ON a.fcoid = b.fcoid AND a.fcsaccountid = b.fcsaccountid
            ORDER BY b.fcsaccountname;
        END IF;

    ----------------------------------------------------------------
    -- MODE 1 : PERIOD-WISE PAYABLES
    ----------------------------------------------------------------
    ELSE

        -- opening balance before from date
        INSERT INTO tmp_tblpayables (fcoid, fcsaccountid, fopbal)
        SELECT f.fcoid, f.fcsaccountid,
               SUM(COALESCE(f.fdebit, 0) - COALESCE(f.fcredit, 0))
        FROM dbo.tblarap f
        WHERE f.fcoid = p_pstrcoid
          AND f.fyear = v_year
          AND dbo.isap(f.fcoid, f.fcsaccountid) = true
          AND (p_rdgbranch <> 0 OR f.fbrid = p_strbrid)
          AND (
                p_cbopoststatus NOT IN (0, 1)
                OR (p_cbopoststatus = 0 AND f.fpost = false)
                OR (p_cbopoststatus = 1 AND f.fpost = true)
              )
          AND f.fdate::date < v_fromdate
        GROUP BY f.fcoid, f.fcsaccountid;

        -- opening transactions (OP) when the period starts on 1st January
        IF EXTRACT(DAY FROM v_fromdate) = 1
           AND EXTRACT(MONTH FROM v_fromdate) = 1 THEN

            INSERT INTO tmp_tblpayables (fcoid, fcsaccountid, fopbal)
            SELECT f.fcoid, f.fcsaccountid,
                   SUM(COALESCE(f.fdebit, 0) - COALESCE(f.fcredit, 0))
            FROM dbo.tblarap f
            WHERE f.fcoid = p_pstrcoid
              AND f.fyear = v_year
              AND f.fdoctype = 'OP'
              AND dbo.isap(f.fcoid, f.fcsaccountid) = true
              AND (p_rdgbranch <> 0 OR f.fbrid = p_strbrid)
              AND (
                    p_cbopoststatus NOT IN (0, 1)
                    OR (p_cbopoststatus = 0 AND f.fpost = false)
                    OR (p_cbopoststatus = 1 AND f.fpost = true)
                  )
            GROUP BY f.fcoid, f.fcsaccountid;
        END IF;

        -- current period debit / credit
        INSERT INTO tmp_tblpayables (fcoid, fcsaccountid, fdebit, fcredit, fcu_drcr)
        SELECT f.fcoid, f.fcsaccountid,
               SUM(COALESCE(f.fdebit, 0)),
               SUM(COALESCE(f.fcredit, 0)),
               SUM(COALESCE(f.fdebit, 0) - COALESCE(f.fcredit, 0))
        FROM dbo.tblarap f
        WHERE f.fcoid = p_pstrcoid
          AND f.fdoctype <> 'OP'
          AND dbo.isap(f.fcoid, f.fcsaccountid) = true
          AND (p_rdgbranch <> 0 OR f.fbrid = p_strbrid)
          AND (
                p_cbopoststatus NOT IN (0, 1)
                OR (p_cbopoststatus = 0 AND f.fpost = false)
                OR (p_cbopoststatus = 1 AND f.fpost = true)
              )
          AND f.fdate::date >= v_fromdate
          AND f.fdate::date <= v_todate
        GROUP BY f.fcoid, f.fcsaccountid;

        -- summary
        INSERT INTO tmp_tblpayablessum (fcoid, fcsaccountid, fcu_drcr, fopbal)
        SELECT f.fcoid, f.fcsaccountid,
               SUM(COALESCE(f.fcu_drcr, 0)),
               SUM(COALESCE(f.fopbal, 0))
        FROM tmp_tblpayables f
        GROUP BY f.fcoid, f.fcsaccountid;

        -- closing balance
        UPDATE tmp_tblpayablessum
        SET fbalance = COALESCE(fopbal, 0) + COALESCE(fcu_drcr, 0);

        -- FIX: the summary never filled fdebit / fcredit -> closing balance as Dr / Cr
        UPDATE tmp_tblpayablessum
        SET fdebit  = CASE WHEN fbalance > 0 THEN fbalance ELSE 0 END,
            fcredit = CASE WHEN fbalance < 0 THEN ABS(fbalance) ELSE 0 END;

        IF p_blnprint0bal = false THEN
            DELETE FROM tmp_tblpayablessum WHERE fbalance = 0;
        END IF;

        IF p_chkorderbyacname = false THEN
            OPEN p_result FOR
            SELECT a.*, b.fcsaccountname
            FROM tmp_tblpayablessum a
            LEFT JOIN dbo.tblaccountcs b
                   ON a.fcoid = b.fcoid AND a.fcsaccountid = b.fcsaccountid
            ORDER BY a.fcsaccountid;
        ELSE
            OPEN p_result FOR
            SELECT a.*, b.fcsaccountname
            FROM tmp_tblpayablessum a
            LEFT JOIN dbo.tblaccountcs b
                   ON a.fcoid = b.fcoid AND a.fcsaccountid = b.fcsaccountid
            ORDER BY b.fcsaccountname;
        END IF;

    END IF;
END;
$BODY$;
ALTER PROCEDURE dbo.sp_rptpayables(character varying, smallint, character varying, smallint, character varying, character varying, character varying, smallint, boolean, boolean, refcursor)
    OWNER TO postgres;

