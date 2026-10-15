
-- tblstocktrans.fyear is varchar(4) now (like tblstockcontrol.fyear): the year argument is
-- TEXT, p_pstryear (it was a smallint, p_pintyear), and is compared with the year columns
-- as it is. The DROP below removes the smallint version.

DROP PROCEDURE IF EXISTS dbo.sp_pagestocktransferpost(character varying, character varying, smallint, character varying, character varying, character varying, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_pagestocktransferpost(
    IN p_strmode    varchar(1),
    IN p_pstrcoid   varchar(3),
    IN p_pstryear   varchar(4),
    IN p_strbrid    varchar(3),
    IN p_strdoctype varchar(5),
    IN p_strdocno   varchar(15),
    IN p_gstruserid varchar(20) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_stryear           varchar(4) := p_pstryear;   -- the year is text (tblstockcontrol and tblstocktrans)
    v_strdoctypeg       varchar(5) := 'STI';
    v_intslno           smallint;
    v_strtobrid         varchar(3);
    v_stritemid         varchar(40);
    v_numqtyout         numeric(18,3);
    v_numstock          numeric(18,3);
    v_numoldunitcost    numeric(18,4);
    v_numnewunitcost    numeric(18,4);
    v_numcalcunitcost   numeric(18,4);
    v_numcostofstock    numeric(18,4) := 0;
    v_intlines          integer := 0;
    v_row               record;
BEGIN
    IF upper(p_strdoctype) <> 'ST' THEN
        RAISE EXCEPTION 'sp_pagestocktransferpost supports document type ST only';
    END IF;

    IF upper(p_strmode) <> 'P' THEN
        RAISE EXCEPTION 'Invalid mode %. Only P (post) is supported', p_strmode;
    END IF;

    FOR v_row IN
        SELECT st.fslno,
               st.fitemid,
               st.fsttobrid,
               COALESCE(st.fqtyout, 0) AS qtyout
        FROM dbo.tblstocktrans st
        WHERE st.fcoid    = p_pstrcoid
          AND st.fyear    = p_pstryear
          AND st.fbrid    = p_strbrid
          AND st.fdoctype = p_strdoctype
          AND st.fdocno   = p_strdocno
          AND COALESCE(st.fpost, false) = false
        ORDER BY st.fslno
    LOOP
        v_intslno   := v_row.fslno;
        v_stritemid := v_row.fitemid;
        v_strtobrid := v_row.fsttobrid;
        v_numqtyout := v_row.qtyout;
        v_intlines  := v_intlines + 1;

        -- 1. the From branch's stock row, and its current unit cost
        INSERT INTO dbo.tblstockcontrol (fcoid, fyear, fbrid, fitemid, fcuserid, fcuserdate)
        SELECT p_pstrcoid, v_stryear, p_strbrid, v_stritemid, p_gstruserid, now()
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.tblstockcontrol
            WHERE fcoid = p_pstrcoid AND fyear = v_stryear
              AND fbrid = p_strbrid AND fitemid = v_stritemid
        );

        SELECT COALESCE(sc.funitcost, 0)
          INTO v_numnewunitcost
          FROM dbo.tblstockcontrol sc
         WHERE sc.fcoid   = p_pstrcoid
           AND sc.fyear   = v_stryear
           AND sc.fbrid   = p_strbrid
           AND sc.fitemid = v_stritemid;

        -- 2. the cost and the total on the ST row ...
        UPDATE dbo.tblstocktrans
           SET funitcost  = v_numnewunitcost,
               ftotalcost = v_numqtyout * v_numnewunitcost
         WHERE fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fbrid    = p_strbrid
           AND fdoctype = p_strdoctype
           AND fdocno   = p_strdocno
           AND fslno    = v_intslno;

        -- ... and on the STI row of the To branch
        UPDATE dbo.tblstocktrans
           SET funitcost  = v_numnewunitcost,
               ftotalcost = v_numqtyout * v_numnewunitcost
         WHERE fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fbrid    = v_strtobrid
           AND fdoctype = v_strdoctypeg
           AND fdocno   = p_strdocno
           AND fslno    = v_intslno;

        -- 3. the From branch's stock goes down
        UPDATE dbo.tblstockcontrol
           SET fstock = COALESCE(fstock, 0) - v_numqtyout
         WHERE fcoid   = p_pstrcoid
           AND fyear   = v_stryear
           AND fbrid   = p_strbrid
           AND fitemid = v_stritemid;

        -- 4. the To branch's stock row, its previous values, the average cost, the stock
        INSERT INTO dbo.tblstockcontrol (fcoid, fyear, fbrid, fitemid, funitcost, fcuserid, fcuserdate)
        SELECT p_pstrcoid, v_stryear, v_strtobrid, v_stritemid, 0, p_gstruserid, now()
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.tblstockcontrol
            WHERE fcoid = p_pstrcoid AND fyear = v_stryear
              AND fbrid = v_strtobrid AND fitemid = v_stritemid
        );

        SELECT COALESCE(sc.fstock, 0),
               COALESCE(sc.funitcost, 0)
          INTO v_numstock, v_numoldunitcost
          FROM dbo.tblstockcontrol sc
         WHERE sc.fcoid   = p_pstrcoid
           AND sc.fyear   = v_stryear
           AND sc.fbrid   = v_strtobrid
           AND sc.fitemid = v_stritemid;

        IF v_numstock < 0 THEN
            v_numstock := 0;
        END IF;

        UPDATE dbo.tblstockcontrol
           SET fpreviousunitcost = COALESCE(funitcost, 0),
               fpreviousstock    = COALESCE(fstock, 0)
         WHERE fcoid   = p_pstrcoid
           AND fyear   = v_stryear
           AND fbrid   = v_strtobrid
           AND fitemid = v_stritemid;

        -- (for the finance lines: the cost of everything transferred)
        v_numcostofstock := v_numcostofstock + (v_numqtyout * v_numnewunitcost);

        IF v_numqtyout <> 0 THEN
            v_numcalcunitcost :=
                ((v_numstock * v_numoldunitcost) + (v_numqtyout * v_numnewunitcost))
                / NULLIF(v_numstock + v_numqtyout, 0);

            UPDATE dbo.tblstockcontrol
               SET funitcost = COALESCE(v_numcalcunitcost, 0),
                   fstock    = COALESCE(fstock, 0) + v_numqtyout
             WHERE fcoid   = p_pstrcoid
               AND fyear   = v_stryear
               AND fbrid   = v_strtobrid
               AND fitemid = v_stritemid;
        END IF;
    END LOOP;

    -- nothing to post (wrong number, or already posted)
    IF v_intlines = 0 THEN
        RAISE EXCEPTION
            'No eligible stock transactions found for company %, year %, branch %, document type %, document number %',
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno;
    END IF;

    -- 5. both sets of rows are posted
    UPDATE dbo.tblstocktrans
       SET fpost = true
           -- , fpostorder = v_intpostorder, fpostorderc = v_intpostorder   (no such columns)
     WHERE fcoid   = p_pstrcoid
       AND fyear   = p_pstryear
       AND fstbrid = p_strbrid
       AND (fdoctype = p_strdoctype OR fdoctype = v_strdoctypeg)
       AND fdocno  = p_strdocno;

    /* -------------------------------------------------------------------
       THE FINANCE LINES of sp_stpost (not on yet - see the notes above):

       v_strstockfrombraccountid := dbo.getstockaccountid(p_pstrcoid, p_strbrid);
       v_strstocktobraccountid   := dbo.getstockaccountid(p_pstrcoid, v_strtobrid);
       v_strdescription := <From branch name> || ' To ' || <To branch name>;

       DELETE FROM dbo.tblfintrans WHERE fcoid, fyear (text), fbrid = p_strbrid,
              fdoctype = p_strdoctype, fdocno = p_strdocno;

       INSERT INTO dbo.tblfintrans (..., fslno 1, faccountid = From stock account,
              fdebit 0, fcredit = v_numcostofstock, fpost false, forigin 'GP', ...);
       INSERT INTO dbo.tblfintrans (..., fslno 2, faccountid = To stock account,
              fdebit = v_numcostofstock, fcredit 0, fpost false, forigin 'GP', ...);

       UPDATE dbo.tblfintrans SET fpost = true WHERE ... (both doc types)
       (tblfintrans has no fintdocno, fsuserid, fsuserdate or fpostorder: use
        fcuserid / fcuserdate and leave the others out)
       ------------------------------------------------------------------- */
END;
$$;
