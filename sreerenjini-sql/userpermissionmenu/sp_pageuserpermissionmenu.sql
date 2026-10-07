-- PROCEDURE: dbo.sp_pageuserpermissionmenu(IN p_strmode character varying, IN p_strcoid character varying, IN p_struserid character varying, IN p_strmenuid character varying, IN p_struserbuttons character varying, INOUT p_result refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pageuserpermissionmenu(IN p_strmode character varying, IN p_strcoid character varying, IN p_struserid character varying, IN p_strmenuid character varying, IN p_struserbuttons character varying, INOUT p_result refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageuserpermissionmenu(IN p_strmode character varying, IN p_strcoid character varying, IN p_struserid character varying, IN p_strmenuid character varying DEFAULT NULL::character varying, IN p_struserbuttons character varying DEFAULT NULL::character varying, INOUT p_result refcursor DEFAULT ('permission_cursor'::character varying)::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    -- GET USER RIGHTS (for this company only)
    IF p_strmode = 'G' THEN

        OPEN p_result FOR
        SELECT
            m.fmenuid::TEXT AS fmenuid,
            MAX(m.fmenuname)::TEXT AS fmenuname,
            m.fmenucaption::TEXT AS fmenucaption,
            m.fmenubuttons::TEXT AS fmenubuttons,
            p_struserid::TEXT AS fuserid,
            COALESCE(up.fuserbuttons::TEXT, '0') AS fuserbuttons,
            LEFT(
                m.fmenuid::TEXT,
                GREATEST(LENGTH(m.fmenuid::TEXT) - 2, 0)
            ) AS fparentid,
            COUNT(up.fuserid)::BIGINT AS fright
        FROM dbo.tblmenu m
        LEFT JOIN dbo.tbluserpermission up
            ON m.fmenuid = up.fmenuid
           AND up.fuserid = p_struserid
           AND up.fcoid = p_strcoid
        GROUP BY
            m.fmenuid,
            m.fmenucaption,
            m.fmenubuttons,
            up.fuserbuttons;

    -- SAVE USER RIGHT (for this company only)
    ELSIF p_strmode = 'S' THEN

        INSERT INTO dbo.tbluserpermission (
            fcoid,
            fuserid,
            fmenuid,
            fuserbuttons
        )
        VALUES (
            p_strcoid,
            p_struserid,
            p_strmenuid,
            COALESCE(p_struserbuttons, '0')
        );

    -- DELETE USER RIGHTS (for this company only)
    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tbluserpermission
        WHERE fuserid = p_struserid
          AND fcoid = p_strcoid;

    ELSE
        RAISE EXCEPTION 'Invalid permission mode: %', p_strmode;
    END IF;

END;
$procedure$;
