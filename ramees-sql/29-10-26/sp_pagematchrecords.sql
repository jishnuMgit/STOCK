-- PROCEDURE: dbo.sp_frmmatchrecords(character varying, character varying, character varying, character varying, smallint, character varying, character varying, smallint, smallint, smallint, smallint, bigint, character varying, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, character varying, character varying, boolean, boolean, numeric, numeric, smallint, character varying, character varying, character varying, integer, smallint, smallint, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_frmmatchrecords(character varying, character varying, character varying, character varying, smallint, character varying, character varying, smallint, smallint, smallint, smallint, bigint, character varying, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, character varying, character varying, boolean, boolean, numeric, numeric, smallint, character varying, character varying, character varying, integer, smallint, smallint, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagematchrecords(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_straccountid character varying DEFAULT NULL::character varying,
	IN p_pstryear character varying DEFAULT 0,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	IN p_intslno smallint DEFAULT 0,
	IN p_intcaccountslno smallint DEFAULT 0,
	IN p_intcaccountslnosub smallint DEFAULT 0,
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
	IN p_dtpefdate character varying DEFAULT NULL::character varying,
	IN p_blnpost boolean DEFAULT true,
	IN p_blnmatch boolean DEFAULT true,
	IN p_nummatchamt numeric DEFAULT 0,
	IN p_nummatchamt_fc numeric DEFAULT 0,
	IN p_pstrcyear character varying DEFAULT 0,
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
    v_match_amt_dr     NUMERIC(10,2) := 0;
    v_match_amt_cr     NUMERIC(10,2) := 0;
    v_match_amt_dr_fc  NUMERIC(10,4) := 0;
    v_match_amt_cr_fc  NUMERIC(10,4) := 0;
    v_bln_debit        BOOLEAN := FALSE;
    v_match_amt        NUMERIC(18,2) := 0;
    v_match_amt_fc     NUMERIC(18,4) := 0;
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
            p_straccountid,
            p_intcaccountslno,
            p_intcaccountslnosub,
            p_strumdkey,
            p_result
        );

    ------------------------------------------------------------
    -- GM: Get already matched documents
    ------------------------------------------------------------
    ELSIF p_strmode = 'GM' THEN

        OPEN p_result FOR
        SELECT
            p_intcaccountslno AS fcaccountslno,
            p_intcaccountslnosub AS fcaccountslnosub,
            a.fyear,
            a.fbrid,
            a.fdoctype,
            a.fdocno,
            a.fslno,
            a.faccountid,
            a.fdate,
            a.fmatchapplydate,
            a.fdescription,
            a.fsupplierref,
            a.fdocamt,
            a.fdebit,
            a.fcredit,
            COALESCE(a.fdebit, 0) -
                COALESCE(a.fcredit, 0) AS fmatchamt,
            dbo.convertmstatus2boolean('M') AS fmatch
        FROM dbo.tblmatchrecords AS m
        LEFT JOIN dbo.tblarap AS a
          ON a.fcoid = m.fcoid
         AND a.fyear = m.fcyear
         AND a.fbrid = m.fcbrid
         AND a.fdoctype = m.fcdoctype
         AND a.fdocno = m.fcdocno
         AND a.fslno = m.fcslno
        WHERE m.fcoid = p_pstrcoid
          AND m.fyear = p_pstryear
          AND m.fbrid = p_strbrid
          AND m.fdoctype = p_strdoctype
          AND m.fdocno = p_strdocno
          AND m.fslno = p_intcaccountslno
        ORDER BY a.faccountid, a.fdate;

    ------------------------------------------------------------
    -- S: Save matching record
    ------------------------------------------------------------
    ELSIF p_strmode = 'S' THEN

        v_match_amt := ABS(COALESCE(p_nummatchamt, 0));
        v_match_amt_fc := ABS(COALESCE(p_nummatchamt_fc, 0));

        v_bln_debit := COALESCE(p_numdebit, 0) > 0;

        IF v_bln_debit AND v_match_amt > 0 THEN
            v_match_amt_cr := v_match_amt;
            v_match_amt_cr_fc := v_match_amt_fc;

        ELSIF NOT v_bln_debit AND v_match_amt > 0 THEN
            v_match_amt_dr := v_match_amt;
            v_match_amt_dr_fc := v_match_amt_fc;
        END IF;

        INSERT INTO dbo.tblmatchrecords
        (
            fcoid,
            fpyear,
            fpbrid,
            fpdoctype,
            fpdocno,
            fpslno,
            fpslnosub,
            fdate,
            fmatchapplydate,
            faccountid,
            fdescription,
            fcurrency,
            fcurrencyrate,
            fdebit,
            fcredit,
            fdebit_fc,
            fcredit_fc,
            fcyear,
            fcbrid,
            fcdoctype,
            fcdocno,
            fcslno,
            fmatchuserid,
            fmatchuserdate,
            fpost
        )
        VALUES
        (
            p_pstrcoid,
            p_pstrcyear,
            p_strcbrid,
            p_strcdoctype,
            p_strcdocno,
            p_intcslno,
            p_intcslnosub,
            CASE
                WHEN NULLIF(p_dtpdate, '') IS NULL THEN NULL
                ELSE TO_DATE(p_dtpdate, 'DD/MM/YYYY')
            END,
            CASE
                WHEN NULLIF(p_dtpefdate, '') IS NULL THEN NULL
                ELSE TO_DATE(p_dtpefdate, 'DD/MM/YYYY')
            END,
            p_straccountid,
            p_strdescription,
            p_strcurrency,
            p_numcurrencyrate,
            v_match_amt_dr,
            v_match_amt_cr,
            v_match_amt_dr_fc,
            v_match_amt_cr_fc,
            p_pstryear,
            p_strbrid,
            p_strdoctype,
            p_strdocno,
            p_intslno,
            p_pstruserid,
            CURRENT_TIMESTAMP,
            TRUE
        );

        -- Update matched parent document.
        UPDATE dbo.tblarap
        SET
            fmatch = true,
            fclosed = true,
            fmatchapplydate = CASE
                WHEN NULLIF(p_dtpefdate, '') IS NULL THEN NULL
                ELSE TO_DATE(p_dtpefdate, 'DD/MM/YYYY')
            END,
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

        -- Keep parent documents posted after matching.
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
    -- D: Delete matching record
    ------------------------------------------------------------
    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblmatchrecords
        WHERE fcoid = p_pstrcoid
          AND fpyear = p_pstryear
          AND fpbrid = p_strbrid
          AND fpdoctype = p_strdoctype
          AND fpdocno = p_strdocno
          AND fpslno = p_intslno
          AND fpslnosub = p_intslnosub;

    ELSE
        RAISE EXCEPTION
            'Invalid mode: %. Expected GNM, GM, S, or D.',
            p_strmode;
    END IF;

END;
$BODY$;
ALTER PROCEDURE dbo.sp_frmmatchrecords(character varying, character varying, character varying, character varying, smallint, character varying, character varying, smallint, smallint, smallint, smallint, bigint, character varying, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, character varying, character varying, boolean, boolean, numeric, numeric, smallint, character varying, character varying, character varying, integer, smallint, smallint, character varying, character varying, refcursor)
    OWNER TO postgres;

