-- =====================================================================
-- dbo.sp_pagestocktransferpost   (Stock Transfer - Post, with the finance lines)
--
-- Postgres port of the SQL Server SP_STPostNew. The version before this one (stock only,
-- the finance lines kept as a comment) is in old/sp_pagestocktransferpost_before_finance.sql.
--
-- For every ST line that is not posted yet (in Sl.# order):
--   1. the From branch's tblstockcontrol row is made when missing; its unit cost is read;
--   2. that cost and the total (qty out x cost) are written on the ST row and on the STI
--      row of the To branch;
--   3. the From branch's stock goes DOWN (its cost is not changed);
--   4. the To branch's stock row is made when missing; its previous stock and cost are
--      saved; the new average cost is
--        (To stock x To cost + qty x From cost) / (To stock + qty)
--      (a negative To stock counts as 0) and its stock goes UP;
--   5. the cost of everything transferred is added up.
--
-- Then the finance lines (tblfintrans, forigin 'GP', posted, description
-- '<From branch name> To <To branch name>'), after the document's old finance rows are
-- deleted:
--   line 1  the From branch's stock account   CREDIT the cost of everything transferred
--   line 2  the To branch's stock account     DEBIT  the same amount
--   fccid   the From branch when the account is an income / expense account
--           (dbo.isincomeorexpense), otherwise blank - as in the original
--   Both rows are inserted unposted and then marked posted, as the original does.
--
-- Last, both sets of rows (ST and STI) are marked posted and get the POSTING transaction
-- number (fpostingno): one number for the whole document, from
-- dbo.getnexttransno(co, year, From branch, 'P'); a row that already has one keeps it.
-- This replaces the original's fPostOrder / dbo.getnextpostorder (no such columns).
--
-- Modes (p_strmode)
--   P  Post   the lines not posted yet
--   R  Re-post the original treats ANY mode other than P as a re-post: the lines that ARE
--             posted are worked out again and the finance amounts of the document are updated
--             (no finance rows are made). No screen calls it yet (the page only posts).
--
-- Differences from the SQL Server procedure - all forced by our tables, or for safety:
--   * @gintYear is TEXT here (p_pstryear): the year columns are varchar(4).
--   * fIntDocNo, fPostOrder / fPostOrderC, fSUserID / fSUserDate do not exist:
--     fcuserid / fcuserdate are used on the finance rows; the cursor is ordered by fSlNo.
--   * the user argument is p_pstruserid (it was @gstrUserID / p_gstruserid).
--   * dbo.IsStockItemExist becomes an INSERT ... WHERE NOT EXISTS.
--   * NEW CHECK (not in the original): when the From or the To branch has no stock account
--     (Set Posting Account) the post stops with a message and nothing changes, instead of
--     writing finance rows with an empty account.
--   * the quantity variables are numeric(18,3) (the original had 18,2): the page and the
--     table have 3 decimals.
--
-- Argument names cannot be changed by CREATE OR REPLACE, so the DROPs below remove the earlier
-- versions first.
--
-- Test (rolled back):
--   BEGIN;
--   CALL dbo.sp_pagestocktransferpost('P', '01', '2026', 'JD', 'ST', 'ST0009', 'ADMIN');
--   SELECT * FROM dbo.tblfintrans WHERE fdoctype = 'ST' AND fdocno = 'ST0009';
--   ROLLBACK;
-- =====================================================================

DROP PROCEDURE IF EXISTS dbo.sp_pagestocktransferpost(character varying, character varying, smallint, character varying, character varying, character varying, character varying);

-- ... and the version whose last argument was called p_gstruserid (same types)
DROP PROCEDURE IF EXISTS dbo.sp_pagestocktransferpost(character varying, character varying, character varying, character varying, character varying, character varying, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_pagestocktransferpost(
    IN p_strmode    varchar(1),
    IN p_pstrcoid   varchar(3),
    IN p_pstryear   varchar(4),
    IN p_strbrid    varchar(3),
    IN p_strdoctype varchar(5),
    IN p_strdocno   varchar(15),
    IN p_pstruserid varchar(20) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_stryear           varchar(4) := p_pstryear;   -- the year is text (stock and finance tables)
    v_strdoctypeg       varchar(5) := 'STI';
    v_intslno           smallint;
    v_strtobrid         varchar(3);
    v_stritemid         varchar(40);
    v_dtpdate           timestamp;
    v_numqtyout         numeric(18,3);
    v_numstock          numeric(18,3);
    v_numoldunitcost    numeric(18,4);
    v_numnewunitcost    numeric(18,4);
    v_numcalcunitcost   numeric(18,4);
    v_numcostofstock    numeric(18,4) := 0;
    v_strstockfrombraccountid varchar(12);
    v_strstocktobraccountid   varchar(12);
    v_strfrombrname     varchar(50);
    v_strtobrname       varchar(50);
    v_strdescription    varchar(100);
    v_strccid           varchar(50);
    v_strpostingno varchar(9);      -- the posting transaction number
    v_intlines          integer := 0;
    v_row               record;
BEGIN
    IF upper(p_strdoctype) <> 'ST' THEN
        RAISE EXCEPTION 'sp_pagestocktransferpost supports document type ST only';
    END IF;

    IF upper(p_strmode) NOT IN ('P', 'R') THEN
        RAISE EXCEPTION 'Invalid mode %. Use P (post) or R (re-post)', p_strmode;
    END IF;

    FOR v_row IN
        SELECT st.fslno,
               st.fdate,
               st.fitemid,
               st.fsttobrid,
               COALESCE(st.fqtyout, 0) AS qtyout
        FROM dbo.tblstocktrans st
        WHERE st.fcoid    = p_pstrcoid
          AND st.fyear    = p_pstryear
          AND st.fbrid    = p_strbrid
          AND st.fdoctype = p_strdoctype
          AND st.fdocno   = p_strdocno
          AND (
                (upper(p_strmode) = 'P' AND COALESCE(st.fpost, false) = false)
                OR
                (upper(p_strmode) <> 'P' AND COALESCE(st.fpost, false) = true)
              )
        ORDER BY st.fslno
    LOOP
        v_dtpdate   := v_row.fdate;
        v_intslno   := v_row.fslno;
        v_stritemid := v_row.fitemid;
        v_strtobrid := v_row.fsttobrid;
        v_numqtyout := v_row.qtyout;
        v_intlines  := v_intlines + 1;

        -- ST -------------------------------------------------------------
        -- 1. the From branch's stock row, and its current unit cost
        INSERT INTO dbo.tblstockcontrol (fcoid, fyear, fbrid, fitemid, fcuserid, fcuserdate)
        SELECT p_pstrcoid, v_stryear, p_strbrid, v_stritemid, p_pstruserid, now()
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.tblstockcontrol
            WHERE fcoid = p_pstrcoid AND fyear = v_stryear
              AND fbrid = p_strbrid AND fitemid = v_stritemid
        );

        v_numnewunitcost := 0;

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

        -- STI ------------------------------------------------------------
        -- 4. the To branch's stock row, its previous values, the average cost, the stock
        INSERT INTO dbo.tblstockcontrol (fcoid, fyear, fbrid, fitemid, funitcost, fcuserid, fcuserdate)
        SELECT p_pstrcoid, v_stryear, v_strtobrid, v_stritemid, 0, p_pstruserid, now()
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.tblstockcontrol
            WHERE fcoid = p_pstrcoid AND fyear = v_stryear
              AND fbrid = v_strtobrid AND fitemid = v_stritemid
        );

        v_numcalcunitcost := 0;

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

        -- 5. the cost of everything transferred (for the finance lines)
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

    -- the two stock accounts of the finance lines
    v_strstockfrombraccountid := dbo.getstockaccountid(p_pstrcoid, p_strbrid);
    v_strstocktobraccountid   := dbo.getstockaccountid(p_pstrcoid, v_strtobrid);

    IF COALESCE(v_strstockfrombraccountid, '') = '' THEN
        RAISE EXCEPTION 'The Stock Account of the Branch % is not set (Set Posting Account)', p_strbrid;
    END IF;

    IF COALESCE(v_strstocktobraccountid, '') = '' THEN
        RAISE EXCEPTION 'The Stock Account of the Branch % is not set (Set Posting Account)', v_strtobrid;
    END IF;

    IF upper(p_strmode) = 'P' THEN   -- Posting

        SELECT b.fbrname INTO v_strfrombrname
          FROM dbo.tblbranch b WHERE b.fcoid = p_pstrcoid AND b.fbrid = p_strbrid;

        SELECT b.fbrname INTO v_strtobrname
          FROM dbo.tblbranch b WHERE b.fcoid = p_pstrcoid AND b.fbrid = v_strtobrid;

        v_strdescription := v_strfrombrname || ' To ' || v_strtobrname;

        DELETE FROM dbo.tblfintrans
         WHERE fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fbrid    = p_strbrid
           AND fdoctype = p_strdoctype
           AND fdocno   = p_strdocno;

        IF dbo.isincomeorexpense(p_pstrcoid, v_strstockfrombraccountid) THEN
            v_strccid := p_strbrid;
        ELSE
            v_strccid := '';
        END IF;

        -- Credit Stock From Branch Account
        INSERT INTO dbo.tblfintrans (
            fcoid, fyear, fbrid, fdoctype, fdocno, fdate, fdescription, fslno,
            faccountid, fccid, fdebit, fcredit, fpost, fyearclose, forigin,
            fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, v_dtpdate, v_strdescription, 1,
            v_strstockfrombraccountid, v_strccid, 0, COALESCE(v_numcostofstock, 0), false, false, 'GP',
            p_pstruserid, now()
        );

        IF dbo.isincomeorexpense(p_pstrcoid, v_strstocktobraccountid) THEN
            v_strccid := p_strbrid;
        ELSE
            v_strccid := '';
        END IF;

        -- Debit Stock To Branch Account
        INSERT INTO dbo.tblfintrans (
            fcoid, fyear, fbrid, fdoctype, fdocno, fdate, fdescription, fslno,
            faccountid, fccid, fdebit, fcredit, fpost, fyearclose, forigin,
            fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, v_dtpdate, v_strdescription, 2,
            v_strstocktobraccountid, v_strccid, COALESCE(v_numcostofstock, 0), 0, false, false, 'GP',
            p_pstruserid, now()
        );

        -- the posting transaction number: one for the whole document
        v_strpostingno := dbo.getnexttransno(p_pstrcoid, p_pstryear, p_strbrid, 'P');

        -- both sets of rows are posted
        UPDATE dbo.tblstocktrans
           SET fpost = true,
               fpostingno = COALESCE(fpostingno, v_strpostingno)
         WHERE fcoid   = p_pstrcoid
           AND fyear   = p_pstryear
           AND fstbrid = p_strbrid
           AND (fdoctype = p_strdoctype OR fdoctype = v_strdoctypeg)
           AND fdocno  = p_strdocno;

        UPDATE dbo.tblfintrans
           SET fpost = true
         WHERE fcoid   = p_pstrcoid
           AND fyear   = p_pstryear
           AND fbrid   = p_strbrid
           AND (fdoctype = p_strdoctype OR fdoctype = v_strdoctypeg)
           AND fdocno  = p_strdocno;

    ELSE   -- Re-posting

        -- Credit
        UPDATE dbo.tblfintrans
           SET fcredit = COALESCE(v_numcostofstock, 0)
         WHERE fcoid   = p_pstrcoid
           AND fyear   = p_pstryear
           AND fbrid   = p_strbrid
           AND (fdoctype = p_strdoctype OR fdoctype = v_strdoctypeg)
           AND fdocno  = p_strdocno
           AND faccountid = v_strstockfrombraccountid;

        -- Debit
        UPDATE dbo.tblfintrans
           SET fdebit = COALESCE(v_numcostofstock, 0)
         WHERE fcoid   = p_pstrcoid
           AND fyear   = p_pstryear
           AND fbrid   = p_strbrid
           AND (fdoctype = p_strdoctype OR fdoctype = v_strdoctypeg)
           AND fdocno  = p_strdocno
           AND faccountid = v_strstocktobraccountid;

    END IF;
END;
$$;
