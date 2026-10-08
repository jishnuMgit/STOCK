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
-- Examples (cursor calls must run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pageunit('G', '01', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;

-- DROP PROCEDURE IF EXISTS dbo.sp_pageunit(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_strunit character varying, IN p_original_funit character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageunit(
    IN p_strmode         character varying,
    IN p_pstrcoid        character varying,
    IN p_strunit         character varying DEFAULT NULL::character varying,
    IN p_original_funit  character varying DEFAULT NULL::character varying,
    IN p_pstruserid      character varying DEFAULT NULL::character varying,
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
            p_pstrcoid, p_strunit, p_pstruserid, now()
        );

    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tblunit SET
            funit      = p_strunit,
            fmuserid   = p_pstruserid,
            fmuserdate = now()
        WHERE fcoid = p_pstrcoid
          AND funit = p_original_funit;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblunit
        WHERE fcoid = p_pstrcoid
          AND funit = p_original_funit;

    END IF;

END;
$procedure$;
