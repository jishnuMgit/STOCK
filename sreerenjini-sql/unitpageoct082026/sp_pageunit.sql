-- PROCEDURE: dbo.sp_pageunit
--   (Postgres port of the SQL Server SP_frmUnit)
--
-- Modes
--   G   all units of the company (the old 'G')
--   S   insert a new unit
--   M   rename a unit; p_original_funit is the name it had when it was loaded
--   D   delete the unit p_original_funit
--
-- The "is this unit already used by transactions?" check is NOT in here: the
-- backend calls dbo.sp_havetrans('fUnit', ...) before a rename or a delete.
-- The user audit (the old SP_UserAudit call in 'D') is written by the backend
-- through dbo.sp_useraudit, as on the other screens.
--
-- ADDED: p_dtpserverdate - the time written on the row (fcuserdate on a new unit, fmuserdate on a rename). The page gets it from
--   the database server's clock (GET /datetime/server-date) and the backend checks it and passes it, so every row of one save
--   carries the same time. NULL = the procedure's own now() (a caller that sends none works as before).
--   The signature changed (a new argument), so the earlier version is dropped first.
--
-- Examples (cursor calls must run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pageunit('G', '01', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;

-- DROP PROCEDURE IF EXISTS dbo.sp_pageunit(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_strunit character varying, IN p_original_funit character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor);

DROP PROCEDURE IF EXISTS dbo.sp_pageunit(character varying, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageunit(
    IN p_strmode         character varying,
    IN p_pstrcoid        character varying,
    IN p_strunit         character varying DEFAULT NULL::character varying,
    IN p_original_funit  character varying DEFAULT NULL::character varying,
    IN p_pstruserid      character varying DEFAULT NULL::character varying,
    IN p_dtpserverdate   timestamp without time zone DEFAULT NULL::timestamp without time zone,
    IN p_result_cursor   refcursor         DEFAULT 'cur_unit'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT funit
            FROM dbo.tblunit
            WHERE fcoid = p_pstrcoid
            ORDER BY funit;

    ELSIF p_strmode = 'S' THEN

        INSERT INTO dbo.tblunit (
            fcoid, funit, fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_strunit, p_pstruserid, COALESCE(p_dtpserverdate, now())
        );

    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tblunit SET
            funit      = p_strunit,
            fmuserid   = p_pstruserid,
            fmuserdate = COALESCE(p_dtpserverdate, now())
        WHERE fcoid = p_pstrcoid
          AND funit = p_original_funit;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblunit
        WHERE fcoid = p_pstrcoid
          AND funit = p_original_funit;

    END IF;

END;
$procedure$;
