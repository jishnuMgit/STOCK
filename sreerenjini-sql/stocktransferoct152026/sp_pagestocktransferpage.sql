-- =====================================================================
-- dbo.sp_pagestocktransferpage   (Stock Transfer)
--
-- (named after the page, StockTransferPage; it was first created as
--  dbo.sp_pagestocktransfer - the DROP just above the CREATE removes that name)
--
-- Postgres port of the SQL Server SP_frmST, same modes and behaviour.
-- A transfer is stored TWICE in tblstocktrans, one set of rows for each branch:
--
--   the OUT rows   p_strdoctype  ('ST')   fbrid = the From branch, fqtyout = qty, forigin 'UI'
--   the IN  rows   p_strdoctypeg ('STI')  fbrid = the To branch,   fqtyin  = qty, forigin 'GS'
--
-- both with fstbrid = the From branch and fsttobrid = the To branch, the same
-- Entry No., date, cost and header values.
--
-- Modes (p_strmode)
--   GHD  header of the document: To branch, date, note, posted flag, saved by,
--        modified by
--   GTL  the lines, ordered by Sl.#
--   S    insert one line (both rows)
--   M    header update on both sets (the IN rows move to the new To branch);
--        the saved-by of the existing rows is kept
--   M1   update one line (both rows), found by its original Sl.#
--   D1   delete one line (both rows)
--   D    delete the whole document (both sets) and its tblfintrans rows
--
-- Differences from the SQL Server procedure - all forced by our table:
--   * fintDocNo, fStock, fPostOrder, fUserID/fUserDate are not written: the table
--     has no such columns. @strDescription and @strMenuName were never used.
--   * fSTExpAmt (Transfer Expense) and fDNNo (DN No.) are NOT written or read: the
--     table has no such columns and none are added. Their lines are kept below as
--     comments, ready to switch on if the columns are ever added (together with
--     the p_numtransexpense and p_strdnno arguments, which are kept).
--   * @blnUpdate20220301 (never used in the original body) is dropped.
--   * fSUserID / fSUserDate -> fcuserid / fcuserdate, fMUserID / fMUserDate ->
--     fmuserid / fmuserdate; fToBrID -> fsttobrid.
--   * the two read modes return dates as text so no time zone can move them.
--   * p_strnote is the note, written on every row (varchar(100)).
--
-- tblstocktrans.fyear is varchar(4) now (like tblstockcontrol.fyear): the year argument
-- is TEXT, p_pstryear (it was a smallint, p_pintyear), compared with the year columns as it is.
--
-- ADDED: the saving transaction number (fsavingtransno), worked out INSIDE the procedure
--   (no new argument: the signature and the backend call are unchanged)
--   * for modes S and M the procedure first looks for the number the document already has
--     (the ST rows of the Entry No.); if there is none it asks
--     dbo.getnexttransno(co, year, From branch, 'S') - ONE number for the whole document;
--   * mode S writes it into BOTH rows it inserts (the OUT row and the IN row), so every
--     line of the document - and its IN rows in the To branch - carry the same number;
--   * mode M gives it to every row (both sets) that has none yet (COALESCE): a Modify
--     never renumbers the document;
--   * M1 / D1 / D leave it alone.
--   * The posting number (fpostingtransno) is written by sp_pagestocktransferpost.
--   * Needs the two columns of beginningstockoct122026/alter_tblstocktrans_transno.sql.
--
-- Examples (cursor calls run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pagestocktransferpage('GTL', '01', '2026', 'JD', 'ST', 'STI', 'STJD-2600001', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;
-- =====================================================================

DROP PROCEDURE IF EXISTS dbo.sp_pagestocktransfer(character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, timestamp without time zone, numeric, character varying, numeric, smallint, character varying, character varying, numeric, numeric, numeric, smallint, character varying, character varying, refcursor);

DROP PROCEDURE IF EXISTS dbo.sp_pagestocktransferpage(character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, timestamp without time zone, numeric, character varying, numeric, smallint, character varying, character varying, numeric, numeric, numeric, smallint, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagestocktransferpage(
    IN    p_strmode          character varying,
    IN    p_pstrcoid         character varying,
    IN    p_pstryear         character varying,
    IN    p_strstbrid        character varying,
    IN    p_strdoctype       character varying,
    IN    p_strdoctypeg      character varying,
    IN    p_strdocno         character varying,
    IN    p_strtobrid        character varying DEFAULT NULL::character varying,
    IN    p_dtpdate          timestamp without time zone DEFAULT NULL::timestamp without time zone,
    IN    p_numtransexpense  numeric           DEFAULT 0,
    IN    p_strdnno          character varying DEFAULT NULL::character varying,
    IN    p_numdocamt        numeric           DEFAULT 0,
    IN    p_intslno          smallint          DEFAULT 0,
    IN    p_stritemid        character varying DEFAULT NULL::character varying,
    IN    p_strunit          character varying DEFAULT NULL::character varying,
    IN    p_numqtyout        numeric           DEFAULT 0,
    IN    p_numunitcost      numeric           DEFAULT 0,
    IN    p_numtotalcost     numeric           DEFAULT 0,
    IN    p_original_fslno   smallint          DEFAULT 0,
    IN    p_strnote          character varying DEFAULT NULL::character varying,
    IN    p_pstruserid       character varying DEFAULT NULL::character varying,
    INOUT p_result_cursor    refcursor         DEFAULT 'cur_stocktransfer'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_suserid    character varying;
    v_suserdate  timestamp without time zone;
    v_muserid    character varying;
    v_muserdate  timestamp without time zone;
    v_strsavingtransno character varying;   -- the document's saving transaction number
BEGIN

    -- the document's saving transaction number (modes S and M): the one its rows already
    -- carry, or - for a new document - the next one from dbo.getnexttransno
    IF p_strmode IN ('S', 'M') THEN
        SELECT MAX(fsavingtransno)
          INTO v_strsavingtransno
          FROM dbo.tblstocktrans
         WHERE fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fstbrid  = p_strstbrid
           AND fdoctype = p_strdoctype
           AND fdocno   = p_strdocno;

        IF v_strsavingtransno IS NULL THEN
            v_strsavingtransno := dbo.getnexttransno(p_pstrcoid, p_pstryear, p_strstbrid, 'S');
        END IF;
    END IF;

    IF p_strmode = 'GHD' THEN

        OPEN p_result_cursor FOR
            SELECT
                fsttobrid                                      AS fsttobrid,
                to_char(fdate, 'YYYY-MM-DD')                   AS fdate,
                -- COALESCE(fstexpamt, 0)                      AS fstexpamt,   (no such column)
                -- fdnno                                       AS fdnno,       (no such column)
                fnote                                          AS fnote,
                fpost                                          AS fpost,
                fcuserid                                       AS fsuserid,
                to_char(fcuserdate, 'DD Mon YYYY HH24:MI:SS')  AS fsuserdate,
                fmuserid                                       AS fmuserid,
                to_char(fmuserdate, 'DD Mon YYYY HH24:MI:SS')  AS fmuserdate
            FROM dbo.tblstocktrans
            WHERE fcoid    = p_pstrcoid
              AND fyear    = p_pstryear
              AND fstbrid  = p_strstbrid
              AND fdoctype = p_strdoctype
              AND fdocno   = p_strdocno
            ORDER BY fslno
            LIMIT 1;

    ELSIF p_strmode = 'GTL' THEN

        OPEN p_result_cursor FOR
            SELECT
                fslno,
                fitemid,
                funit,
                fqtyout,
                funitcost,
                ftotalcost
            FROM dbo.tblstocktrans
            WHERE fcoid    = p_pstrcoid
              AND fyear    = p_pstryear
              AND fstbrid  = p_strstbrid
              AND fdoctype = p_strdoctype
              AND fdocno   = p_strdocno
            ORDER BY fslno;

    ELSIF p_strmode = 'S' THEN

        -- the OUT row: the From branch
        INSERT INTO dbo.tblstocktrans (
            fcoid, fyear, fbrid, fdoctype, fdocno, fstbrid, fsttobrid, fdate,
            fnote, fslno, fitemid, funit,   -- fstexpamt, fdnno: no such columns
            fqtyout, funitcost, ftotalcost, fdocamt, forigin, fpost,
            fcuserid, fcuserdate, fsavingtransno
        )
        VALUES (
            p_pstrcoid, p_pstryear, p_strstbrid, p_strdoctype, p_strdocno, p_strstbrid, p_strtobrid, p_dtpdate,
            NULLIF(p_strnote, ''), p_intslno, p_stritemid, p_strunit,
            COALESCE(p_numqtyout, 0), COALESCE(p_numunitcost, 0), COALESCE(p_numtotalcost, 0), COALESCE(p_numdocamt, 0),
            'UI', false,
            p_pstruserid, now(), v_strsavingtransno
        );

        -- the IN row (generated): the To branch
        INSERT INTO dbo.tblstocktrans (
            fcoid, fyear, fbrid, fdoctype, fdocno, fstbrid, fsttobrid, fdate,
            fnote, fslno, fitemid, funit,   -- fstexpamt, fdnno: no such columns
            fqtyin, funitcost, ftotalcost, fdocamt, forigin, fpost,
            fcuserid, fcuserdate, fsavingtransno
        )
        VALUES (
            p_pstrcoid, p_pstryear, p_strtobrid, p_strdoctypeg, p_strdocno, p_strstbrid, p_strtobrid, p_dtpdate,
            NULLIF(p_strnote, ''), p_intslno, p_stritemid, p_strunit,
            COALESCE(p_numqtyout, 0), COALESCE(p_numunitcost, 0), COALESCE(p_numtotalcost, 0), COALESCE(p_numdocamt, 0),
            'GS', false,
            p_pstruserid, now(), v_strsavingtransno
        );

    ELSIF p_strmode = 'M' THEN

        v_muserid   := p_pstruserid;
        v_muserdate := now();

        -- the saved-by of the existing OUT rows (the first one's)
        SELECT fcuserid, fcuserdate
          INTO v_suserid, v_suserdate
          FROM dbo.tblstocktrans
         WHERE fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fstbrid  = p_strstbrid
           AND fdoctype = p_strdoctype
           AND fdocno   = p_strdocno
         ORDER BY fslno
         LIMIT 1;

        -- the OUT rows
        UPDATE dbo.tblstocktrans SET
            fbrid      = p_strstbrid,
            fsttobrid  = p_strtobrid,
            fdate      = p_dtpdate,
            -- fstexpamt  = COALESCE(p_numtransexpense, 0),   (no such column)
            -- fdnno      = p_strdnno,                        (no such column)
            fdocamt    = COALESCE(p_numdocamt, 0),
            fnote      = NULLIF(p_strnote, ''),
            fcuserid   = v_suserid,
            fcuserdate = v_suserdate,
            fmuserid   = v_muserid,
            fmuserdate = v_muserdate,
            fsavingtransno = COALESCE(fsavingtransno, v_strsavingtransno)
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fstbrid  = p_strstbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno;

        -- the IN rows: they follow the (possibly changed) To branch
        UPDATE dbo.tblstocktrans SET
            fbrid      = p_strtobrid,
            fsttobrid  = p_strtobrid,
            fdate      = p_dtpdate,
            -- fstexpamt  = COALESCE(p_numtransexpense, 0),   (no such column)
            -- fdnno      = p_strdnno,                        (no such column)
            fdocamt    = COALESCE(p_numdocamt, 0),
            fnote      = NULLIF(p_strnote, ''),
            fcuserid   = v_suserid,
            fcuserdate = v_suserdate,
            fmuserid   = v_muserid,
            fmuserdate = v_muserdate,
            fsavingtransno = COALESCE(fsavingtransno, v_strsavingtransno)
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fstbrid  = p_strstbrid
          AND fdoctype = p_strdoctypeg
          AND fdocno   = p_strdocno;

    ELSIF p_strmode = 'M1' THEN

        UPDATE dbo.tblstocktrans SET
            fslno      = p_intslno,
            fitemid    = p_stritemid,
            funit      = p_strunit,
            fqtyout    = COALESCE(p_numqtyout, 0),
            funitcost  = COALESCE(p_numunitcost, 0),
            ftotalcost = COALESCE(p_numtotalcost, 0)
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fstbrid  = p_strstbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno
          AND fslno    = p_original_fslno;

        UPDATE dbo.tblstocktrans SET
            fslno      = p_intslno,
            fitemid    = p_stritemid,
            funit      = p_strunit,
            fqtyin     = COALESCE(p_numqtyout, 0),
            funitcost  = COALESCE(p_numunitcost, 0),
            ftotalcost = COALESCE(p_numtotalcost, 0)
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fstbrid  = p_strstbrid
          AND fdoctype = p_strdoctypeg
          AND fdocno   = p_strdocno
          AND fslno    = p_original_fslno;

    ELSIF p_strmode = 'D1' THEN

        DELETE FROM dbo.tblstocktrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fstbrid  = p_strstbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno
          AND fslno    = p_original_fslno;

        DELETE FROM dbo.tblstocktrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fstbrid  = p_strstbrid
          AND fdoctype = p_strdoctypeg
          AND fdocno   = p_strdocno
          AND fslno    = p_original_fslno;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblstocktrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fstbrid  = p_strstbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno;

        DELETE FROM dbo.tblstocktrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fstbrid  = p_strstbrid
          AND fdoctype = p_strdoctypeg
          AND fdocno   = p_strdocno;

        -- as in the original: the finance rows of both doc types, by the From branch
        DELETE FROM dbo.tblfintrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fbrid    = p_strstbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno;

        DELETE FROM dbo.tblfintrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fbrid    = p_strstbrid
          AND fdoctype = p_strdoctypeg
          AND fdocno   = p_strdocno;

    END IF;

END;
$procedure$;
