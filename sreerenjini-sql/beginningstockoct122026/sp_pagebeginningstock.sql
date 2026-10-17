-- PROCEDURE: dbo.sp_pagebeginningstock
--   Postgres port of the SQL Server SP_frmBeginningStock, kept the SAME as the
--   original (same modes, same inputs, same conditions, same behaviour).
--
-- Modes (p_strmode)
--   GHD  header info of the document: date, saved by, modified by
--   GTL  the lines, ordered by Sl.#
--   S    insert one line
--   M    header update: date + modified-by on every line (saved-by is copied from
--        the existing lines)
--   M1   update one line, found by its original Sl.#
--   D1   delete one line, found by its original Sl.#
--   D    delete the whole document
--
-- The ONLY differences from the SQL Server procedure - all forced by our table:
--   * fintDocNo (always 0 there) is not written: dbo.tblstocktrans has no such column
--   * fPostOrder  -> ftransno, in modes S and M1 only (it is NOT confirmed that
--     ftransno is the post order, so mode GHD does not read it)
--   * fSUserID / fSUserDate (saved by)    -> fcuserid / fcuserdate
--   * fMUserID / fMUserDate (modified by) -> fmuserid / fmuserdate
--   * fUserID / fUserDate (the "last user" pair) are not written: no such columns
--   * the dates and times of the two read modes come back as text
--     (2026-09-30, 12 Oct 2026 10:39:34), so no time zone can move them
--   * @strMenuName is kept as an input but, as in the original, never used
--     (the audit is written by the backend)
--   * fqtyout is not written, as in the original (it defaults to 0 here)
--
-- ADDED (not in the original): the Note of the page is saved in fnote
--   * p_strnote is the note; modes S, M1 and M write it into fnote of the line(s)
--     (the same note on every line of the document; an empty note is stored as
--     NULL), and mode GHD returns it.
--   * Mode M gives it to EVERY line of the branch, so the backend always passes
--     the note with M (a call to M without it would clear the notes).
--   * fnote is varchar(100).
--
-- ADDED: the saving transaction number (fsavingtransno)
--   * p_strsavingtransno is the document's saving number (from dbo.getnexttransno,
--     asked once per document by the backend).
--   * mode S writes it into the line it inserts;
--   * mode M gives it to every line that has none yet (COALESCE): lines that
--     already carry one keep it, so a Modify never renumbers the document.
--
-- As in the original, the year is used ONLY by mode S (it writes fyear); every
-- other mode finds its rows by company + branch + doc type (+ Sl.# for M1 / D1).
--
-- THE YEAR IS TEXT: the argument is p_pstryear character varying (it was p_pintyear
-- smallint), like the year of the other screens' procedures, because
-- tblstocktrans.fyear is varchar(4). The DROP below removes the smallint version.
--
-- Examples (cursor calls must run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pagebeginningstock('GTL', '01', '2026', 'JD', 'BG', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;

-- The procedure gets one more argument (p_strnote), so the CREATE below would
-- make a SECOND procedure next to the old one and calls would become ambiguous.
-- This drops the old argument list first (nothing happens if it is not there):
DROP PROCEDURE IF EXISTS dbo.sp_pagebeginningstock(character varying, character varying, smallint, character varying, character varying, character varying, timestamp without time zone, boolean, character varying, smallint, character varying, character varying, numeric, numeric, numeric, smallint, character varying, character varying, refcursor);
-- ... the one before the saving transaction number was added (p_strnote, no p_strsavingtransno)
DROP PROCEDURE IF EXISTS dbo.sp_pagebeginningstock(character varying, character varying, smallint, character varying, character varying, character varying, timestamp without time zone, boolean, character varying, smallint, character varying, character varying, numeric, numeric, numeric, smallint, character varying, character varying, character varying, refcursor);

-- ... and the version with the year as a smallint (p_pintyear), the one in use until now
DROP PROCEDURE IF EXISTS dbo.sp_pagebeginningstock(character varying, character varying, smallint, character varying, character varying, character varying, timestamp without time zone, boolean, character varying, smallint, character varying, character varying, numeric, numeric, numeric, smallint, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagebeginningstock(
    IN    p_strmode          character varying,
    IN    p_pstrcoid         character varying,
    IN    p_pstryear         character varying,
    IN    p_strbrid          character varying,
    IN    p_strdoctype       character varying,
    IN    p_strdocno         character varying DEFAULT NULL::character varying,
    IN    p_dtpdate          timestamp without time zone DEFAULT NULL::timestamp without time zone,
    IN    p_blnpost          boolean           DEFAULT false,
    IN    p_strtransno       character varying DEFAULT NULL::character varying,
    IN    p_intslno          smallint          DEFAULT 0,
    IN    p_stritemid        character varying DEFAULT NULL::character varying,
    IN    p_strunit          character varying DEFAULT NULL::character varying,
    IN    p_numqtyin         numeric           DEFAULT 0,
    IN    p_numunitcost      numeric           DEFAULT 0,
    IN    p_numtotalcost     numeric           DEFAULT 0,
    IN    p_original_fslno   smallint          DEFAULT 0,
    IN    p_pstruserid       character varying DEFAULT NULL::character varying,
    IN    p_strmenuname      character varying DEFAULT NULL::character varying,
    IN    p_strnote          character varying DEFAULT NULL::character varying,
    IN    p_strsavingtransno character varying DEFAULT NULL::character varying,
    INOUT p_result_cursor    refcursor         DEFAULT 'cur_beginningstock'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_suserid    character varying;
    v_suserdate  timestamp without time zone;
    v_muserid    character varying;
    v_muserdate  timestamp without time zone;
BEGIN

    IF p_strmode = 'GHD' THEN

        OPEN p_result_cursor FOR
            SELECT
                to_char(fdate, 'YYYY-MM-DD')                   AS fdate,
                fcuserid                                       AS fsuserid,
                to_char(fcuserdate, 'DD Mon YYYY HH24:MI:SS')  AS fsuserdate,
                fmuserid                                       AS fmuserid,
                to_char(fmuserdate, 'DD Mon YYYY HH24:MI:SS')  AS fmuserdate,
                fnote                                          AS fnote
            FROM dbo.tblstocktrans
            WHERE fcoid    = p_pstrcoid
              AND fbrid    = p_strbrid
              AND fdoctype = p_strdoctype;

    ELSIF p_strmode = 'GTL' THEN

        OPEN p_result_cursor FOR
            SELECT
                fslno,
                fitemid,
                funit,
                fqtyin,
                funitcost,
                ftotalcost
            FROM dbo.tblstocktrans
            WHERE fcoid    = p_pstrcoid
              AND fbrid    = p_strbrid
              AND fdoctype = p_strdoctype
            ORDER BY fslno;

    ELSIF p_strmode = 'S' THEN

        INSERT INTO dbo.tblstocktrans (
            fcoid, fyear, fbrid, fdoctype, fdocno, fdate, fslno,
            fitemid, funit, fqtyin, funitcost, ftotalcost,
            forigin, fpost, ftransno,
            fcuserid, fcuserdate, fnote, fsavingtransno
        )
        VALUES (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, p_dtpdate, p_intslno,
            p_stritemid, p_strunit,
            COALESCE(p_numqtyin, 0), COALESCE(p_numunitcost, 0), COALESCE(p_numtotalcost, 0),
            'UI', p_blnpost, p_strtransno,
            p_pstruserid, now(), NULLIF(p_strnote, ''), p_strsavingtransno
        );

    ELSIF p_strmode = 'M' THEN

        v_muserid   := p_pstruserid;
        v_muserdate := now();

        -- the saved-by of the existing lines (the first line's)
        SELECT fcuserid, fcuserdate
          INTO v_suserid, v_suserdate
          FROM dbo.tblstocktrans
         WHERE fcoid    = p_pstrcoid
           AND fbrid    = p_strbrid
           AND fdoctype = p_strdoctype
         ORDER BY fslno
         LIMIT 1;

        UPDATE dbo.tblstocktrans SET
            fdate      = p_dtpdate,
            fcuserid   = v_suserid,
            fcuserdate = v_suserdate,
            fmuserid   = v_muserid,
            fmuserdate = v_muserdate,
            fnote      = NULLIF(p_strnote, ''),
            fsavingtransno = COALESCE(fsavingtransno, p_strsavingtransno)
        WHERE fcoid    = p_pstrcoid
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype;

    ELSIF p_strmode = 'M1' THEN

        UPDATE dbo.tblstocktrans SET
            fslno      = p_intslno,
            fitemid    = p_stritemid,
            funit      = p_strunit,
            fqtyin     = COALESCE(p_numqtyin, 0),
            funitcost  = COALESCE(p_numunitcost, 0),
            ftotalcost = COALESCE(p_numtotalcost, 0),
            fpost      = p_blnpost,
            ftransno   = p_strtransno,
            fnote      = NULLIF(p_strnote, '')
        WHERE fcoid    = p_pstrcoid
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype
          AND fslno    = p_original_fslno;

    ELSIF p_strmode = 'D1' THEN

        DELETE FROM dbo.tblstocktrans
        WHERE fcoid    = p_pstrcoid
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype
          AND fslno    = p_original_fslno;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblstocktrans
        WHERE fcoid    = p_pstrcoid
          AND fbrid    = p_strbrid
          AND fdoctype = p_strdoctype;

    END IF;

END;
$procedure$;
