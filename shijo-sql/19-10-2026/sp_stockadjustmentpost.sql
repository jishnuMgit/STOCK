-- PROCEDURE: dbo.sp_pagestockadjustmentpost(character varying, character varying, character varying, character varying, character varying, character varying, character varying)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagestockadjustmentpost(character varying, character varying, character varying, character varying, character varying, character varying, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_pagestockadjustmentpost(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_pstryear character varying,
	IN p_strbrid character varying,
	IN p_strdoctype character varying,
	IN p_strdocno character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_dtpdate           timestamp without time zone;
    v_stryear           varchar(4);          -- the year of the document's date (finance lines)
    v_stritemid         varchar(40);
    v_numqtyin          numeric(18,3);
    v_numqtyout         numeric(18,3);
    v_numunitcost       numeric(18,4);
    v_numcostofstock    numeric(18,4) := 0;
    v_strstockaccountid varchar(12);
    v_stradjaccountid   varchar(12);
    v_strccid           varchar(8);
    v_strdescription    varchar(100);
    v_strpostingtransno varchar(9);          -- the posting transaction number
    v_intlines          integer := 0;
    v_row               record;
BEGIN
    IF upper(p_strdoctype) <> 'ADJ' THEN
        RAISE EXCEPTION 'sp_pagestockadjustmentpost supports document type ADJ only';
    END IF;

    IF upper(p_strmode) <> 'P' THEN
        RAISE EXCEPTION 'Invalid mode %. Only P (post) is supported', p_strmode;
    END IF;

    -- the branch's accounts first: without them nothing is posted
    v_strstockaccountid := dbo.getstockaccountid(p_pstrcoid, p_strbrid);
    v_stradjaccountid   := dbo.getstockadjaccountid(p_pstrcoid, p_strbrid);

    IF COALESCE(v_strstockaccountid, '') = '' THEN
        RAISE EXCEPTION 'The Stock Account of the Branch % is not set (Set Posting Account)', p_strbrid;
    END IF;

    IF COALESCE(v_stradjaccountid, '') = '' THEN
        RAISE EXCEPTION 'The Stock Adjustment Account of the Branch % is not set (Set Posting Account)', p_strbrid;
    END IF;

    FOR v_row IN
        SELECT t.fslno,
               t.fdate,
               t.fitemid,
               COALESCE(t.fqtyin, 0)  AS qtyin,
               COALESCE(t.fqtyout, 0) AS qtyout
        FROM dbo.tblstocktrans t
        WHERE t.fcoid    = p_pstrcoid
          AND t.fyear    = p_pstryear
          AND t.fbrid    = p_strbrid
          AND t.fdoctype = p_strdoctype
          AND t.fdocno   = p_strdocno
          AND COALESCE(t.fpost, false) = false
        ORDER BY t.fslno
    LOOP
        v_dtpdate     := v_row.fdate;
        v_stritemid   := v_row.fitemid;
        v_numqtyin    := v_row.qtyin;
        v_numqtyout   := v_row.qtyout;
        v_intlines    := v_intlines + 1;

        -- 1. the stock row of the branch, when missing
        INSERT INTO dbo.tblstockcontrol (fcoid, fyear, fbrid, fitemid, fcuserid, fcuserdate)
        SELECT p_pstrcoid, p_pstryear, p_strbrid, v_stritemid, p_pstruserid, now()
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.tblstockcontrol
            WHERE fcoid = p_pstrcoid AND fyear = p_pstryear
              AND fbrid = p_strbrid AND fitemid = v_stritemid
        );

        -- 2. the unit cost of the branch, written onto the line
        SELECT COALESCE(sc.funitcost, 0)
          INTO v_numunitcost
          FROM dbo.tblstockcontrol sc
         WHERE sc.fcoid   = p_pstrcoid
           AND sc.fyear   = p_pstryear
           AND sc.fbrid   = p_strbrid
           AND sc.fitemid = v_stritemid;

        UPDATE dbo.tblstocktrans
           SET funitcost  = v_numunitcost,
               ftotalcost = (v_numqtyin - v_numqtyout) * v_numunitcost
         WHERE fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fbrid    = p_strbrid
           AND fdoctype = p_strdoctype
           AND fdocno   = p_strdocno
           AND fslno    = v_row.fslno;

        -- 3. the cost of everything adjusted (for the finance lines)
        v_numcostofstock := v_numcostofstock + ((v_numqtyout - v_numqtyin) * v_numunitcost);

        -- 4. the stock the item had before this line is kept, then the stock moves;
        --    the cost stays
        UPDATE dbo.tblstockcontrol
           SET fpreviousstock = COALESCE(fstock, 0)
         WHERE fcoid   = p_pstrcoid
           AND fyear   = p_pstryear
           AND fbrid   = p_strbrid
           AND fitemid = v_stritemid;

        UPDATE dbo.tblstockcontrol
           SET fstock = COALESCE(fstock, 0) + (v_numqtyin - v_numqtyout)
         WHERE fcoid   = p_pstrcoid
           AND fyear   = p_pstryear
           AND fbrid   = p_strbrid
           AND fitemid = v_stritemid;
    END LOOP;

    -- nothing to post (wrong number, or already posted)
    IF v_intlines = 0 THEN
        RAISE EXCEPTION
            'No eligible stock transactions found for company %, year %, branch %, document type %, document number %',
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno;
    END IF;

    -- the finance lines
    v_stryear        := to_char(v_dtpdate, 'YYYY');
    v_strdescription := 'Stock Adjustment ' || p_strdocno;

    -- line 1: the stock account
    IF dbo.isincomeorexpense(p_pstrcoid, v_strstockaccountid) THEN
        v_strccid := p_strbrid;
    ELSE
        v_strccid := '';
    END IF;

    INSERT INTO dbo.tblfintrans (
        fcoid, fyear, fbrid, fdoctype, fdocno, fdate, fdescription, fslno,
        faccountid,fgaccountid, fccid, fdebit, fcredit, fpost, forigin, fyearclose,
        fcuserid, fcuserdate
    )
    VALUES (
        p_pstrcoid, v_stryear, p_strbrid, p_strdoctype, p_strdocno, v_dtpdate, v_strdescription, 1,
        v_strstockaccountid,dbo.getgaccountid(p_pstrcoid,v_strstockaccountid), v_strccid,
        CASE WHEN v_numcostofstock < 0 THEN COALESCE(ABS(v_numcostofstock), 0) ELSE 0 END,
        CASE WHEN v_numcostofstock < 0 THEN 0 ELSE COALESCE(v_numcostofstock, 0) END,
        true, 'GP', false,
        p_pstruserid, now()
    );

    -- line 2: the stock adjustment account (the opposite side)
    IF dbo.isincomeorexpense(p_pstrcoid, v_stradjaccountid) THEN
        v_strccid := p_strbrid;
    ELSE
        v_strccid := '';
    END IF;

    INSERT INTO dbo.tblfintrans (
        fcoid, fyear, fbrid, fdoctype, fdocno, fdate, fdescription, fslno,
        faccountid,fgaccountid, fccid, fdebit, fcredit, fpost, forigin, fyearclose,
        fcuserid, fcuserdate
    )
    VALUES (
        p_pstrcoid, v_stryear, p_strbrid, p_strdoctype, p_strdocno, v_dtpdate, v_strdescription, 2,
        v_stradjaccountid,dbo.getgaccountid(p_pstrcoid,v_stradjaccountid), v_strccid,
        CASE WHEN v_numcostofstock < 0 THEN 0 ELSE COALESCE(v_numcostofstock, 0) END,
        CASE WHEN v_numcostofstock < 0 THEN COALESCE(ABS(v_numcostofstock), 0) ELSE 0 END,
        true, 'GP', false,
        p_pstruserid, now()
    );

    -- the posting transaction number: one for the whole document
    v_strpostingtransno := dbo.getnexttransno(p_pstrcoid, p_pstryear, p_strbrid, 'P');

    -- every line is posted
    UPDATE dbo.tblstocktrans
       SET fpost = true,
           fpostingtransno = COALESCE(fpostingtransno, v_strpostingtransno)
     WHERE fcoid    = p_pstrcoid
       AND fyear    = p_pstryear
       AND fbrid    = p_strbrid
       AND fdoctype = p_strdoctype
       AND fdocno   = p_strdocno;
END;
$BODY$;
ALTER PROCEDURE dbo.sp_pagestockadjustmentpost(character varying, character varying, character varying, character varying, character varying, character varying, character varying)
    OWNER TO postgres;

