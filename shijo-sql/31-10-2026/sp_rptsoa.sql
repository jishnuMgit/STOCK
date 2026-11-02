-- PROCEDURE: dbo.sp_rptsoa(character varying, smallint, smallint, character varying, smallint, character varying, character varying, character varying, smallint, character varying, character varying, character varying, boolean, character varying, smallint, smallint, boolean, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_rptsoa(character varying, smallint, smallint, character varying, smallint, character varying, character varying, character varying, smallint, character varying, character varying, character varying, boolean, character varying, smallint, smallint, boolean, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptsoa(
	IN p_pstrcoid character varying,
	IN p_rdgcs smallint,
	IN p_rdgbranch smallint,
	IN p_strbrid character varying,
	IN p_rdgcsaccount smallint,
	IN p_strcsaccountid character varying,
	IN p_strfromcsaccountid character varying,
	IN p_strtocsaccountid character varying,
	IN p_rdgdivision smallint,
	IN p_strdivid character varying,
	IN p_strfromdate character varying,
	IN p_strtodate character varying,
	IN p_cboageing boolean,
	IN p_strageingmode character varying,
	IN p_cbopoststatus smallint,
	IN p_rdgsoatype smallint,
	IN p_blnprint0bal boolean,
	IN p_pstruserid character varying,
	INOUT p_result_cursor refcursor DEFAULT 'rptsoa_cursor'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_fromdate date;
    v_todate date;
    v_agefrom date;
    v_ageto date;
    v_prevfrom date;
    v_periodfrom integer;
    v_periodto integer;
    v_period integer;
    v_bucket integer;
    v_bal numeric(18,2);
    v_dr1 numeric(18,2);
    v_dr2 numeric(18,2);
    v_dr3 numeric(18,2);
    v_dr4 numeric(18,2);
    v_dr5 numeric(18,2);
    v_dr6 numeric(18,2);
    v_totcr numeric(18,2);
    r record;
BEGIN
    v_fromdate := to_date(p_strfromdate, 'DD/MM/YYYY');
    v_todate := to_date(p_strtodate, 'DD/MM/YYYY');

    IF v_fromdate > v_todate THEN
        RAISE EXCEPTION 'From date cannot be greater than To date';
    END IF;

    DROP TABLE IF EXISTS pg_temp.tblstacmt;
    DROP TABLE IF EXISTS pg_temp.tblmatch;
    DROP TABLE IF EXISTS pg_temp.tblstacm;
    DROP TABLE IF EXISTS pg_temp.tblstac;
    DROP TABLE IF EXISTS pg_temp.tblageingdrm;
    DROP TABLE IF EXISTS pg_temp.tblageingcrm;
    DROP TABLE IF EXISTS pg_temp.tblageingt;
    DROP TABLE IF EXISTS pg_temp.tblageing;
    DROP TABLE IF EXISTS pg_temp.tblageamount;
    DROP TABLE IF EXISTS pg_temp.tblbal0;

    -------------------------------------------------------------------
    -- Source transactions
    -------------------------------------------------------------------

    CREATE TEMP TABLE tblstacmt (
        fcoid varchar(3),
        fyear varchar(4),
        fbrid varchar(3),
        fdoctype varchar(5),
        fdocno varchar(15),
        fpyear varchar(4),
        fpbrid varchar(3),
        fpdoctype varchar(5),
        fpdocno varchar(15),
        fslno smallint DEFAULT 0,
        fslnosub smallint,
        fintdocno bigint DEFAULT 0,
        fdate timestamp,
        fapplydate timestamp,
        fcheckin timestamp,
        faccountid varchar(12),
        fcsaccountid varchar(12),
        fdivid varchar(20),
        fdi varchar(1),
        frefno varchar(20),
        fdescription varchar(250),
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fdrcr numeric(18,2) DEFAULT 0,
        fdebit_orig numeric(18,2) DEFAULT 0,
        fcredit_orig numeric(18,2) DEFAULT 0,
        fstatus varchar(1),
        fmatchapplydate timestamp,
        fpost boolean DEFAULT false,
        fintpost integer DEFAULT 0,
        ftranstype varchar(5)
    );

    CREATE TEMP TABLE tblmatch (
        fcoid varchar(3),
        fyear varchar(4),
        fbrid varchar(3),
        fdoctype varchar(5),
        fdocno varchar(15),
        fslno smallint DEFAULT 0,
        fslnosub smallint,
        fintdocno bigint DEFAULT 0,
        fdate timestamp,
        faccountid varchar(12),
        fcsaccountid varchar(12),
        fdescription varchar(250),
        fdocamt numeric(18,2) DEFAULT 0,
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fdrcr numeric(18,2) DEFAULT 0,
        fcdoctype varchar(5),
        fcdocno varchar(15),
        fcyear varchar(4),
        fcbrid varchar(3),
        fcslno smallint,
        fmatchapplydate timestamp,
        fpc varchar(1),
        fpost boolean DEFAULT false,
        fintpost integer DEFAULT 0
    );

    CREATE TEMP TABLE tblstacm (
        fcoid varchar(3),
        fyear varchar(4),
        fbrid varchar(3),
        fdoctype varchar(5),
        fdocno varchar(15),
        fpyear varchar(4),
        fpbrid varchar(3),
        fpdoctype varchar(5),
        fpdocno varchar(15),
        faccountid varchar(12),
        fdivid varchar(20),
        fdi varchar(1),
        frefno varchar(20),
        fslno smallint DEFAULT 0,
        fslnosub smallint,
        fintdocno bigint DEFAULT 0,
        fdate timestamp,
        fapplydate timestamp,
        fcheckin timestamp,
        fcsaccountid varchar(12),
        fdescription varchar(250),
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fdrcr numeric(18,2) DEFAULT 0,
        fstatus varchar(1),
        fmatchapplydate timestamp,
        fpost boolean DEFAULT false,
        fintpost integer DEFAULT 0,
        ftranstype varchar(5)
    );

    CREATE TEMP TABLE tblstac (
        fcoid varchar(3),
        fbrid varchar(3),
        fdoctype varchar(5),
        fdocno varchar(15),
        fslno smallint DEFAULT 0,
        fslnosub smallint,
        fintdocno bigint DEFAULT 0,
        fdate timestamp,
        fapplydate timestamp,
        fcheckin timestamp,
        fcsaccountid varchar(12),
        fdivid varchar(20),
        fdi varchar(1),
        fdescription varchar(250),
        frefno varchar(20),
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0,
        fdrcr numeric(18,2) DEFAULT 0
    );

    INSERT INTO tblstacmt (
        fcoid, fyear, fbrid, fdoctype, fdocno,
        fslno, fslnosub,  fdate, fapplydate,
        faccountid, fcsaccountid, fdivid, 
        frefno, fdescription, fdebit, fcredit,
        fdebit_orig, fcredit_orig, fstatus, fpost,
        fpdoctype, fpdocno, fpyear, fpbrid, ftranstype
    )
    SELECT
        a.fcoid, a.fyear::varchar(4), a.fbrid, a.fdoctype, a.fdocno,
        a.fslno, a.fslnosub,  a.fdate, a.fapplydate,
         a.faccountid, a.fcsaccountid, a.fdivid,
        a.frefno, a.fdescription,
        coalesce(a.fdebit, 0), coalesce(a.fcredit, 0),
        coalesce(a.fdebit, 0), coalesce(a.fcredit, 0),
        a.fstatus, coalesce(a.fpost, false),
        a.fpdoctype, a.fpdocno, a.fpyear::varchar(4), a.fpbrid,
        'ARAP'
    FROM dbo.tblarap a
    WHERE a.fcoid = p_pstrcoid
      AND a.fdate::date <= v_todate
      AND (
          p_cbopoststatus = 2
          OR (p_cbopoststatus = 0 AND coalesce(a.fpost, false) = false)
          OR (p_cbopoststatus = 1 AND coalesce(a.fpost, false) = true)
      )
      AND (p_rdgbranch <> 0 OR a.fbrid = p_strbrid)
      AND (
          p_rdgcsaccount = 2
          OR (p_rdgcsaccount = 0 AND a.fcsaccountid = p_strcsaccountid)
          OR (
              p_rdgcsaccount = 1
              AND a.fcsaccountid BETWEEN p_strfromcsaccountid
                                     AND p_strtocsaccountid
          )
      )
      AND (
          p_rdgdivision <> 0
          OR a.fdivid = p_strdivid
      )
     
      AND (
          (p_rdgcs = 0 AND dbo.isar(a.fcoid, a.fcsaccountid) = TRUE)
          OR (p_rdgcs = 1 AND dbo.isap(a.fcoid, a.fcsaccountid) = TRUE)
      );

    -------------------------------------------------------------------
    -- Matching records
    -------------------------------------------------------------------

    INSERT INTO tblmatch (
        fcoid, fyear, fbrid, fdoctype, fdocno,
        fslno, fslnosub, fintdocno, fdate,
        faccountid, fcsaccountid, fdescription,
        fdebit, fcredit, fcdoctype, fcdocno, fcyear,
        fcbrid, fcslno, fmatchapplydate, fpc, fpost
    )
    SELECT
        a.fcoid,
        a.fpyear::varchar(4),
        a.fpbrid,
        a.fpdoctype,
        a.fpdocno,
        a.fpslno,
        b.fslnosub,
        b.fintdocno,
        a.fdate,
        a.faccountid,
        a.fcsaccountid,
        b.fdescription,
        coalesce(a.fdebit, 0),
        coalesce(a.fcredit, 0),
        a.fcdoctype,
        a.fcdocno,
        a.fcyear::varchar(4),
        a.fcbrid,
        a.fcslno,
        a.fmatchapplydate,
        'C',
        coalesce(a.fpost, false)
    FROM dbo.tblmatchrecords a
    INNER JOIN tblstacmt b
       ON a.fcoid = b.fcoid
      AND a.fcbrid = b.fbrid
      AND a.fcdoctype = b.fdoctype
      AND a.fcdocno = b.fdocno
      AND a.fcslno = b.fslno
      AND a.fcsaccountid = b.fcsaccountid;

    UPDATE tblmatch
    SET fintpost = CASE WHEN fpost THEN 1 ELSE 0 END;

    DELETE FROM tblstacmt a
    WHERE EXISTS (
        SELECT 1
        FROM tblmatch m
        WHERE m.fcoid = a.fcoid
          AND m.fcbrid = a.fbrid
          AND m.fcdoctype = a.fdoctype
          AND m.fcdocno = a.fdocno
          AND m.fcslno = a.fslno
          AND m.fcsaccountid = a.fcsaccountid
          AND m.fmatchapplydate::date > v_todate
    );

    DELETE FROM tblmatch
    WHERE fmatchapplydate::date > v_todate;

    IF p_rdgsoatype IN (0, 1) THEN
        INSERT INTO tblstacmt (
            fcoid, fyear, fbrid, fdoctype, fdocno,
            fslno, fslnosub, fintdocno, fdate, fcsaccountid,
            faccountid, fdescription, fdebit, fcredit,
            fmatchapplydate, fpost, ftranstype
        )
        SELECT
            fcoid, fcyear, fcbrid, fcdoctype, fcdocno,
            fcslno, fslnosub, fintdocno, fdate, fcsaccountid,
            faccountid, fdescription, fdebit, fcredit,
            fmatchapplydate, fpost, 'MTCH1'
        FROM tblmatch
        WHERE fmatchapplydate::date <= v_todate;

        INSERT INTO tblstacmt (
            fcoid, fyear, fbrid, fdoctype, fdocno,
            fslno, fslnosub, fintdocno, fdate, fcsaccountid,
            faccountid, fdescription, fdebit, fcredit,
            fmatchapplydate, fpost, ftranstype
        )
        SELECT
            fcoid, fyear, fbrid, fdoctype, fdocno,
            fslno, fslnosub, fintdocno, fdate, fcsaccountid,
            faccountid, fdescription, fcredit, fdebit,
            fmatchapplydate, fpost, 'MTCH2'
        FROM tblmatch
        WHERE fmatchapplydate::date <= v_todate;
    END IF;

    UPDATE tblstacmt
    SET fintpost = CASE WHEN coalesce(fpost, false) THEN 1 ELSE 0 END;

    -------------------------------------------------------------------
    -- Group source rows by document and account
    -------------------------------------------------------------------

    INSERT INTO tblstacm (
        fcoid, fyear, fbrid, fdoctype, fdocno,
        fpyear, fpbrid, fpdoctype, fpdocno,
        faccountid, fdivid, fdi, frefno,
        fslno, fslnosub, fintdocno, fdate, fapplydate,
        fcheckin, fcsaccountid, fdescription,
        fdebit, fcredit, fdrcr, fstatus, fmatchapplydate,
        fpost, fintpost, ftranstype
    )
    SELECT
        fcoid, fyear, fbrid, fdoctype, fdocno,
        max(fpyear), max(fpbrid), max(fpdoctype), max(fpdocno),
        faccountid, max(fdivid), max(fdi), max(frefno),
        fslno, max(fslnosub), max(fintdocno), min(fdate),
        min(fapplydate), max(fcheckin), fcsaccountid,
        max(fdescription), sum(fdebit), sum(fcredit),
        sum(fdebit) - sum(fcredit), max(fstatus), max(fmatchapplydate),
        bool_or(coalesce(fpost, false)), max(fintpost),
        max(ftranstype)
    FROM tblstacmt
    GROUP BY
        fcoid, fyear, fbrid, fdoctype, fdocno,
        faccountid, fcsaccountid, fslno;

    UPDATE tblstacm
    SET fdebit = -fcredit,
        fcredit = 0
    WHERE fcredit < 0;

    UPDATE tblstacm
    SET fcredit = -fdebit,
        fdebit = 0
    WHERE fdebit < 0;

    IF p_rdgsoatype = 0 THEN
        DELETE FROM tblstacm
        WHERE coalesce(fdebit, 0) - coalesce(fcredit, 0) = 0;    
    END IF;

    -------------------------------------------------------------------
    -- Opening balances
    -------------------------------------------------------------------

    INSERT INTO tblstac (
        fcoid, fbrid, fdoctype, fcsaccountid, fdivid, fdi,
        fdescription, fdrcr
    )
    SELECT
        fcoid, min(fbrid), 'OP', fcsaccountid, max(fdivid), max(fdi),
        'Opening Balance',
        sum(coalesce(fdebit, 0) - coalesce(fcredit, 0))
    FROM tblstacm
    WHERE fcoid = p_pstrcoid
      AND fdate::date < v_fromdate
      AND (
          p_cbopoststatus = 2
          OR (p_cbopoststatus = 0 AND NOT coalesce(fpost, false))
          OR (p_cbopoststatus = 1 AND coalesce(fpost, false))
      )
      AND (p_rdgbranch <> 0 OR fbrid = p_strbrid)
      AND (
          p_rdgcsaccount = 2
          OR (p_rdgcsaccount = 0 AND fcsaccountid = p_strcsaccountid)
          OR (
              p_rdgcsaccount = 1
              AND fcsaccountid BETWEEN p_strfromcsaccountid
                                   AND p_strtocsaccountid
          )
      )
      AND (p_rdgdivision <> 0 OR fdivid = p_strdivid)
      
    GROUP BY fcoid, fcsaccountid;

    -------------------------------------------------------------------
    -- Transactions within the report period
    -------------------------------------------------------------------

    INSERT INTO tblstac (
        fcoid, fbrid, fdoctype, fdocno, fslno, fslnosub,
        fintdocno, fdate, fapplydate, fcheckin,
        fcsaccountid, fdivid, fdi, fdescription, frefno, fdrcr
    )
    SELECT
        fcoid, fbrid, fdoctype, fdocno, fslno, fslnosub,
        fintdocno, fdate, fapplydate, fcheckin,
        fcsaccountid, fdivid, fdi, fdescription, frefno,
        coalesce(fdebit, 0) - coalesce(fcredit, 0)
    FROM tblstacm
    WHERE fcoid = p_pstrcoid
      AND fdate::date BETWEEN v_fromdate AND v_todate
      AND (
          p_cbopoststatus = 2
          OR (p_cbopoststatus = 0 AND NOT coalesce(fpost, false))
          OR (p_cbopoststatus = 1 AND coalesce(fpost, false))
      )
      AND (p_rdgbranch <> 0 OR fbrid = p_strbrid)
      AND (
          p_rdgcsaccount = 2
          OR (p_rdgcsaccount = 0 AND fcsaccountid = p_strcsaccountid)
          OR (
              p_rdgcsaccount = 1
              AND fcsaccountid BETWEEN p_strfromcsaccountid
                                   AND p_strtocsaccountid
          )
      )
      AND (p_rdgdivision <> 0 OR fdivid = p_strdivid);

    UPDATE tblstac
    SET fdebit = CASE WHEN fdrcr >= 0 THEN abs(fdrcr) ELSE 0 END,
        fcredit = CASE WHEN fdrcr < 0 THEN abs(fdrcr) ELSE 0 END;

    DELETE FROM tblstac
    WHERE coalesce(fdrcr, 0) = 0;

    -------------------------------------------------------------------
    -- Ageing totals and buckets
    -------------------------------------------------------------------

    CREATE TEMP TABLE tblageingdrm (
        fcoid varchar(3),
        fcsaccountid varchar(12)
    );

    CREATE TEMP TABLE tblageingcrm (
        fcoid varchar(3),
        fcsaccountid varchar(12)
    );

    CREATE TEMP TABLE tblageingt (
        fcoid varchar(3),
        fcsaccountid varchar(12),
        fbal numeric(18,2) DEFAULT 0,
        fdr1 numeric(18,2) DEFAULT 0,
        fdr2 numeric(18,2) DEFAULT 0,
        fdr3 numeric(18,2) DEFAULT 0,
        fdr4 numeric(18,2) DEFAULT 0,
        fdr5 numeric(18,2) DEFAULT 0,
        fdr6 numeric(18,2) DEFAULT 0,
        ftotcr numeric(18,2) DEFAULT 0
    );

    CREATE TEMP TABLE tblageing (
        fcoid varchar(3),
        fcsaccountid varchar(12),
        fbal numeric(18,2) DEFAULT 0,
        fdr1 numeric(18,2) DEFAULT 0,
        fdr2 numeric(18,2) DEFAULT 0,
        fdr3 numeric(18,2) DEFAULT 0,
        fdr4 numeric(18,2) DEFAULT 0,
        fdr5 numeric(18,2) DEFAULT 0,
        fdr6 numeric(18,2) DEFAULT 0,
        ftotcr numeric(18,2) DEFAULT 0,
        fbaldr1 numeric(18,2) DEFAULT 0,
        fbaldr2 numeric(18,2) DEFAULT 0,
        fbaldr3 numeric(18,2) DEFAULT 0,
        fbaldr4 numeric(18,2) DEFAULT 0,
        fbaldr5 numeric(18,2) DEFAULT 0,
        fbaldr6 numeric(18,2) DEFAULT 0
    );

    CREATE TEMP TABLE tblageamount (
        fcoid varchar(3),
        fcsaccountid varchar(12),
        fbucket integer,
        famount numeric(18,2)
    );

    INSERT INTO tblageingdrm
    SELECT fcoid, fcsaccountid
    FROM tblstacm
    WHERE fcoid = p_pstrcoid
      AND fdate::date <= v_todate
    GROUP BY fcoid, fcsaccountid
    HAVING sum(coalesce(fdebit, 0) - coalesce(fcredit, 0)) >= 0;

    INSERT INTO tblageingcrm
    SELECT fcoid, fcsaccountid
    FROM tblstacm
    WHERE fcoid = p_pstrcoid
      AND fdate::date <= v_todate
    GROUP BY fcoid, fcsaccountid
    HAVING sum(coalesce(fdebit, 0) - coalesce(fcredit, 0)) < 0;

    INSERT INTO tblageingt(fcoid, fcsaccountid, fbal, ftotcr)
    SELECT a.fcoid, a.fcsaccountid,
           sum(coalesce(a.fdebit, 0) - coalesce(a.fcredit, 0)),
           sum(coalesce(a.fcredit, 0))
    FROM tblstacm a
    JOIN tblageingdrm b
      ON b.fcoid = a.fcoid
     AND b.fcsaccountid = a.fcsaccountid
    WHERE a.fdate::date <= v_todate
    GROUP BY a.fcoid, a.fcsaccountid;

    INSERT INTO tblageingt(fcoid, fcsaccountid, fbal, ftotcr)
    SELECT a.fcoid, a.fcsaccountid,
           sum(coalesce(a.fdebit, 0) - coalesce(a.fcredit, 0)),
           -sum(coalesce(a.fdebit, 0))
    FROM tblstacm a
    JOIN tblageingcrm b
      ON b.fcoid = a.fcoid
     AND b.fcsaccountid = a.fcsaccountid
    WHERE a.fdate::date <= v_todate
    GROUP BY a.fcoid, a.fcsaccountid;

    IF p_cboageing THEN
        v_prevfrom := v_todate + 1;

        FOR v_bucket IN 1..5 LOOP
            SELECT ap.ffrom, ap.fto
            INTO v_periodfrom, v_periodto
            FROM dbo.tblageingperiod ap
            WHERE ap.fcoid = p_pstrcoid
              AND ap.fmoduleid = 'FIN'
              AND ap.fageingmode = p_strageingmode
              AND ap.frptcolumnid = v_bucket;

            IF NOT FOUND THEN
                v_periodfrom := 0;
                v_periodto := 0;
            END IF;

            IF lower(p_strageingmode) = 'days' THEN
                v_agefrom := v_todate - abs(coalesce(v_periodto, 0)) + 1;
                v_ageto := v_prevfrom - 1;
            ELSE
                v_period := abs(coalesce(v_periodto, 0) -
                                coalesce(v_periodfrom, 0));
                v_agefrom := (
                    date_trunc(
                        'month',
                        v_prevfrom - make_interval(months => v_period)
                    )
                )::date;
                v_ageto := v_prevfrom - 1;
            END IF;

            INSERT INTO tblageamount
            SELECT a.fcoid, a.fcsaccountid, v_bucket,
                   sum(coalesce(a.fdebit, 0))
            FROM tblstacm a
            JOIN tblageingdrm b
              ON b.fcoid = a.fcoid
             AND b.fcsaccountid = a.fcsaccountid
            WHERE a.fdate::date BETWEEN v_agefrom AND v_ageto
              AND a.fdate::date <= v_todate
              AND a.fcoid = p_pstrcoid
            GROUP BY a.fcoid, a.fcsaccountid;

            INSERT INTO tblageamount
            SELECT a.fcoid, a.fcsaccountid, v_bucket,
                   -sum(coalesce(a.fcredit, 0))
            FROM tblstacm a
            JOIN tblageingcrm b
              ON b.fcoid = a.fcoid
             AND b.fcsaccountid = a.fcsaccountid
            WHERE a.fdate::date BETWEEN v_agefrom AND v_ageto
              AND a.fdate::date <= v_todate
              AND a.fcoid = p_pstrcoid
            GROUP BY a.fcoid, a.fcsaccountid;

            v_prevfrom := v_agefrom;
        END LOOP;

        INSERT INTO tblageamount
        SELECT a.fcoid, a.fcsaccountid, 6,
               sum(coalesce(a.fdebit, 0))
        FROM tblstacm a
        JOIN tblageingdrm b
          ON b.fcoid = a.fcoid
         AND b.fcsaccountid = a.fcsaccountid
        WHERE a.fdate::date < v_prevfrom
          AND a.fdate::date <= v_todate
          AND a.fcoid = p_pstrcoid
        GROUP BY a.fcoid, a.fcsaccountid;

        INSERT INTO tblageamount
        SELECT a.fcoid, a.fcsaccountid, 6,
               -sum(coalesce(a.fcredit, 0))
        FROM tblstacm a
        JOIN tblageingcrm b
          ON b.fcoid = a.fcoid
         AND b.fcsaccountid = a.fcsaccountid
        WHERE a.fdate::date < v_prevfrom
          AND a.fdate::date <= v_todate
          AND a.fcoid = p_pstrcoid
        GROUP BY a.fcoid, a.fcsaccountid;
    END IF;

    INSERT INTO tblageing (
        fcoid, fcsaccountid, fbal,
        fdr1, fdr2, fdr3, fdr4, fdr5, fdr6, ftotcr
    )
    SELECT
        fcoid, fcsaccountid,
        sum(fbal), sum(fdr1), sum(fdr2), sum(fdr3),
        sum(fdr4), sum(fdr5), sum(fdr6), sum(ftotcr)
    FROM tblageingt
    GROUP BY fcoid, fcsaccountid;

    UPDATE tblageing a
    SET fdr1 = coalesce(x.b1, 0),
        fdr2 = coalesce(x.b2, 0),
        fdr3 = coalesce(x.b3, 0),
        fdr4 = coalesce(x.b4, 0),
        fdr5 = coalesce(x.b5, 0),
        fdr6 = coalesce(x.b6, 0)
    FROM (
        SELECT fcoid, fcsaccountid,
               sum(famount) FILTER (WHERE fbucket = 1) AS b1,
               sum(famount) FILTER (WHERE fbucket = 2) AS b2,
               sum(famount) FILTER (WHERE fbucket = 3) AS b3,
               sum(famount) FILTER (WHERE fbucket = 4) AS b4,
               sum(famount) FILTER (WHERE fbucket = 5) AS b5,
               sum(famount) FILTER (WHERE fbucket = 6) AS b6
        FROM tblageamount
        GROUP BY fcoid, fcsaccountid
    ) x
    WHERE x.fcoid = a.fcoid
      AND x.fcsaccountid = a.fcsaccountid;

    FOR r IN SELECT * FROM tblageing LOOP
        v_bal := coalesce(r.fbal, 0);
        v_dr1 := abs(coalesce(r.fdr1, 0));
        v_dr2 := abs(coalesce(r.fdr2, 0));
        v_dr3 := abs(coalesce(r.fdr3, 0));
        v_dr4 := abs(coalesce(r.fdr4, 0));
        v_dr5 := abs(coalesce(r.fdr5, 0));
        v_dr6 := abs(coalesce(r.fdr6, 0));
        v_totcr := abs(coalesce(r.ftotcr, 0));

        IF v_totcr > v_dr6 THEN
            v_totcr := v_totcr - v_dr6;
            v_dr6 := 0;
        ELSE
            v_dr6 := v_dr6 - v_totcr;
            v_totcr := 0;
        END IF;

        IF v_totcr > v_dr5 THEN
            v_totcr := v_totcr - v_dr5;
            v_dr5 := 0;
        ELSE
            v_dr5 := v_dr5 - v_totcr;
            v_totcr := 0;
        END IF;

        IF v_totcr > v_dr4 THEN
            v_totcr := v_totcr - v_dr4;
            v_dr4 := 0;
        ELSE
            v_dr4 := v_dr4 - v_totcr;
            v_totcr := 0;
        END IF;

        IF v_totcr > v_dr3 THEN
            v_totcr := v_totcr - v_dr3;
            v_dr3 := 0;
        ELSE
            v_dr3 := v_dr3 - v_totcr;
            v_totcr := 0;
        END IF;

        IF v_totcr > v_dr2 THEN
            v_totcr := v_totcr - v_dr2;
            v_dr2 := 0;
        ELSE
            v_dr2 := v_dr2 - v_totcr;
            v_totcr := 0;
        END IF;

        IF v_totcr > v_dr1 THEN
            v_totcr := v_totcr - v_dr1;
            v_dr1 := 0;
        ELSE
            v_dr1 := v_dr1 - v_totcr;
            v_totcr := 0;
        END IF;

        IF v_bal < 0 THEN
            v_dr1 := -v_dr1;
            v_dr2 := -v_dr2;
            v_dr3 := -v_dr3;
            v_dr4 := -v_dr4;
            v_dr5 := -v_dr5;
            v_dr6 := -v_dr6;
        END IF;

        UPDATE tblageing
        SET fbaldr1 = v_dr1,
            fbaldr2 = v_dr2,
            fbaldr3 = v_dr3,
            fbaldr4 = v_dr4,
            fbaldr5 = v_dr5,
            fbaldr6 = v_dr6
        WHERE fcoid = r.fcoid
          AND fcsaccountid = r.fcsaccountid;
    END LOOP;

    -------------------------------------------------------------------
    -- Remove zero-balance accounts when requested
    -------------------------------------------------------------------

    IF NOT coalesce(p_blnprint0bal, false) THEN
        CREATE TEMP TABLE tblbal0 (
            fcoid varchar(3),
            fcsaccountid varchar(12)
        );

        INSERT INTO tblbal0
        SELECT fcoid, fcsaccountid
        FROM tblstac
        GROUP BY fcoid, fcsaccountid
        HAVING sum(coalesce(fdebit, 0) - coalesce(fcredit, 0)) = 0;

        DELETE FROM tblstac a
        USING tblbal0 b
        WHERE a.fcoid = b.fcoid
          AND a.fcsaccountid = b.fcsaccountid;
    END IF;

    UPDATE tblstac
    SET fbrid = '01'
    WHERE coalesce(trim(fbrid), '') = '';

    -------------------------------------------------------------------
    -- Final report cursor
    -------------------------------------------------------------------

    OPEN p_result_cursor FOR
    SELECT
        a.fcoid,
        a.fbrid,
        a.fdoctype,
        a.fdocno,
        a.fslno,
        a.fslnosub,      
        a.fdate,
        a.fapplydate,       
        to_char(a.fdate, 'DD-Mon-YY') AS fedate,
        a.fcsaccountid,
        a.fdivid,
        a.fdivid || ' - ' || d.fdivname AS fdivname,
        a.fdescription,
        a.fdebit,
        a.fcredit,
        a.fdrcr,
        b.fbal,
        b.fbaldr1,
        b.fbaldr2,
        b.fbaldr3,
        b.fbaldr4,
        b.fbaldr5,
        b.fbaldr6,
        c.fcsaccountname as faccountname,
        c.fcreditdays,
        c.fcreditlimit,
        c.fphone,
        c.femail,
        a.frefno,
        e.fconame,
        e.fconame_ar,
        f.fbraddress1 AS fcombinedaddress1,
        f.fbraddress2 AS fcombinedaddress2,
        f.fbraddress3 AS fcombinedaddress3,
        f.fbraddress4 AS fcombinedaddress4,
        f.fbraddress1_ar AS fcombinedaddress1_ar,
        f.fbraddress2_ar AS fcombinedaddress2_ar,
        f.fbraddress3_ar AS fcombinedaddress3_ar,
        f.fbraddress4_ar AS fcombinedaddress4_ar
    FROM tblstac a
    LEFT JOIN tblageing b
      ON a.fcoid = b.fcoid
     AND a.fcsaccountid = b.fcsaccountid
    LEFT JOIN dbo.tblaccountcs c
      ON a.fcoid = c.fcoid
     AND a.fcsaccountid = c.fcsaccountid
    LEFT JOIN dbo.tblcustdivision d
      ON a.fcoid = d.fcoid
     AND a.fcsaccountid = d.fcustomerid
     AND a.fdivid = d.fdivid
    LEFT JOIN dbo.tblcompany e
      ON a.fcoid = e.fcoid
    LEFT JOIN dbo.tblbranch f
      ON a.fcoid = f.fcoid
     AND a.fbrid = f.fbrid
    ORDER BY
        a.fcsaccountid,
        a.fdate,       
        a.fslno,
        a.fslnosub;

END;
$BODY$;
ALTER PROCEDURE dbo.sp_rptsoa(character varying, smallint, smallint, character varying, smallint, character varying, character varying, character varying, smallint, character varying, character varying, character varying, boolean, character varying, smallint, smallint, boolean, character varying, refcursor)
    OWNER TO postgres;

