-- PROCEDURE: dbo.sp_pagematchrecords(character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, smallint, smallint, bigint, character varying, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, character varying, character varying, boolean, boolean, numeric, numeric, character varying, character varying, character varying, character varying, integer, smallint, smallint, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagematchrecords(character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, smallint, smallint, bigint, character varying, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, character varying, character varying, boolean, boolean, numeric, numeric, character varying, character varying, character varying, character varying, integer, smallint, smallint, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagematchrecords(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strcsaccountid character varying DEFAULT NULL::character varying,
	IN p_pstryear character varying DEFAULT '0'::character varying,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	IN p_intslno smallint DEFAULT 0,
	IN p_intmaccountslno smallint DEFAULT 0,
	IN p_intmaccountslnosub smallint DEFAULT 0,
	IN p_intslnosub smallint DEFAULT 0,
	IN p_intdocno bigint DEFAULT 0,
	IN p_dtpdate character varying DEFAULT NULL::character varying,
	IN p_strdescription character varying DEFAULT NULL::character varying,
	IN p_strcurrency character varying DEFAULT NULL::character varying,
	IN p_numcurrencyrate numeric DEFAULT 0,
	IN p_numdocamt numeric DEFAULT 0,
	IN p_numdebit numeric DEFAULT 0,
	IN p_numcredit numeric DEFAULT 0,
	IN p_numdebit_fc numeric DEFAULT 0,
	IN p_numcredit_fc numeric DEFAULT 0,
	IN p_strstatus character varying DEFAULT NULL::character varying,
	IN p_dtpmatchapplydate character varying DEFAULT NULL::character varying,
	IN p_blnpost boolean DEFAULT true,
	IN p_blnmatch boolean DEFAULT true,
	IN p_nummatchamt numeric DEFAULT 0,
	IN p_nummatchamt_fc numeric DEFAULT 0,
	IN p_pstrcyear character varying DEFAULT '0'::character varying,
	IN p_strcbrid character varying DEFAULT NULL::character varying,
	IN p_strcdoctype character varying DEFAULT NULL::character varying,
	IN p_strcdocno character varying DEFAULT NULL::character varying,
	IN p_intcdocno integer DEFAULT 0,
	IN p_intcslno smallint DEFAULT 0,
	IN p_intcslnosub smallint DEFAULT 0,
	IN p_strumdkey character varying DEFAULT NULL::character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	INOUT p_result refcursor DEFAULT 'match_records_result'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_match_amt        NUMERIC(18,2) := 0;

    -- P row (parent, e.g. BR) amounts
    v_p_dr             NUMERIC(18,2) := 0;
    v_p_cr             NUMERIC(18,2) := 0;

    -- C row (child, e.g. SI) amounts
    v_c_dr             NUMERIC(18,2) := 0;
    v_c_cr             NUMERIC(18,2) := 0;

    v_child_is_debit   BOOLEAN := FALSE;
    v_apply_date       DATE;
    v_parent_date      DATE;
    v_child_date       DATE;
    v_child_amt        NUMERIC(18,2) := 0;
    v_child_matched    NUMERIC(18,2) := 0;
BEGIN

    ------------------------------------------------------------
    -- GNM: Get pending match documents
    ------------------------------------------------------------
    IF p_strmode = 'GNM' THEN

        CALL dbo.sp_getpendingmatchdocs(
            'GNM',
            p_pstrcoid,
            p_pstryear,
            p_strbrid,
            p_strdoctype,
            p_strdocno,
            p_strcsaccountid,
            p_intmaccountslno,
            p_intmaccountslnosub,
            p_strumdkey,
            p_result
        );

    ------------------------------------------------------------
    -- GM: Get already matched documents
    ------------------------------------------------------------
    ELSIF p_strmode = 'GM' THEN

        OPEN p_result FOR
        SELECT
            p_intmaccountslno AS fmaccountslno,
            p_intmaccountslnosub AS fmaccountslnosub,
            a.fyear,
            a.fbrid,
            a.fdoctype,
            a.fdocno,
            a.fslno,
            a.fcsaccountid,
            a.fdate,
            a.fmatchapplydate,
            a.fsupplierref,
            a.fdocamt,
            a.fdebit,
            a.fcredit,
            COALESCE(a.fdebit, 0) -
                COALESCE(a.fcredit, 0) AS fmatchamt,
            dbo.convertmstatus2boolean('M') AS fmatch
        FROM dbo.tblmatchrecords AS m
        LEFT JOIN dbo.tblarap AS a
          ON a.fcoid    = m.fcoid
         AND a.fyear    = m.fyear
         AND a.fbrid    = m.fbrid
         AND a.fdoctype = m.fdoctype
         AND a.fdocno   = m.fdocno
         AND a.fslno    = m.fslno
        WHERE m.fpc       = 'C'
          AND m.fcoid     = p_pstrcoid
          AND m.fpyear    = p_pstryear
          AND m.fpbrid    = p_strbrid
          AND m.fpdoctype = p_strdoctype
          AND m.fpdocno   = p_strdocno
          AND (p_strcsaccountid IS NULL OR m.fcsaccountid = p_strcsaccountid)
        ORDER BY a.fcsaccountid, a.fdate;

    ------------------------------------------------------------
    -- S: Save matching record
    --    One P row per parent document (the receipt, accumulates the
    --    matched total) + one C row per matched child document (the
    --    invoice). fdebit/fcredit hold the MATCHED amount on the
    --    document's own side.
    ------------------------------------------------------------
    ELSIF p_strmode = 'S' THEN

        v_match_amt := ABS(COALESCE(p_nummatchamt, 0));

        IF v_match_amt <= 0 THEN
            RAISE EXCEPTION 'Match amount must be greater than zero.';
        END IF;

        v_apply_date  := CASE WHEN NULLIF(p_dtpmatchapplydate, '') IS NULL THEN NULL
                              ELSE TO_DATE(p_dtpmatchapplydate, 'DD/MM/YYYY') END;
        v_parent_date := CASE WHEN NULLIF(p_dtpdate, '') IS NULL THEN NULL
                              ELSE TO_DATE(p_dtpdate, 'DD/MM/YYYY') END;

        -- p_numdebit / p_numcredit come from the CHILD row in the controller.
        -- Each document keeps its own side:
        --   child debit  (SI): C.fdebit  = matched, P.fcredit = matched
        --   child credit     : C.fcredit = matched, P.fdebit  = matched
        v_child_is_debit := COALESCE(p_numdebit, 0) > 0;

        IF v_child_is_debit THEN
            v_c_dr := v_match_amt;
            v_p_cr := v_match_amt;
        ELSE
            v_c_cr := v_match_amt;
            v_p_dr := v_match_amt;
        END IF;

        -- Child document date and full amount (used to decide if it is closed)
        SELECT a.fdate,
               ABS(COALESCE(a.fdebit, 0) - COALESCE(a.fcredit, 0))
          INTO v_child_date, v_child_amt
          FROM dbo.tblarap a
         WHERE a.fcoid    = p_pstrcoid
           AND a.fyear    = p_pstrcyear
           AND a.fbrid    = p_strcbrid
           AND a.fdoctype = p_strcdoctype
           AND a.fdocno   = p_strcdocno
           AND a.fslno    = p_intcslno
           AND a.fslnosub = p_intcslnosub;

        v_child_amt := COALESCE(v_child_amt, 0);

        -- C row: the matched child document (invoice)  -- 19 columns, 19 values
        INSERT INTO dbo.tblmatchrecords
        (
            fpc, fcoid, fyear, fbrid, fdoctype, fdocno, fdoctypeno, fslno,
            fdate, fcsaccountid,
            fdebit, fcredit,
            fpyear, fpbrid, fpdoctype, fpdocno,
            fmatchdate,
            fmatchuserid, fmatchuserdate
        )
        VALUES
        (
            'C', p_pstrcoid, p_pstrcyear, p_strcbrid, p_strcdoctype, p_strcdocno,
            p_strcdoctype || ' ' || p_strcdocno, p_intcslno,
            v_child_date, p_strcsaccountid,
            v_c_dr, v_c_cr,
            p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
            v_apply_date,
            p_pstruserid, CURRENT_TIMESTAMP
        );

        -- P row: the parent document (receipt). Add to it if it exists.
        UPDATE dbo.tblmatchrecords
           SET fdebit         = COALESCE(fdebit, 0)     + v_p_dr,
               fcredit        = COALESCE(fcredit, 0)    + v_p_cr,
               fmatchdate     = v_apply_date,
               fmatchuserid   = p_pstruserid,
               fmatchuserdate = CURRENT_TIMESTAMP
         WHERE fpc      = 'P'
           AND fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fbrid    = p_strbrid
           AND fdoctype = p_strdoctype
           AND fdocno   = p_strdocno
           AND fslno    = p_intslno;

        IF NOT FOUND THEN
            INSERT INTO dbo.tblmatchrecords
            (
                fpc, fcoid, fyear, fbrid, fdoctype, fdocno, fdoctypeno, fslno,
                fdate, fcsaccountid,
                fdebit, fcredit,
                fpyear, fpbrid, fpdoctype, fpdocno,
                fmatchdate,
                fmatchuserid, fmatchuserdate
            )
            VALUES
            (
                'P', p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
                p_strdoctype || ' ' || p_strdocno, p_intslno,
                v_parent_date, p_strcsaccountid,
                v_p_dr, v_p_cr,
                p_pstryear, p_strbrid, p_strdoctype, p_strdocno,   -- P row points to itself
                v_apply_date,
                p_pstruserid, CURRENT_TIMESTAMP
            );
        END IF;

        -- Total matched so far against this child document
        SELECT COALESCE(SUM(COALESCE(m.fdebit, 0) + COALESCE(m.fcredit, 0)), 0)
          INTO v_child_matched
          FROM dbo.tblmatchrecords m
         WHERE m.fpc      = 'C'
           AND m.fcoid    = p_pstrcoid
           AND m.fyear    = p_pstrcyear
           AND m.fbrid    = p_strcbrid
           AND m.fdoctype = p_strcdoctype
           AND m.fdocno   = p_strcdocno
           AND m.fslno    = p_intcslno;

        -- Child document: matched; closed only when fully matched
        UPDATE dbo.tblarap
        SET
            fmatch = true,
            fclosed = (v_child_matched >= v_child_amt),
            fmatchapplydate = v_apply_date,
            fmatchuserid = p_pstruserid,
            fmatchuserdate = CURRENT_TIMESTAMP
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstrcyear
          AND fbrid = p_strcbrid
          AND fdoctype = p_strcdoctype
          AND fdocno = p_strcdocno
          AND fslno = p_intcslno
          AND fslnosub = p_intcslnosub;

        UPDATE dbo.tblfintrans
        SET fmatch = true
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstrcyear
          AND fbrid = p_strcbrid
          AND fdoctype = p_strcdoctype
          AND fdocno = p_strcdocno
          AND fslno = p_intcslno;

        -- Keep child documents posted after matching.
        UPDATE dbo.tblarap
        SET fpost = true
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstrcyear
          AND fbrid = p_strcbrid
          AND fdoctype = p_strcdoctype
          AND fdocno = p_strcdocno;

        UPDATE dbo.tblfintrans
        SET fpost = true
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstrcyear
          AND fbrid = p_strcbrid
          AND fdoctype = p_strcdoctype
          AND fdocno = p_strcdocno;

    ------------------------------------------------------------
    -- D: Delete matching records of a parent document
    --    (the P row points to itself, so fp* keys catch P and C rows)
    ------------------------------------------------------------
    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblmatchrecords
        WHERE fcoid = p_pstrcoid
          AND fpyear = p_pstryear
          AND fpbrid = p_strbrid
          AND fpdoctype = p_strdoctype
          AND fpdocno = p_strdocno
          AND (p_strcsaccountid IS NULL OR fcsaccountid = p_strcsaccountid);

    ELSE
        RAISE EXCEPTION
            'Invalid mode: %. Expected GNM, GM, S, or D.',
            p_strmode;
    END IF;

END;
$BODY$;
ALTER PROCEDURE dbo.sp_pagematchrecords(character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, smallint, smallint, bigint, character varying, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, character varying, character varying, boolean, boolean, numeric, numeric, character varying, character varying, character varying, character varying, integer, smallint, smallint, character varying, character varying, refcursor)
    OWNER TO postgres;

