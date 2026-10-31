-- PROCEDURE: dbo.sp_rptgl(character varying, smallint, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, boolean, smallint, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_rptgl(character varying, smallint, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, boolean, smallint, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptgl(
	IN p_pstrcoid character varying,
	IN p_rdgbranch smallint,
	IN p_strbrid character varying,
	IN p_rdgaccount smallint,
	IN p_straccountid character varying,
	IN p_strfromaccountid character varying,
	IN p_strtoaccountid character varying,
	IN p_strccid character varying,
	IN p_strfromdate character varying,
	IN p_strtodate character varying,
	IN p_rdgopening smallint,
	IN p_cbopoststatus smallint,
	IN p_blnprint0bal boolean,
	IN p_rdgtranstype smallint DEFAULT 2,
	INOUT p_result refcursor DEFAULT 'rptgl_cursor'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_fromyear varchar(4);
    v_fromdate date;
    v_todate date;
BEGIN
    v_fromdate := to_date(p_strfromdate, 'DD/MM/YYYY');
    v_todate   := to_date(p_strtodate,   'DD/MM/YYYY');
    v_fromyear := to_char(v_fromdate, 'YYYY');

    DROP TABLE IF EXISTS tmp_tblgl;
    DROP TABLE IF EXISTS tmp_tblbal0;
    DROP TABLE IF EXISTS tmp_tbldata;

    CREATE TEMP TABLE tmp_tblgl
    (
        fcoid varchar(3),
        fyear varchar(4),
        fbrid varchar(3),
        fdoctype varchar(5),
        fdocno varchar(15),
        fslno smallint DEFAULT 0,        
        fdate timestamp,
        faccountid varchar(12),
        fccid varchar(8),
        fdescription varchar(250),       
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fdrcr numeric(18,2) DEFAULT 0
    ) ON COMMIT DROP;

    ------------------------------------------------------------
    -- ACCOUNT HEADS
    ------------------------------------------------------------
    INSERT INTO tmp_tblgl (fcoid, faccountid, fdoctype, fslno, fdrcr)
    SELECT a.fcoid, a.faccountid, 'ACC', 0, 0
    FROM dbo.tblaccount a
    WHERE a.fcoid = p_pstrcoid
      AND a.fgph = 'H'
      AND (
            p_rdgaccount NOT IN (0, 1)
            OR (p_rdgaccount = 0 AND a.faccountid = p_straccountid)
            OR (p_rdgaccount = 1
                AND a.faccountid >= p_strfromaccountid
                AND a.faccountid <= p_strtoaccountid)
          );

    ------------------------------------------------------------
    -- OPENING BALANCE
    ------------------------------------------------------------
    IF p_rdgopening = 0 THEN

        INSERT INTO tmp_tblgl
            (fcoid, faccountid, fdoctype, fslno,  fdescription, fdrcr)
        SELECT f.fcoid, f.faccountid, 'OP', 0,  'OPENING BALANCE',
               SUM(COALESCE(f.fdebit, 0) - COALESCE(f.fcredit, 0))
        FROM dbo.tblfintrans f
        WHERE f.fcoid = p_pstrcoid
          AND f.fyear = v_fromyear
          AND (
                p_cbopoststatus NOT IN (0, 1)
                OR (p_cbopoststatus = 0 AND f.fpost = false)
                OR (p_cbopoststatus = 1 AND f.fpost = true)
              )
          AND (
                p_rdgtranstype NOT IN (0, 1)
                OR (p_rdgtranstype = 0 AND f.fdoctype IN
                    ('PI', 'PR', 'SI', 'SR', 'ST', 'ADJ', 'DN', 'CN'))
                OR (p_rdgtranstype = 1 AND f.fdoctype NOT IN
                    ('PI', 'PR', 'SI', 'SR', 'ST', 'ADJ', 'DN', 'CN'))
              )
          AND (p_rdgbranch <> 0 OR f.fbrid = p_strbrid)
          AND (
                p_rdgaccount NOT IN (0, 1)
                OR (p_rdgaccount = 0 AND f.faccountid = p_straccountid)
                OR (p_rdgaccount = 1
                    AND f.faccountid >= p_strfromaccountid
                    AND f.faccountid <= p_strtoaccountid)
              )
          AND (COALESCE(p_strccid, '') = '' OR f.fccid = p_strccid)
          AND f.fdate::date < v_fromdate
        GROUP BY f.fcoid, f.faccountid;

        -- multiple year GL: the opening transactions (OP) when the period starts on 1st January
        IF EXTRACT(DAY FROM v_fromdate) = 1
           AND EXTRACT(MONTH FROM v_fromdate) = 1 THEN

            INSERT INTO tmp_tblgl
                (fcoid, fyear, fbrid, faccountid, fccid, fdoctype, fdocno, fslno,
                  fdate, fdescription,  fdebit, fcredit, fdrcr)
            SELECT f.fcoid, f.fyear, f.fbrid, f.faccountid, f.fccid, f.fdoctype,
                   f.fdocno, f.fslno,  f.fdate, f.fdescription, 
                   COALESCE(f.fdebit, 0), COALESCE(f.fcredit, 0),
                   COALESCE(f.fdebit, 0) - COALESCE(f.fcredit, 0)
            FROM dbo.tblfintrans f
            WHERE f.fcoid = p_pstrcoid
              AND f.fyear = v_fromyear
              AND f.fdoctype = 'OP'
              AND (
                    p_cbopoststatus NOT IN (0, 1)
                    OR (p_cbopoststatus = 0 AND f.fpost = false)
                    OR (p_cbopoststatus = 1 AND f.fpost = true)
                  )
              AND (p_rdgbranch <> 0 OR f.fbrid = p_strbrid)
              AND (
                    p_rdgaccount NOT IN (0, 1)
                    OR (p_rdgaccount = 0 AND f.faccountid = p_straccountid)
                    OR (p_rdgaccount = 1
                        AND f.faccountid >= p_strfromaccountid
                        AND f.faccountid <= p_strtoaccountid)
                  );
        END IF;

        UPDATE tmp_tblgl
        SET fdebit  = CASE WHEN fdrcr > 0 THEN fdrcr ELSE 0 END,
            fcredit = CASE WHEN fdrcr < 0 THEN ABS(fdrcr) ELSE 0 END;

    END IF;

    ------------------------------------------------------------
    -- REGULAR TRANSACTIONS
    ------------------------------------------------------------
    INSERT INTO tmp_tblgl
        (fcoid, fyear, fbrid, faccountid, fccid, fdoctype, fdocno, fslno,
         fdate, fdescription, fdebit, fcredit, fdrcr)
    SELECT f.fcoid, f.fyear, f.fbrid, f.faccountid, f.fccid, f.fdoctype,
           f.fdocno, f.fslno,  f.fdate, f.fdescription, 
           COALESCE(f.fdebit, 0), COALESCE(f.fcredit, 0),
           COALESCE(f.fdebit, 0) - COALESCE(f.fcredit, 0)
    FROM dbo.tblfintrans f
    WHERE f.fcoid = p_pstrcoid
      AND f.fdoctype <> 'OP'
      AND (
            p_cbopoststatus NOT IN (0, 1)
            OR (p_cbopoststatus = 0 AND f.fpost = false)
            OR (p_cbopoststatus = 1 AND f.fpost = true)
          )
      AND (
            p_rdgtranstype NOT IN (0, 1)
            OR (p_rdgtranstype = 0 AND f.fdoctype IN
                ('PI', 'PR', 'SI', 'SR', 'ST', 'ADJ', 'DN', 'CN'))
            OR (p_rdgtranstype = 1 AND f.fdoctype NOT IN
                ('PI', 'PR', 'SI', 'SR', 'ST', 'ADJ', 'DN', 'CN'))
          )
      AND (p_rdgbranch <> 0 OR f.fbrid = p_strbrid)
      AND (
            p_rdgaccount NOT IN (0, 1)
            OR (p_rdgaccount = 0 AND f.faccountid = p_straccountid)
            OR (p_rdgaccount = 1
                AND f.faccountid >= p_strfromaccountid
                AND f.faccountid <= p_strtoaccountid)
          )
      AND (COALESCE(p_strccid, '') = '' OR f.fccid = p_strccid)
      AND f.fdate::date >= v_fromdate
      AND f.fdate::date <= v_todate;

    ------------------------------------------------------------
    -- DELETE ZERO BALANCE ACCOUNTS
    ------------------------------------------------------------
    IF p_blnprint0bal = false THEN

        CREATE TEMP TABLE tmp_tblbal0
        ON COMMIT DROP
        AS
        SELECT f.fcoid, f.faccountid
        FROM tmp_tblgl f
        GROUP BY f.fcoid, f.faccountid
        HAVING SUM(COALESCE(f.fdebit, 0) - COALESCE(f.fcredit, 0)) = 0;

        DELETE FROM tmp_tblgl a
        USING tmp_tblbal0 b
        WHERE a.fcoid = b.fcoid
          AND a.faccountid = b.faccountid;

    END IF;

    ------------------------------------------------------------
    -- ACCOUNTS WITH MORE THAN ONE ROW: drop their ACC row
    ------------------------------------------------------------
    CREATE TEMP TABLE tmp_tbldata
    ON COMMIT DROP
    AS
    SELECT f.fcoid, f.faccountid
    FROM tmp_tblgl f
    GROUP BY f.fcoid, f.faccountid
    HAVING COUNT(*) > 1;

    DELETE FROM tmp_tblgl a
    USING tmp_tbldata b
    WHERE a.fcoid = b.fcoid
      AND a.faccountid = b.faccountid
      AND a.fdoctype = 'ACC';

    UPDATE tmp_tblgl SET fdoctype = '' WHERE fdoctype = 'ACC';

    ------------------------------------------------------------
    -- FINAL GL REPORT
    ------------------------------------------------------------
    OPEN p_result FOR
    SELECT
        a.fcoid,
        a.fyear,
        a.fbrid,
        a.fdoctype,
        a.fdocno,
        a.fslno,       
        CASE WHEN a.fdate IS NOT NULL
             THEN to_char(a.fdate, 'DD-Mon-YY')
             ELSE NULL
        END AS fedate,
        a.faccountid,
        a.fccid,
        a.fdescription,      
        a.fdebit,
        a.fcredit,
        a.fdrcr,                         
        b.faccountname
    FROM tmp_tblgl a
    LEFT JOIN dbo.tblaccount b
           ON a.fcoid = b.fcoid
          AND a.faccountid = b.faccountid
    ORDER BY
        a.faccountid,
        a.fdate NULLS FIRST,             -- FIX: the OPENING BALANCE row (no date) must come first
        a.fslno;
END;
$BODY$;
ALTER PROCEDURE dbo.sp_rptgl(character varying, smallint, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, boolean, smallint, refcursor)
    OWNER TO postgres;

