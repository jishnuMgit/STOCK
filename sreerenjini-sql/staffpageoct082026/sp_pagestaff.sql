-- PROCEDURE: dbo.sp_pagestaff
--   (Postgres port of the SQL Server SP_frmStaff, for the current tblstaff:
--    staff id, name, and the Purchase / Sales flags fispurchase / fissales.
--    The old Travel / Tour / Other / mobile / branch / account fields are not
--    in the table any more, so they are not here.)
--
-- Modes
--   G   all staff of the company
--   S   insert a new staff member
--   M   update a staff member; p_original_fstaffid is the id it had when it
--       was loaded (the old form let the id itself be changed)
--   D   delete the staff member p_original_fstaffid
--
-- The "is this staff member already used?" check is NOT in here: the backend
-- asks dbo.sp_havetrans('fStaffID', ...) before a rename or a delete.
--
-- The user audit (the old SP_UserAudit calls) is written by the backend
-- through dbo.sp_useraudit, as on the other screens - it is not done in here.
--
-- Examples (cursor calls must run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pagestaff('G', '01', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;

-- DROP PROCEDURE IF EXISTS dbo.sp_pagestaff(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_strstaffid character varying, IN p_strstaffname character varying, IN p_blnispurchase boolean, IN p_blnissales boolean, IN p_original_fstaffid character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagestaff(
    IN p_strmode              character varying,
    IN p_pstrcoid             character varying,
    IN p_strstaffid           character varying DEFAULT NULL::character varying,
    IN p_strstaffname         character varying DEFAULT NULL::character varying,
    IN p_blnispurchase        boolean           DEFAULT false,
    IN p_blnissales           boolean           DEFAULT false,
    IN p_original_fstaffid    character varying DEFAULT NULL::character varying,
    IN p_pstruserid           character varying DEFAULT NULL::character varying,
    IN p_result_cursor        refcursor         DEFAULT 'cur_staff'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                fstaffid,
                fstaffname,
                fispurchase,
                fissales
            FROM dbo.tblstaff
            WHERE fcoid = p_pstrcoid
            ORDER BY fstaffid;

    ELSIF p_strmode = 'S' THEN

        INSERT INTO dbo.tblstaff (
            fcoid, fstaffid, fstaffname,
            fispurchase, fissales,
            fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_strstaffid, p_strstaffname,
            COALESCE(p_blnispurchase, false), COALESCE(p_blnissales, false),
            p_pstruserid, now()
        );

    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tblstaff SET
            fstaffid    = p_strstaffid,
            fstaffname  = p_strstaffname,
            fispurchase = COALESCE(p_blnispurchase, false),
            fissales    = COALESCE(p_blnissales, false),
            fmuserid    = p_pstruserid,
            fmuserdate  = now()
        WHERE fcoid = p_pstrcoid
          AND fstaffid = p_original_fstaffid;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblstaff
        WHERE fcoid = p_pstrcoid
          AND fstaffid = p_original_fstaffid;

    END IF;

END;
$procedure$;
