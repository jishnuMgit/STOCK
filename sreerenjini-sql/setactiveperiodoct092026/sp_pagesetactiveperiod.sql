-- PROCEDURE: dbo.sp_pagesetactiveperiod
--   (Postgres port of the SQL Server SP_frmActivePeriod)
--
-- Modes
--   G   the branches with their active period. The user the page is for
--       (p_pstruserid) sees only the branches he has a right to
--       (dbo.userbranches - ADMIN / admin users see every branch).
--       The dates come back as text yyyy-mm-dd, so no time zone can move a day.
--   M   set the active period (from / to date) of branch p_strbrid
--
-- The branch right, the date rules and the user audit are done by the
-- backend, as on the other screens.
--
-- Examples (cursor calls must run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pagesetactiveperiod('G', '01', p_pstruserid => 'ADMIN', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;

-- DROP PROCEDURE IF EXISTS dbo.sp_pagesetactiveperiod(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_strbrid character varying, IN p_dtpfromdate date, IN p_dtptodate date, IN p_pstruserid character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagesetactiveperiod(
    IN p_strmode       character varying,
    IN p_pstrcoid      character varying,
    IN p_strbrid       character varying DEFAULT NULL::character varying,
    IN p_dtpfromdate   date              DEFAULT NULL::date,
    IN p_dtptodate     date              DEFAULT NULL::date,
    IN p_pstruserid    character varying DEFAULT NULL::character varying,
    IN p_result_cursor refcursor         DEFAULT 'cur_activeperiod'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                b.fbrid,
                b.fbrname,
                to_char(b.factivefromdate, 'YYYY-MM-DD') AS factivefromdate,
                to_char(b.factivetodate,   'YYYY-MM-DD') AS factivetodate
            FROM dbo.tblbranch b
            WHERE b.fcoid = p_pstrcoid
              AND dbo.userbranches(p_pstrcoid, p_pstruserid, b.fbrid)
            ORDER BY b.fpositionno, b.fbrid;

    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tblbranch SET
            factivefromdate = p_dtpfromdate,
            factivetodate   = p_dtptodate,
            fmuserid        = p_pstruserid,
            fmuserdate      = now()
        WHERE fcoid = p_pstrcoid
          AND fbrid = p_strbrid;

    END IF;

END;
$procedure$;
