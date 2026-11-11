-- PROCEDURE: dbo.sp_getpendingmatchdocs
-- Updated for the new dbo.tblmatchrecords structure (one row per ledger line,
-- fpc = 'C' invoice side / 'P' receipt side). Matched amounts are netted per
-- ledger line using fdoc* + fslno only; the fp* columns are not used.

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
    v_blnmatch           boolean := false;
    v_nummatchamt        numeric(18,2) := 0;
    v_nummatchamt_fc     numeric(18,4) := 0;
BEGIN

    ----------------------------------------------------------------------
    -- TEMP TABLES (safe to call more than once in the same transaction)
    ----------------------------------------------------------------------
    CREATE TEMP TABLE IF NOT EXISTS tmp_tblmatcht
    (
        fcoid          varchar(3),
        fyear          varchar(4),
        fbrid          varchar(3),
        fdoctype       varchar(5),
        fdoctypeno     varchar(20),
        fdocno         varchar(15),
        fdate          timestamp,
        fcsaccountid   varchar(12),
        fdescription   varchar(250),
        fsupplierref   varchar(30),
        fslno          smallint,
        fslnosub       smallint,
        fdocamt        numeric(18,2) DEFAULT 0,
        fdebit         numeric(18,2) DEFAULT 0,
        fcredit        numeric(18,2) DEFAULT 0,
        fcurrency      varchar(3),
        fcurrencyrate  numeric(18,4) DEFAULT 0,
        fdrcr          numeric(18,2) DEFAULT 0
    )
    ON COMMIT DROP;

    CREATE TEMP TABLE IF NOT EXISTS tmp_tblmatch
    (
        fcoid          varchar(3),
        fyear          varchar(4),
        fbrid          varchar(3),
        fdoctype       varchar(5),
        fdoctypeno     varchar(20),
        fdocno         varchar(15),
        fdate          timestamp,
        fcsaccountid   varchar(12),
        fdescription   varchar(250),
        fsupplierref   varchar(30),
        fslno          smallint,
        fslnosub       smallint,
        fdocamt        numeric(18,2) DEFAULT 0,
        fdebit         numeric(18,2) DEFAULT 0,
        fcredit        numeric(18,2) DEFAULT 0,
        fcurrency      varchar(3),
        fcurrencyrate  numeric(18,4) DEFAULT 0,
        fdrcr          numeric(18,2) DEFAULT 0
    )
    ON COMMIT DROP;

    TRUNCATE tmp_tblmatcht;
    TRUNCATE tmp_tblmatch;

    ----------------------------------------------------------------------
    -- MODE: GNM
    -- GET ALL PENDING DOCUMENTS FOR MATCHING AGAINST AN ACCOUNT
    ----------------------------------------------------------------------
    IF p_strmode = 'GNM' THEN

        ------------------------------------------------------------------
        -- 1) ALL OPEN DOCUMENTS FROM tblarap
        ------------------------------------------------------------------
        INSERT INTO tmp_tblmatcht
        (
            fcoid, fyear, fbrid, fdoctype, fdocno, fdoctypeno, fdate,
            fcsaccountid, fdescription, fslno, fslnosub,
            fdocamt, fdebit, fcredit
        )
        SELECT
            a.fcoid, a.fyear, a.fbrid, a.fdoctype, a.fdocno, a.fdoctypeno,
            a.fdate, a.fcsaccountid, a.fdescription,
            a.fslno, a.fslnosub,
            COALESCE(a.fdocamt, 0),
            COALESCE(a.fdebit, 0),
            COALESCE(a.fcredit, 0)
        FROM dbo.tblarap a
        WHERE a.fcoid = p_strcoid
          AND a.fcsaccountid = p_strcsaccountid
          AND a.fpost = TRUE
		  AND a.fmatch = FALSE
          AND COALESCE(a.fmatchcompleted, FALSE) = FALSE
          AND (
                COALESCE(a.fyear::text, '0') ||
                COALESCE(a.fbrid, '') ||
                COALESCE(a.fdoctype, '') ||
                COALESCE(a.fdocno, '')
              ) <> COALESCE(p_strumdkey, '');

        ------------------------------------------------------------------
        -- 2) MATCHED AMOUNTS FROM tblmatchrecords, APPLIED PER LEDGER LINE.
        --    In the new structure every ledger line (invoice 'C' side and
        --    receipt 'P' side) has its own row with its own fslno and the
        --    amount matched on that line. Only fdoc* + fslno are used; the
        --    fp* columns repeat the receipt key on every row and would
        --    count the same amount several times.
        --    The matched amount always reduces the open balance:
        --      - debit line  (net >= 0) -> a credit is added
        --      - credit line (net <  0) -> a debit is added
        --    so SUM(fdebit - fcredit) falls by the matched amount
        --    (10000 debit - 8000 matched = 2000 debit left).
        --    "doc" is one row per open document line, so documents with
        --    several tblarap rows are not double counted.
        ------------------------------------------------------------------
        WITH doc AS (
            SELECT fcoid, fyear, fbrid, fdoctype, fdocno, fslno,
                   fcsaccountid,
                   SUM(fdebit - fcredit) AS net
            FROM tmp_tblmatcht
            GROUP BY fcoid, fyear, fbrid, fdoctype, fdocno, fslno,
                     fcsaccountid
        ),
        sides AS (
            SELECT fcoid,
                   fyear::text   AS yr,
                   fbrid         AS br,
                   fdoctype      AS dt,
                   fdocno        AS dn,
                   fslno         AS sl,
                   SUM(GREATEST(COALESCE(fdebit, 0),
                                COALESCE(fcredit, 0))) AS amt
            FROM dbo.tblmatchrecords
            WHERE fcoid = p_strcoid
              AND fcsaccountid = p_strcsaccountid
            GROUP BY fcoid, fyear::text, fbrid, fdoctype, fdocno, fslno
        )
        INSERT INTO tmp_tblmatcht
        (
            fcoid, fyear, fbrid, fdoctype, fdocno,
            fcsaccountid, fslno, fdebit, fcredit
        )
        SELECT
            d.fcoid, d.fyear, d.fbrid, d.fdoctype, d.fdocno,
            d.fcsaccountid, d.fslno,
            CASE WHEN d.net >= 0 THEN 0 ELSE s.amt END,
            CASE WHEN d.net >= 0 THEN s.amt ELSE 0 END
        FROM sides s
        JOIN doc d
          ON  d.fcoid = s.fcoid
          AND COALESCE(d.fyear, '0') = COALESCE(s.yr, '0')
          AND d.fbrid    = s.br
          AND d.fdoctype = s.dt
          AND d.fdocno   = s.dn
          AND d.fslno    = s.sl;

        ------------------------------------------------------------------
        -- 3) GROUP & APPEND
        --    fdoctypeno is NOT in the GROUP BY (NULL on match rows)
        ------------------------------------------------------------------
        INSERT INTO tmp_tblmatch
        (
            fcoid, fyear, fbrid, fdoctype, fdocno, fdoctypeno,
            fdate, fcsaccountid, fdescription, fsupplierref,
            fslno, fslnosub, fdocamt, fdebit, fcredit, fdrcr
        )
        SELECT
            fcoid, fyear, fbrid, fdoctype, fdocno,
            MAX(fdoctypeno),
            MAX(fdate),
            fcsaccountid,
            MAX(fdescription),
            MAX(fsupplierref),
            fslno,
            MAX(fslnosub),
            SUM(COALESCE(fdocamt, 0)),
            SUM(COALESCE(fdebit, 0)),
            SUM(COALESCE(fcredit, 0)),
            SUM(COALESCE(fdebit, 0) - COALESCE(fcredit, 0))
        FROM tmp_tblmatcht
        GROUP BY fcoid, fyear, fbrid, fdoctype, fdocno,
                 fcsaccountid, fslno;

        ------------------------------------------------------------------
        -- 4) REMOVE FULLY MATCHED DOCUMENTS
        ------------------------------------------------------------------
        DELETE FROM tmp_tblmatch
        WHERE fdrcr = 0;

        ------------------------------------------------------------------
        -- 5) NORMALIZE DEBIT / CREDIT TO THE REMAINING BALANCE
        ------------------------------------------------------------------
        UPDATE tmp_tblmatch
        SET fdebit  = CASE WHEN fdrcr >= 0 THEN ABS(fdrcr) ELSE 0 END,
            fcredit = CASE WHEN fdrcr <  0 THEN ABS(fdrcr) ELSE 0 END;

    END IF;

    ----------------------------------------------------------------------
    -- RETURN RESULT (empty cursor for any mode other than GNM)
    ----------------------------------------------------------------------
    OPEN p_result_cursor FOR
    SELECT
        p_intmaccountslno    AS fmaccountslno,
        p_intmaccountslnosub AS fmaccountslnosub,
        fcoid, fyear, fbrid, fdoctype, fdocno, fdoctypeno,
        fdate, fcsaccountid, fdescription, fsupplierref,
        fslno, fslnosub, fdocamt, fdebit, fcredit, fdrcr,
        v_nummatchamt    AS fmatchamt,
        v_nummatchamt_fc AS fmatchamt_fc,
        v_blnmatch       AS fmatch
    FROM tmp_tblmatch
    ORDER BY fcsaccountid, fdate;

END;
$BODY$;

ALTER PROCEDURE dbo.sp_getpendingmatchdocs(character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, refcursor)
    OWNER TO postgres;