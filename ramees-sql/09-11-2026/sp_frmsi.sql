-- PROCEDURE: dbo.sp_frmsi(character varying, character varying, character varying, character varying, character varying, character varying, integer, character varying, character varying, character varying, timestamp without time zone, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, boolean, character varying, numeric, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, smallint, character varying, character varying, character varying, boolean, boolean, timestamp without time zone)

-- DROP PROCEDURE IF EXISTS dbo.sp_frmsi(character varying, character varying, character varying, character varying, character varying, character varying, integer, character varying, character varying, character varying, timestamp without time zone, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, boolean, character varying, numeric, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, smallint, character varying, character varying, character varying, boolean, boolean, timestamp without time zone);

CREATE OR REPLACE PROCEDURE dbo.sp_frmsi(
	IN strmode character varying,
	IN pstrcoid character varying,
	IN pstryear character varying,
	IN strbrid character varying DEFAULT NULL::character varying,
	IN strdoctype character varying DEFAULT NULL::character varying,
	IN strdocno character varying DEFAULT NULL::character varying,
	IN intdocno integer DEFAULT 0,
	IN strinvoicetype character varying DEFAULT NULL::character varying,
	IN dtpdate character varying DEFAULT NULL::character varying,
	IN strdate_h character varying DEFAULT NULL::character varying,
	IN dtpinvoicedate timestamp without time zone DEFAULT NULL::timestamp without time zone,
	IN straccountid character varying DEFAULT NULL::character varying,
	IN straccountname character varying DEFAULT NULL::character varying,
	IN straddress1 character varying DEFAULT NULL::character varying,
	IN strvatno character varying DEFAULT NULL::character varying,
	IN strphone character varying DEFAULT NULL::character varying,
	IN strcustref character varying DEFAULT NULL::character varying,
	IN strcustpricelevel character varying DEFAULT NULL::character varying,
	IN stritempricelevel character varying DEFAULT NULL::character varying,
	IN strqtnno character varying DEFAULT NULL::character varying,
	IN strnote character varying DEFAULT NULL::character varying,
	IN strdnno character varying DEFAULT NULL::character varying,
	IN intslno smallint DEFAULT 0,
	IN blnchecked boolean DEFAULT false,
	IN stritemid character varying DEFAULT NULL::character varying,
	IN numqtyout numeric DEFAULT 0,
	IN strunit character varying DEFAULT NULL::character varying,
	IN numunitprice numeric DEFAULT 0,
	IN numnetunitprice numeric DEFAULT 0,
	IN numitemdiscamt numeric DEFAULT 0,
	IN numitemvatamt numeric DEFAULT 0,
	IN numtotalprice numeric DEFAULT 0,
	IN numtotalpricev numeric DEFAULT 0,
	IN numtotalpriceexclvat numeric DEFAULT 0,
	IN numunitcost numeric DEFAULT 0,
	IN numtotalcost numeric DEFAULT 0,
	IN strdisctype character varying DEFAULT NULL::character varying,
	IN numdiscper numeric DEFAULT 0,
	IN numdiscamt numeric DEFAULT 0,
	IN numdiscamtvat numeric DEFAULT 0,
	IN numdiscamtaftvat numeric DEFAULT 0,
	IN numdocamt numeric DEFAULT 0,
	IN numnetdocamtwovat numeric DEFAULT 0,
	IN numvatper numeric DEFAULT 0,
	IN numvatamt numeric DEFAULT 0,
	IN numnetdocamt numeric DEFAULT 0,
	IN numpaidamt numeric DEFAULT 0,
	IN numpendingamt numeric DEFAULT 0,
	IN numcostofsaleamt numeric DEFAULT 0,
	IN numtotitemdiscamt numeric DEFAULT 0,
	IN numnetitemdiscamt numeric DEFAULT 0,
	IN original_fslno smallint DEFAULT 0,
	IN dtpcreatedinvuserdate character varying DEFAULT NULL::character varying,
	IN pstruserid character varying DEFAULT NULL::character varying,
	IN strmenuname character varying DEFAULT NULL::character varying,
	IN blnupdate20211128 boolean DEFAULT false,
	IN blnupdate20220129 boolean DEFAULT false,
	IN dtpuserdate timestamp without time zone DEFAULT NULL::timestamp without time zone)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_strdescription varchar(100);
    v_strcustdescription varchar(100);
    v_strsiaccountid varchar(12);
    v_strcashaccountid varchar(12);
    v_strpendingcashaccountid varchar(12);
    v_strorigin varchar(3) := 'GS';
    v_intslno integer := 0;
    v_strccid varchar(8);
    v_straccountid varchar(12);

    v_numdebit numeric(18,2);
    v_numcredit numeric(18,2);

    v_strsuserid varchar(20);
    v_dtpsuserdate timestamp;
    v_strmuserid varchar(20);
    v_dtpmuserdate timestamp;

    v_userdate timestamp;                                        -- NEW

