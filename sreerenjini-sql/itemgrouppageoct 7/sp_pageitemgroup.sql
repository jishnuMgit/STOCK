-- PROCEDURE: dbo.sp_pageitemgroup
--   (Postgres port of the SQL Server SP_frmItemGroup, with the VAT slab and
--    VAT % columns added: tblitemgroup.fvatslab / fvatper)
--
-- Modes
--   G   all item groups of the company (the old 'G')
--   G1  one item group of the company, by p_stritemgroupid
--   S   insert a new item group
--   M   update an item group; p_original_fitemgroupid is the id it had when
--       it was loaded (the old form let the id itself be changed)
--   D   delete the item group p_original_fitemgroupid
--
-- The user audit (the old SP_UserAudit call in 'D') is written by the backend
-- through dbo.sp_useraudit, as on the other screens - it is not done in here.
--
-- Examples (cursor calls must run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pageitemgroup('G', '01', p_result_cursor => 'c1');
--   FETCH ALL FROM "c1";
--   COMMIT;

-- DROP PROCEDURE IF EXISTS dbo.sp_pageitemgroup(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_stritemgroupid character varying, IN p_stritemgroupname character varying, IN p_strvatslab character varying, IN p_numvatper numeric, IN p_original_fitemgroupid character varying, IN p_pstruserid character varying, IN p_strmenuname character varying, IN p_strscreenname character varying, IN p_strmoduleid character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageitemgroup(
    IN p_strmode                character varying,
    IN p_pstrcoid               character varying,
    IN p_stritemgroupid         character varying DEFAULT NULL::character varying,
    IN p_stritemgroupname       character varying DEFAULT NULL::character varying,
    IN p_strvatslab             character varying DEFAULT NULL::character varying,
    IN p_numvatper              numeric           DEFAULT 0,
    IN p_original_fitemgroupid  character varying DEFAULT NULL::character varying,
    IN p_pstruserid             character varying DEFAULT NULL::character varying,
    IN p_strmenuname            character varying DEFAULT NULL::character varying,
    IN p_strscreenname          character varying DEFAULT NULL::character varying,
    IN p_strmoduleid            character varying DEFAULT NULL::character varying,
    IN p_result_cursor          refcursor         DEFAULT 'cur_itemgroup'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                fitemgroupid,
                fitemgroupname,
                fvatslab,
                fvatper
            FROM dbo.tblitemgroup
            WHERE fcoid = p_pstrcoid
            ORDER BY fitemgroupid;

    ELSIF p_strmode = 'G1' THEN

        OPEN p_result_cursor FOR
            SELECT
                fitemgroupid,
                fitemgroupname,
                fvatslab,
                fvatper
            FROM dbo.tblitemgroup
            WHERE fcoid = p_pstrcoid
              AND fitemgroupid = p_stritemgroupid;

    ELSIF p_strmode = 'S' THEN

        INSERT INTO dbo.tblitemgroup (
            fcoid, fitemgroupid, fitemgroupname,
            fvatslab, fvatper,
            fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_stritemgroupid, p_stritemgroupname,
            p_strvatslab, p_numvatper,
            p_pstruserid, now()
        );

    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tblitemgroup SET
            fitemgroupid   = p_stritemgroupid,
            fitemgroupname = p_stritemgroupname,
            fvatslab       = p_strvatslab,
            fvatper        = p_numvatper,
            fmuserid       = p_pstruserid,
            fmuserdate     = now()
        WHERE fcoid = p_pstrcoid
          AND fitemgroupid = p_original_fitemgroupid;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblitemgroup
        WHERE fcoid = p_pstrcoid
          AND fitemgroupid = p_original_fitemgroupid;

    END IF;

END;
$procedure$;
