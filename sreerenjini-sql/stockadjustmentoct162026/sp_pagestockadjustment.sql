-- =====================================================================
-- dbo.sp_pagestockadjustment   (Stock Adjustment - read, save, modify, delete)
--
-- Postgres port of the SQL Server SP_frmADJ, same modes and behaviour.
-- An adjustment is stored ONCE in tblstocktrans (doc type ADJ, fbrid = the branch):
-- one row per line, with fqtyin (stock goes up) OR fqtyout (stock goes down),
-- forigin 'UI'. The total cost of a line is (Qty. In - Qty. Out) x unit cost.
--
-- Modes (p_strmode)
--   GHD  header of the document: date, note, posted flag, saved by, modified by
--        (the old GetHD)
--   GTL  the lines, ordered by Sl.# (the old GetTL)
--   S    insert one line
--   M    header update on every line (date, note, modified-by); the saved-by of
--        the existing rows is kept
--   M1   update one line, found by its original Sl.#
--   D1   delete one line
--   D    delete the whole document and its tblfintrans rows
--
-- Differences from the SQL Server procedure - all forced by our table:
--   * fintDocNo, fUserID/fUserDate are not written: the table has no such columns;
--     fSUserID / fSUserDate -> fcuserid / fcuserdate, fMUserID / fMUserDate ->
--     fmuserid / fmuserdate.
--   * @gintYear is TEXT here (p_pstryear): tblstocktrans.fyear is varchar(4).
--   * @strMenuName was never used.
--   * the two read modes return dates as text so no time zone can move them.
--
-- ADDED: the saving transaction number (fsavingno), as in Stock Transfer
--   * worked out INSIDE the procedure (no extra argument): for modes S and M it first
--     looks for the number the document already has (its rows); if there is none it
--     asks dbo.getnexttransno(co, year, branch, 'S') - ONE number for the whole
--     document;
--   * mode S writes it into the row it inserts, so every line carries the same number;
--   * mode M gives it to every row that has none yet (COALESCE): a Modify never
--     renumbers the document;
--   * M1 / D1 / D leave it alone.
--   * The posting number (fpostingno) is written by sp_pagestockadjustmentpost.
--   * The columns are fsavingno / fpostingno (renamed from fsavingtransno / fpostingtransno).
--
-- ADDED: the item group of every line (tblstocktrans.fitemgroupid, varchar(12)), as in Stock Transfer:
--   * modes S and M1 write dbo.getitemgroupid(co, item) on the line;
--   * mode M gives it to every row of the document that has none yet (COALESCE), so a document
--     saved before the column existed is filled when it is modified.
--   * Needs:  ALTER TABLE dbo.tblstocktrans ADD COLUMN fitemgroupid VARCHAR(12);  and dbo.getitemgroupid.
--
-- Examples (cursor calls run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pagestockadjustment('GTL', '01', '2026', 'JD', 'ADJ', 'ADJ0001', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;
-- =====================================================================

CREATE OR REPLACE PROCEDURE dbo.sp_pagestockadjustment(
    IN    p_strmode          character varying,
    IN    p_pstrcoid         character varying,
    IN    p_pstryear         character varying,
    IN    p_strbrid          character varying,
    IN    p_strdoctype       character varying,
    IN    p_strdocno         character varying,
    IN    p_dtpdate          timestamp without time zone DEFAULT NULL::timestamp without time zone,
    IN    p_strnote          character varying DEFAULT NULL::character varying,
    IN    p_intslno          smallint          DEFAULT 0,
    IN    p_stritemid        character varying DEFAULT NULL::character varying,
    IN    p_strunit          character varying DEFAULT NULL::character varying,
    IN    p_numqtyout        numeric           DEFAULT 0,
    IN    p_numqtyin         numeric           DEFAULT 0,
    IN    p_numunitcost      numeric           DEFAULT 0,
    IN    p_numtotalcost     numeric           DEFAULT 0,
    IN    p_original_fslno   smallint          DEFAULT 0,
    IN    p_pstruserid       character varying DEFAULT NULL::character varying,
    INOUT p_result_cursor    refcursor         DEFAULT 'cur_stockadjustment'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_suserid          character varying;
    v_suserdate        timestamp without time zone;
    v_muserid          character varying;
    v_muserdate        timestamp without time zone;
    v_strsavingno character varying;   -- the document's saving transaction number
BEGIN

    -- the document's saving transaction number (modes S and M): the one its rows already
    -- carry, or - for a new document - the next one from dbo.getnexttransno
    IF p_strmode IN ('S', 'M') THEN
        SELECT MAX(fsavingno)
          INTO v_strsavingno
          FROM dbo.tblstocktrans
         WHERE fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fbrid    = p_strbrid
           AND fdoctype = p_strdoctype
           AND fdocno   = p_strdocno;

        IF v_strsavingno IS NULL THEN
            v_strsavingno := dbo.getnexttransno(p_pstrcoid, p_pstryear, p_strbrid, 'S');
        END IF;
    END IF;

    IF p_strmode = 'GHD' THEN

        OPEN p_result_cursor FOR
            SELECT
                to_char(fdate, 'YYYY-MM-DD')                   AS fdate,
                fnote                                          AS fnote,
                fpost                                          AS fpost,
                fcuserid                                       AS fsuserid,
                to_char(fcuserdate, 'DD Mon YYYY HH24:MI:SS')  AS fsuserdate,
                fmuserid                                       AS fmuserid,
                to_char(fmuserdate, 'DD Mon YYYY HH24:MI:SS')  AS fmuserdate
            FROM dbo.tblstocktrans
            WHERE fcoid    = p_pstrcoid
              AND fyear    = p_pstryear
              AND fbrid    = p_strbrid
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
                fqtyin,
                fqtyout,
                funitcost,
                ftotalcost
            FROM dbo.tblstocktrans
            WHERE fcoid    = p_pstrcoid
              AND fyear    = p_pstryear
              AND fbrid    = p_strbrid
              AND fdoctype = p_strdoctype
              AND fdocno   = p_strdocno
            ORDER BY fslno;

    ELSIF p_strmode = 'S' THEN

        INSERT INTO dbo.tblstocktrans (
            fcoid, fyear, fbrid, fdoctype, fdocno, fdate,
            fnote, fslno, fitemid, funit,
            fqtyout, fqtyin, funitcost, ftotalcost, forigin, fpost,
            fcuserid, fcuserdate, fsavingno, fitemgroupid
        )
        VALUES (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, p_dtpdate,
            NULLIF(p_strnote, ''), p_intslno, p_stritemid, p_strunit,
            COALESCE(p_numqtyout, 0), COALESCE(p_numqtyin, 0),
            COALESCE(p_numunitcost, 0), COALESCE(p_numtotalcost, 0),
            'UI', false,
            p_pstruserid, now(), v_strsavingno, dbo.getitemgroupid(p_pstrcoid, p_stritemid)
        );

    ELSIF p_strmode = 'M' THEN

        v_muserid   := p_pstruserid;
        v_muserdate := now();

        -- the saved-by of the existing rows (the first one's)
        SELECT fcuserid, fcuserdate
          INTO v_suserid, v_suserdate
          FROM dbo.tblstocktrans
         WHERE fcoid    = p_pstrcoid
           AND fyear    = p_pstryear
           AND fbrid    = p_strbrid
           AND fdoctype = p_strdoctype
           AND fdocno   = p_strdocno
         ORDER BY fslno
         LIMIT 1;

        UPDATE dbo.tblstocktrans SET
            fdate      = p_dtpdate,
            fnote      = NULLIF(p_strnote, ''),
            fcuserid   = v_suserid,
            fcuserdate = v_suserdate,
            fmuserid   = v_muserid,
            fmuserdate = v_muserdate,
            fsavingno = COALESCE(fsavingno, v_strsavingno),
            fitemgroupid = COALESCE(fitemgroupid, dbo.getitemgroupid(fcoid, fitemid))
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno;

    ELSIF p_strmode = 'M1' THEN

        UPDATE dbo.tblstocktrans SET
            fslno      = p_intslno,
            fitemid    = p_stritemid,
            fitemgroupid = dbo.getitemgroupid(p_pstrcoid, p_stritemid),
            funit      = p_strunit,
            fqtyout    = COALESCE(p_numqtyout, 0),
            fqtyin     = COALESCE(p_numqtyin, 0),
            funitcost  = COALESCE(p_numunitcost, 0),
            ftotalcost = COALESCE(p_numtotalcost, 0)
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno
          AND fslno    = p_original_fslno;

    ELSIF p_strmode = 'D1' THEN

        DELETE FROM dbo.tblstocktrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno
          AND fslno    = p_original_fslno;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblstocktrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno;

        -- as in the original: the finance rows of the document
        DELETE FROM dbo.tblfintrans
        WHERE fcoid    = p_pstrcoid
          AND fyear    = p_pstryear
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno   = p_strdocno;

    END IF;

END;
$procedure$;