BEGIN

    -- NEW: client system time; server time only as a fallback
    v_userdate := COALESCE(dtpuserdate, CURRENT_TIMESTAMP);

    -- DESCRIPTION
    IF strinvoicetype = 'C' THEN

        IF COALESCE(strphone, '') <> '' THEN
            v_strdescription := straccountname || ' : ' || strphone;
        ELSE
            v_strdescription := straccountname;
        END IF;

    ELSE

        v_strdescription := 'Sales Invoice ' || strdocno;

        IF COALESCE(strnote, '') <> '' THEN
            v_strcustdescription := strnote;
        ELSE
            v_strcustdescription := v_strdescription;
        END IF;

    END IF;

    ----------------------------------------------------------------
    -- S : INSERT SALES INVOICE ITEM
    ----------------------------------------------------------------
    IF strmode = 'S' THEN

        INSERT INTO dbo.tblstocktrans (
            fcoid, fyear, fbrid, fdoctype, fdocno,
            fpisitype, fdate, fcsaccountid, fgaccountid,
            fsqtno, fnote, fslno, fitemid, fqtyout,
            funit, funitprice, fnetunitprice,
            funitdiscamt, fitemvatamt, ftotalprice,
            ftotalpriceexclvat, funitcost, ftotalcost,
            fdisctype, fdiscper, fdiscamt, fdiscamtvat, fdiscamtaftvat,
            fdocamt, fnetdocamt, fpaidamt, fnetdocamtwovat,
            fvatper, fvatamt, forigin, fcuserid, fcuserdate,
            ftotitemdiscamt, fnetitemdiscamt
        )
        VALUES (
            pstrcoid, pstryear::integer, strbrid, strdoctype, strdocno,
            strinvoicetype, dtpdate::date, straccountid,
            dbo.getparentcsaccountid(pstrcoid, straccountid),
            strqtnno, strnote, intslno, stritemid,
            COALESCE(numqtyout, 0),
            strunit, COALESCE(numunitprice, 0),
            COALESCE(numnetunitprice, 0),
            COALESCE(numitemdiscamt, 0),
            COALESCE(numitemvatamt, 0),
            COALESCE(numtotalprice, 0),
            COALESCE(numtotalpriceexclvat, 0),
            COALESCE(numunitcost, 0),
            COALESCE(numtotalcost, 0),
            strdisctype,
            COALESCE(numdiscper, 0),
            COALESCE(numdiscamt, 0),
            COALESCE(numdiscamtvat, 0),
            COALESCE(numdiscamtaftvat, 0),
            COALESCE(numdocamt, 0),
            COALESCE(numnetdocamt, 0),
            COALESCE(numpaidamt, 0),
            COALESCE(numnetdocamtwovat, 0),
            COALESCE(numvatper, 0),
            COALESCE(numvatamt, 0),
            'UI', pstruserid, v_userdate,                        -- CHANGED
            COALESCE(numtotitemdiscamt, 0),
            COALESCE(numnetitemdiscamt, 0)
        );

    END IF;

    ----------------------------------------------------------------
    -- SD : SAVE DELIVERY NOTE DATA
    ----------------------------------------------------------------
    IF strmode = 'SD' THEN

        INSERT INTO dbo.tblstocktransdo (
            fcoid, fbrid, fdoctype, fdocno,
            faccountid, fslno, fdnno, fchecked,
            fuserid, fuserdate
        )
        VALUES (
            pstrcoid, strbrid, strdoctype, strdocno,
            straccountid, intslno, strdnno, blnchecked,
            pstruserid, v_userdate                               -- CHANGED
        );

    END IF;

    ----------------------------------------------------------------
    -- M : MODIFY SALES INVOICE HEADER
    ----------------------------------------------------------------
    IF strmode = 'M' THEN

        v_strmuserid := pstruserid;
        v_dtpmuserdate := v_userdate;                            -- CHANGED

        SELECT st.fcuserid, st.fcuserdate
          INTO v_strsuserid, v_dtpsuserdate
          FROM dbo.tblstocktrans st
         WHERE st.fcoid = pstrcoid
           AND st.fyear::text = pstryear
           AND st.fbrid = strbrid
           AND st.fdoctype = strdoctype
           AND st.fdocno = strdocno
         LIMIT 1;

        UPDATE dbo.tblstocktrans
           SET fbrid = strbrid,
               fdate = dtpdate::date,
               fcsaccountid = straccountid,
               fsqtno = strqtnno,
               fnote = strnote,
               fdisctype = strdisctype,
               fdiscper = COALESCE(numdiscper, 0),
               fdiscamt = COALESCE(numdiscamt, 0),
               fdiscamtvat = COALESCE(numdiscamtvat, 0),
               fdiscamtaftvat = COALESCE(numdiscamtaftvat, 0),
               fdocamt = COALESCE(numdocamt, 0),
               fnetdocamt = COALESCE(numnetdocamt, 0),
               fpaidamt = COALESCE(numpaidamt, 0),
               fnetdocamtwovat = COALESCE(numnetdocamtwovat, 0),
               fvatper = COALESCE(numvatper, 0),
               fvatamt = COALESCE(numvatamt, 0),
               fnetitemdiscamt = COALESCE(numnetitemdiscamt, 0),
               ftotalpriceexclvat = COALESCE(numtotalpriceexclvat, 0),
               fmuserid = v_strmuserid,
               fmuserdate = v_dtpmuserdate
         WHERE fcoid = pstrcoid
           AND fyear::text = pstryear
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno;

    END IF;

    ----------------------------------------------------------------
    -- M1 : MODIFY SALES INVOICE ITEM
    ----------------------------------------------------------------
    IF strmode = 'M1' THEN

        UPDATE dbo.tblstocktrans
           SET fslno = intslno,
               fitemid = stritemid,
               fqtyout = COALESCE(numqtyout, 0),
               funit = strunit,
               funitprice = COALESCE(numunitprice, 0),
               fnetunitprice = COALESCE(numnetunitprice, 0),
               funitdiscamt = COALESCE(numitemdiscamt, 0),
               ftotalprice = COALESCE(numtotalprice, 0),
               fitemvatamt = COALESCE(numitemvatamt, 0),
               funitcost = COALESCE(numunitcost, 0),
               ftotalpriceexclvat = COALESCE(numtotalpriceexclvat, 0),
               ftotalcost = COALESCE(numtotalcost, 0),
               fnetitemdiscamt = COALESCE(numnetitemdiscamt, 0),
               ftotitemdiscamt = COALESCE(numtotitemdiscamt, 0)
         WHERE fcoid = pstrcoid
           AND fyear::text = pstryear
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno
           AND fslno = original_fslno;

    END IF;

    ----------------------------------------------------------------
    -- D1 : DELETE INVOICE ITEM
    ----------------------------------------------------------------
    IF strmode = 'D1' THEN

        DELETE FROM dbo.tblstocktrans
         WHERE fcoid = pstrcoid
           AND fyear::text = pstryear
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno
           AND fslno = original_fslno;

    END IF;

    ----------------------------------------------------------------
    -- DD : DELETE DELIVERY NOTE DETAILS
    ----------------------------------------------------------------
    IF strmode = 'DD' THEN

        DELETE FROM dbo.tblstocktransdo
         WHERE fcoid = pstrcoid
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno;

    END IF;

    ----------------------------------------------------------------
    -- D : DELETE COMPLETE SALES INVOICE
    ----------------------------------------------------------------
    IF strmode = 'D' THEN

        DELETE FROM dbo.tblstocktrans
         WHERE fcoid = pstrcoid
           AND fyear::text = pstryear
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno;

        DELETE FROM dbo.tblstocktransdo
         WHERE fcoid = pstrcoid
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno;

        DELETE FROM dbo.tblfintrans
         WHERE fcoid = pstrcoid
           AND fyear::text = pstryear
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno;

        DELETE FROM dbo.tblarap
         WHERE fcoid = pstrcoid
           AND fyear::text = pstryear
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno;

    END IF;

    ----------------------------------------------------------------
    -- S / M : FINANCIAL TRANSACTION AND AR/AP GENERATION
    ----------------------------------------------------------------
    IF strmode IN ('S', 'M') THEN

        DELETE FROM dbo.tblfintrans
         WHERE fcoid = pstrcoid
           AND fyear::text = pstryear
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno;

        DELETE FROM dbo.tblarap
         WHERE fcoid = pstrcoid
           AND fyear::text = pstryear
           AND fbrid = strbrid
           AND fdoctype = strdoctype
           AND fdocno = strdocno;

        IF numnetdocamt <> 0 THEN

            v_intslno := 0;

            --------------------------------------------------------
            -- CASH INVOICE
            --------------------------------------------------------
            IF strinvoicetype = 'C' THEN

                -- PAID AMOUNT
                IF numpaidamt <> 0 THEN

                    v_intslno := v_intslno + 1;

                    SELECT dbo.getcashaccountid(pstrcoid, strbrid)
                      INTO v_strcashaccountid;

                    IF dbo.isincome(pstrcoid, v_strcashaccountid)::int = 1 THEN
                        v_strccid := strbrid;
                    ELSE
                        v_strccid := '';
                    END IF;

                    INSERT INTO dbo.tblfintrans (
                        fcoid, fyear, fbrid, fdoctype,
                        fdocno, fdate, fdescription,
                        fslno, faccountid, fccid, fdebit,
                        fcredit, fpost, fyearclose, forigin,
                        fcuserid, fcuserdate,
                        fmuserid, fmuserdate
                    )
                    VALUES (
                        pstrcoid, pstryear::integer, strbrid, strdoctype,
                        strdocno, dtpdate::date, v_strdescription,
                        v_intslno, v_strcashaccountid, v_strccid,
                        COALESCE(numpaidamt, 0), 0, false, false, v_strorigin,
                        pstruserid, v_userdate,                  -- CHANGED
                        v_strmuserid, v_dtpmuserdate
                    );

                END IF;

                -- PENDING AMOUNT
                IF numpendingamt <> 0 THEN

                    SELECT dbo.getpendingcashaccountid(pstrcoid, strbrid)
                      INTO v_strpendingcashaccountid;

                    IF dbo.isincome(pstrcoid, v_strpendingcashaccountid)::int = 1 THEN
                        v_strccid := strbrid;
                    ELSE
                        v_strccid := '';
                    END IF;

                    IF dbo.isar(pstrcoid, v_strpendingcashaccountid)::int = 1 THEN

                        INSERT INTO dbo.tblarap (
                            fcoid, fyear, fbrid, fdoctype,
                            fdocno, fdate, fdescription,
                            fslno, faccountid, fdebit, fcredit,
                            fdocamt, fpost, fstatus,
                            fcuserid, fcuserdate,
                            fmuserid, fmuserdate
                        )
                        VALUES (
                            pstrcoid, pstryear::integer, strbrid, strdoctype,
                            strdocno, dtpdate::date, v_strdescription,
                            v_intslno, v_strpendingcashaccountid,
                            COALESCE(numpendingamt, 0), 0,
                            COALESCE(numpendingamt, 0), false, 'N',
                            pstruserid, v_userdate,              -- CHANGED
                            v_strmuserid, v_dtpmuserdate
                        );

                    END IF;

                    v_intslno := v_intslno + 1;

                    INSERT INTO dbo.tblfintrans (
                        fcoid, fyear, fbrid, fdoctype,
                        fdocno, fdate, fdescription,
                        fslno, faccountid, fccid, fdebit,
                        fcredit, fpost, fyearclose, forigin,
                        fcuserid, fcuserdate,
                        fmuserid, fmuserdate
                    )
                    VALUES (
                        pstrcoid, pstryear::integer, strbrid, strdoctype,
                        strdocno, dtpdate::date, v_strdescription,
                        v_intslno, v_strpendingcashaccountid, v_strccid,
                        COALESCE(numpendingamt, 0), 0, false, false, v_strorigin,
                        pstruserid, v_userdate,                  -- CHANGED
                        v_strmuserid, v_dtpmuserdate
                    );

                END IF;

                -- SALES ACCOUNT
                v_intslno := v_intslno + 1;

                SELECT dbo.getsalesaccountid(pstrcoid, strbrid)
                  INTO v_strsiaccountid;

                IF dbo.isincome(pstrcoid, v_strsiaccountid)::int = 1 THEN
                    v_strccid := strbrid;
                ELSE
                    v_strccid := '';
                END IF;

                INSERT INTO dbo.tblfintrans (
                    fcoid, fyear, fbrid, fdoctype,
                    fdocno, fdate, fdescription,
                    fslno, faccountid, fccid, fdebit,
                    fcredit, fpost, fyearclose, forigin,
                    fcuserid, fcuserdate,
                    fmuserid, fmuserdate
                )
                VALUES (
                    pstrcoid, pstryear::integer, strbrid, strdoctype,
                    strdocno, dtpdate::date, v_strdescription,
                    v_intslno, v_strsiaccountid, v_strccid, 0,
                    COALESCE(numnetdocamtwovat, 0), false, false, v_strorigin,
                    pstruserid, v_userdate,                      -- CHANGED
                    v_strmuserid, v_dtpmuserdate
                );

            --------------------------------------------------------
            -- CREDIT INVOICE
            --------------------------------------------------------
            ELSE

                v_intslno := v_intslno + 1;

                IF dbo.isincome(pstrcoid, straccountid)::int = 1 THEN
                    v_strccid := strbrid;
                ELSE
                    v_strccid := '';
                END IF;

                INSERT INTO dbo.tblfintrans (
                    fcoid, fyear, fbrid, fdoctype,
                    fdocno, fdate, fdescription,
                    fslno, faccountid, fccid, fdebit,
                    fcredit, fpost, fyearclose, forigin,
                    fcuserid, fcuserdate,
                    fmuserid, fmuserdate
                )
                VALUES (
                    pstrcoid, pstryear::integer, strbrid, strdoctype,
                    strdocno, dtpdate::date, v_strcustdescription,
                    v_intslno, straccountid, v_strccid,
                    COALESCE(numnetdocamt, 0), 0, false, false, v_strorigin,
                    pstruserid, v_userdate,                      -- CHANGED
                    v_strmuserid, v_dtpmuserdate
                );

                -- AR/AP
                IF dbo.isar(pstrcoid, straccountid)::int = 1 THEN

                    INSERT INTO dbo.tblarap (
                        fcoid, fyear, fbrid, fdoctype,
                        fdocno, fdate, fdescription,
                        fslno, faccountid, fdebit, fcredit,
                        fdocamt, fpost, fstatus,
                        fcuserid, fcuserdate,
                        fmuserid, fmuserdate
                    )
                    VALUES (
                        pstrcoid, pstryear::integer, strbrid, strdoctype,
                        strdocno, dtpdate::date, v_strcustdescription,
                        v_intslno, straccountid,
                        COALESCE(numnetdocamt, 0), 0,
                        COALESCE(numnetdocamt, 0), false, 'N',
                        pstruserid, v_userdate,                  -- CHANGED
                        v_strmuserid, v_dtpmuserdate
                    );

                END IF;

                -- SALES ACCOUNT
                SELECT dbo.getsalesaccountid(pstrcoid, strbrid)
                  INTO v_strsiaccountid;

                IF dbo.isincome(pstrcoid, v_strsiaccountid)::int = 1 THEN
                    v_strccid := strbrid;
                ELSE
                    v_strccid := '';
                END IF;

                v_intslno := v_intslno + 1;

                INSERT INTO dbo.tblfintrans (
                    fcoid, fyear, fbrid, fdoctype,
                    fdocno, fdate, fdescription,
                    fslno, faccountid, fccid, fdebit,
                    fcredit, fpost, fyearclose, forigin,
                    fcuserid, fcuserdate,
                    fmuserid, fmuserdate
                )
                VALUES (
                    pstrcoid, pstryear::integer, strbrid, strdoctype,
                    strdocno, dtpdate::date, v_strdescription,
                    v_intslno, v_strsiaccountid, v_strccid, 0,
                    COALESCE(numnetdocamtwovat, 0), false, false, v_strorigin,
                    pstruserid, v_userdate,                      -- CHANGED
                    v_strmuserid, v_dtpmuserdate
                );

            END IF;

            --------------------------------------------------------
            -- VAT ENTRY (COMMON FOR CASH AND CREDIT)
            --------------------------------------------------------
            IF numvatamt <> 0 THEN

                v_intslno := v_intslno + 1;

                v_straccountid := dbo.getsalesvataccountid(pstrcoid);

                IF dbo.isincome(pstrcoid, v_straccountid)::int = 1 THEN
                    v_strccid := strbrid;
                ELSE
                    v_strccid := '';
                END IF;

                v_numdebit := 0;
                v_numcredit := numvatamt;

                INSERT INTO dbo.tblfintrans (
                    fcoid, fyear, fbrid, fdoctype,
                    fdocno, fslno, fdate,
                    faccountid, fccid, fdescription,
                    fdebit, fcredit, fpost, fyearclose,
                    forigin, fcuserid, fcuserdate
                )
                VALUES (
                    pstrcoid, pstryear::integer, strbrid, strdoctype,
                    strdocno, v_intslno, dtpdate::date,
                    v_straccountid, v_strccid, v_strdescription,
                    COALESCE(v_numdebit, 0),
                    COALESCE(v_numcredit, 0),
                    false, false, v_strorigin,
                    pstruserid, v_userdate                       -- CHANGED
                );

            END IF;

        END IF;

    END IF;

END;
$BODY$;
ALTER PROCEDURE dbo.sp_frmsi(character varying, character varying, character varying, character varying, character varying, character varying, integer, character varying, character varying, character varying, timestamp without time zone, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, smallint, boolean, character varying, numeric, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, smallint, character varying, character varying, character varying, boolean, boolean, timestamp without time zone)
    OWNER TO postgres;

