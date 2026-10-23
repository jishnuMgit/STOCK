-- PROCEDURE: dbo.sp_pagepi(character varying, character varying, character varying, character varying, character varying, character varying, character varying, timestamp without time zone, character varying, character varying, character varying, character varying, character varying, character varying, numeric, smallint, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, character varying, smallint, character varying, character varying)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagepi(character varying, character varying, character varying, character varying, character varying, character varying, character varying, timestamp without time zone, character varying, character varying, character varying, character varying, character varying, character varying, numeric, smallint, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, character varying, smallint, character varying, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_pagepi(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_pstryear character varying DEFAULT NULL::character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	IN p_strinvoicetype character varying DEFAULT NULL::character varying,
	IN p_dtpdate timestamp without time zone DEFAULT NULL::timestamp without time zone,
	IN p_strpino character varying DEFAULT NULL::character varying,
	IN p_strpono character varying DEFAULT NULL::character varying,
	IN p_strvatno character varying DEFAULT NULL::character varying,
	IN p_strsupplierid character varying DEFAULT NULL::character varying,
	IN p_strsuppliername character varying DEFAULT NULL::character varying,
	IN p_strcurrency character varying DEFAULT NULL::character varying,
	IN p_numcurrencyrate numeric DEFAULT 0,
	IN p_intslno smallint DEFAULT 0,
	IN p_stritemid character varying DEFAULT NULL::character varying,
	IN p_strunit character varying DEFAULT NULL::character varying,
	IN p_numqtyin numeric DEFAULT 0,
	IN p_numunitprice numeric DEFAULT 0,
	IN p_numtotalprice numeric DEFAULT 0,
	IN p_numunitcost numeric DEFAULT 0,
	IN p_numtotalcost numeric DEFAULT 0,
	IN p_numgtotalcost numeric DEFAULT 0,
	IN p_numsupplieramt numeric DEFAULT 0,
	IN p_numdiscamt numeric DEFAULT 0,
	IN p_numvatamt numeric DEFAULT 0,
	IN p_strnote character varying DEFAULT NULL::character varying,
	IN p_original_fslno smallint DEFAULT 0,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	IN p_strmenuname character varying DEFAULT NULL::character varying)
LANGUAGE 'plpgsql'
AS $BODY$

DECLARE
    v_strdescription varchar(100);
    v_strstockaccountid varchar(12);
    v_strcurrencyfluctuationaccountid varchar(12);
    v_strccid varchar(8);
    v_numsupplieramtinclvat numeric(18,2) := 0;
    v_strmuserid varchar(20);
    v_dtpmuserdate timestamp;
    v_numtotcurdifference numeric(18,2);
    v_numcredit numeric(18,2) := 0;
    v_numdebit numeric(18,2) := 0;
    v_straccountid varchar(12);
BEGIN
    v_strdescription := 'Purchase Inv ' || p_strpino;

    /*
      S: Insert purchase invoice detail/header row
    */
    IF p_strmode = 'S' THEN

        INSERT INTO dbo.tblStockTrans
        (
            fCoID, fYear, fBrID, fDocType, fDocNo,
            fPISIType, fPINo, fPONo, fDate,
            fCSAccountID, fCurrency, fCurrencyRate,
            fNote, fSlNo, fItemID, fUnit, fQtyIn,
            fUnitPrice, fTotalPrice,
            fUnitCost, fTotalCost, fDiscAmt,
            fDocAmt, fNetDocAmt, fVATAmt, fOrigin,
            fCUserID, fCUserDate
        )
        VALUES
        (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
            p_strinvoicetype, p_strpino, p_strpono, p_dtpdate,
            p_strsupplierid, p_strcurrency, COALESCE(p_numcurrencyrate, 0),
            p_strnote, p_intslno, p_stritemid, p_strunit,
            COALESCE(p_numqtyin, 0),
            COALESCE(p_numunitprice, 0), COALESCE(p_numtotalprice, 0),
            COALESCE(p_numunitcost, 0), COALESCE(p_numtotalcost, 0),
            COALESCE(p_numdiscamt, 0),
            COALESCE(p_numsupplieramt, 0), COALESCE(p_numgtotalcost, 0),
            COALESCE(p_numvatamt, 0), 'UI',
            p_pstruserid, CURRENT_TIMESTAMP
        );

    /*
      M: Update purchase invoice header
         Only the modifier (fMUserID / fMUserDate) is written here.
         The creator (fCUserID / fCUserDate) is left as it was.
    */
    ELSIF p_strmode = 'M' THEN

        v_strmuserid := p_pstruserid;
        v_dtpmuserdate := CURRENT_TIMESTAMP;

        UPDATE dbo.tblStockTrans
        SET
            fBrID = p_strbrid,
            fPISIType = p_strinvoicetype,
            fPINo = p_strpino,
            fDate = p_dtpdate,
            fCSAccountID = p_strsupplierid,
            fPONo = p_strpono,
            fCurrency = p_strcurrency,
            fCurrencyRate = COALESCE(p_numcurrencyrate, 0),
            fNote = p_strnote,
            fDiscAmt = COALESCE(p_numdiscamt, 0),
            fDocAmt = COALESCE(p_numsupplieramt, 0),
            fNetDocAmt = COALESCE(p_numgtotalcost, 0),
            fVATAmt = COALESCE(p_numvatamt, 0),
            fMUserID = v_strmuserid,
            fMUserDate = v_dtpmuserdate
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno;

    /*
      M1: Update one invoice detail line
    */
    ELSIF p_strmode = 'M1' THEN

        UPDATE dbo.tblStockTrans
        SET
            fSlNo = p_intslno,
            fItemID = p_stritemid,
            fQtyIn = COALESCE(p_numqtyin, 0),
            fUnit = p_strunit,
            fUnitPrice = COALESCE(p_numunitprice, 0),
            fTotalPrice = COALESCE(p_numtotalprice, 0),
            fUnitCost = COALESCE(p_numunitcost, 0),
            fTotalCost = COALESCE(p_numtotalcost, 0),
            fCUserID = p_pstruserid,
            fCUserDate = CURRENT_TIMESTAMP
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno
          AND fSlNo = p_original_fslno;

    /*
      D1: Delete one invoice detail line
    */
    ELSIF p_strmode = 'D1' THEN

        DELETE FROM dbo.tblStockTrans
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno
          AND fSlNo = p_original_fslno;

    /*
      D: Delete purchase invoice and associated transactions
    */
    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblStockTrans
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno;

        DELETE FROM dbo.tblFinTrans
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno;

        DELETE FROM dbo.tblARAP
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno;

        
    END IF;

    /*
      Financial postings for S and M
    */
    IF p_strmode IN ('S', 'M') THEN

        DELETE FROM dbo.tblFinTrans
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno
          AND fSlNo < 0;

        DELETE FROM dbo.tblARAP
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno
          AND fSlNo < 0;

        /* Stock account (-1) */
        v_strstockaccountid :=
            dbo.GetStockAccountID(p_pstrcoid, p_strbrid);

        IF dbo.IsIncomeOrExpense(p_pstrcoid, v_strstockaccountid)::int = 1 THEN
            v_strccid := p_strbrid;
        ELSE
            v_strccid := '';
        END IF;

        INSERT INTO dbo.tblFinTrans
        (
            fCoID, fYear, fBrID, fDocType, fDocNo,
            fDate, fDescription, fSlNo, fCSAccountID, fCCID,
            fDebit, fCredit, fPost, fYearClose, fOrigin,
            fCUserID, fCUserDate, fMUserID, fMUserDate
        )
        VALUES
        (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
            p_dtpdate, v_strdescription, -1, v_strstockaccountid, v_strccid,
            COALESCE(p_numgtotalcost, 0), 0, false, false, 'GS',
            p_pstruserid, CURRENT_TIMESTAMP,
            v_strmuserid, v_dtpmuserdate
        );

        /* Supplier account (-2) */
        v_numsupplieramtinclvat :=
            COALESCE(p_numsupplieramt, 0) + COALESCE(p_numvatamt, 0);

        IF dbo.IsIncomeOrExpense(p_pstrcoid, p_strsupplierid)::int = 1 THEN
            v_strccid := p_strbrid;
        ELSE
            v_strccid := '';
        END IF;

        INSERT INTO dbo.tblFinTrans
        (
            fCoID, fYear, fBrID, fDocType, fDocNo,
            fDate, fDescription, fSlNo, fCSAccountID, fCCID,
            fDebit, fCredit, fPost, fYearClose, fOrigin,
            fCUserID, fCUserDate, fMUserID, fMUserDate
        )
        VALUES
        (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
            p_dtpdate, v_strdescription, -2, p_strsupplierid, v_strccid,
            0, COALESCE(v_numsupplieramtinclvat, 0), false, false, 'GS',
            p_pstruserid, CURRENT_TIMESTAMP,
            v_strmuserid, v_dtpmuserdate
        );

        /* Supplier AR/AP (-1) */
        IF dbo.isAP(p_pstrcoid, p_strsupplierid)::int = 1 THEN

            INSERT INTO dbo.tblARAP
            (
                fCoID, fYear, fBrID, fDocType, fDocNo,
                fDate, fDescription, fSlNo, fCSAccountID, fCCID,
                fDebit, fCredit, fDocAmt, fPost, fStatus,
                fCUserID, fCUserDate, fMUserID, fMUserDate
            )
            VALUES
            (
                p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
                p_dtpdate, v_strdescription, -1, p_strsupplierid, v_strccid,
                0, COALESCE(v_numsupplieramtinclvat, 0),
                COALESCE(-v_numsupplieramtinclvat, 0), false, 'N',
                p_pstruserid, CURRENT_TIMESTAMP,
                v_strmuserid, v_dtpmuserdate
            );
        END IF;

        /* VAT posting (-5) */
        IF COALESCE(p_numvatamt, 0) <> 0 THEN

            v_straccountid := dbo.GetPurchaseVATAccountID(p_pstrcoid);

            IF dbo.IsIncomeOrExpense(p_pstrcoid, v_straccountid)::int = 1 THEN
                v_strccid := p_strbrid;
            ELSE
                v_strccid := '';
            END IF;

            v_numdebit := p_numvatamt;
            v_numcredit := 0;

            INSERT INTO dbo.tblFinTrans
            (
                fCoID, fYear, fBrID, fDocType, fDocNo,
                fSlNo, fDate, fCSAccountID, fCCID, fDescription,
                fDebit, fCredit, fPost, fYearClose, fOrigin,
                fCUserID, fCUserDate
            )
            VALUES
            (
                p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
                -5, p_dtpdate, v_straccountid, v_strccid, v_strdescription,
                COALESCE(v_numdebit, 0), COALESCE(v_numcredit, 0),
                false, false, 'GS',
                p_pstruserid, CURRENT_TIMESTAMP
            );

            IF dbo.IsARAP(p_pstrcoid, v_straccountid)::int = 1 THEN

                INSERT INTO dbo.tblARAP
                (
                    fCoID, fYear, fBrID, fDocType, fDocNo,
                    fDate, fDescription, fSlNo, fCSAccountID, fCCID,
                    fDebit, fCredit, fDocAmt, fPost, fStatus,
                    fCUserID, fCUserDate
                )
                VALUES
                (
                    p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
                    p_dtpdate, v_strdescription, -5, v_straccountid, v_strccid,
                    COALESCE(v_numdebit, 0),
                    COALESCE(v_numcredit, 0),
                    COALESCE(v_numdebit, 0) - COALESCE(v_numcredit, 0),
                    false, 'U',
                    p_pstruserid, CURRENT_TIMESTAMP
                );
            END IF;
        END IF;

        /* Currency difference (-3) */
        SELECT
            COALESCE(SUM(COALESCE(fDebit, 0)), 0)
            - COALESCE(SUM(COALESCE(fCredit, 0)), 0)
        INTO v_numtotcurdifference
        FROM dbo.tblFinTrans
        WHERE fCoID = p_pstrcoid
          AND fYear = p_pstryear
          AND fBrID = p_strbrid
          AND fDocType = p_strdoctype
          AND fDocNo = p_strdocno;

        IF COALESCE(v_numtotcurdifference, 0) <> 0 THEN

            v_numcredit := 0;
            v_numdebit := 0;

            IF v_numtotcurdifference > 0 THEN
                v_numcredit := v_numtotcurdifference;
            ELSE
                v_numdebit := ABS(v_numtotcurdifference);
            END IF;

            v_strcurrencyfluctuationaccountid :=
                dbo.GetCurrencyFluctuationAccountID(
                    p_pstrcoid,
                    p_strbrid
                );

            IF dbo.IsIncomeOrExpense(
                p_pstrcoid,
                v_strcurrencyfluctuationaccountid
            )::int = 1 THEN
                v_strccid := p_strbrid;
            ELSE
                v_strccid := '';
            END IF;

            INSERT INTO dbo.tblFinTrans
            (
                fCoID, fYear, fBrID, fDocType, fDocNo,
                fDate, fDescription, fSlNo, fCSAccountID, fCCID,
                fDebit, fCredit, fPost, fYearClose, fOrigin,
                fCUserID, fCUserDate, fMUserID, fMUserDate
            )
            VALUES
            (
                p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
                p_dtpdate, v_strdescription, -3,
                v_strcurrencyfluctuationaccountid, v_strccid,
                v_numdebit, v_numcredit, false, false, 'GS',
                p_pstruserid, CURRENT_TIMESTAMP,
                v_strmuserid, v_dtpmuserdate
            );
        END IF;
    END IF;
END;
$BODY$;
ALTER PROCEDURE dbo.sp_pagepi(character varying, character varying, character varying, character varying, character varying, character varying, character varying, timestamp without time zone, character varying, character varying, character varying, character varying, character varying, character varying, numeric, smallint, character varying, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, character varying, smallint, character varying, character varying)
    OWNER TO postgres;

