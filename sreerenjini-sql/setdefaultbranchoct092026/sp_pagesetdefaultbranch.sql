-- PROCEDURE: dbo.sp_pagesetdefaultbranch
--   (Postgres port of the SQL Server SP_frmDefaultBr)
--
-- Modes
--   G   the default branches. An Admin User (type AU, ADMIN included) gets
--       EVERY user's row, anyone else gets only their own row - the logged-in
--       user is p_pstruserid.
--   S   insert a default branch for p_struserid
--   M   update a row; p_original_fuserid is the user it had when it was loaded
--   D   delete the row of p_original_fuserid
--
-- tblDefaultBranch has one row per user (primary key company + user) and only
-- the created user / date columns, so a modify refreshes those two (as the old
-- SP refreshed its fUserInfo).
--
-- The branch right ("does this user have a right to this branch?") and the
-- user audit are done by the backend, as on the other screens.
--
-- Examples (cursor calls must run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pagesetdefaultbranch('G', '01', p_pstruserid => 'ADMIN', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;

-- DROP PROCEDURE IF EXISTS dbo.sp_pagesetdefaultbranch(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_struserid character varying, IN p_strdefbrid character varying, IN p_original_fuserid character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagesetdefaultbranch(
    IN p_strmode           character varying,
    IN p_pstrcoid          character varying,
    IN p_struserid         character varying DEFAULT NULL::character varying,
    IN p_strdefbrid        character varying DEFAULT NULL::character varying,
    IN p_original_fuserid  character varying DEFAULT NULL::character varying,
    IN p_pstruserid        character varying DEFAULT NULL::character varying,
    IN p_result_cursor     refcursor         DEFAULT 'cur_defaultbranch'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                fuserid,
                fdefbrid
            FROM dbo.tbldefaultbranch
            WHERE fcoid = p_pstrcoid
              AND (dbo.getusertype(p_pstrcoid, p_pstruserid) = 'AU'
                   OR fuserid = p_pstruserid)
            ORDER BY fuserid;

    ELSIF p_strmode = 'S' THEN

        INSERT INTO dbo.tbldefaultbranch (
            fcoid, fuserid, fdefbrid, fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_struserid, p_strdefbrid, p_pstruserid, now()
        );

    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tbldefaultbranch SET
            fuserid    = p_struserid,
            fdefbrid   = p_strdefbrid,
            fcuserid   = p_pstruserid,
            fcuserdate = now()
        WHERE fcoid = p_pstrcoid
          AND fuserid = p_original_fuserid;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tbldefaultbranch
        WHERE fcoid = p_pstrcoid
          AND fuserid = p_original_fuserid;

    END IF;

END;
$procedure$;

-- The procedure used to be called dbo.sp_pagedefaultbranch. Run this AFTER the
-- CREATE above, once, to remove the old one (the backend now calls the new name):
DROP PROCEDURE IF EXISTS dbo.sp_pagedefaultbranch(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_struserid character varying, IN p_strdefbrid character varying, IN p_original_fuserid character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor);
