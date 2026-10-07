-- PROCEDURE: dbo.sp_pageuserpermissionbranch(IN p_strmode character varying, IN p_strcoid character varying, IN p_struserid character varying, IN p_strbrid character varying, INOUT p_result refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pageuserpermissionbranch(IN p_strmode character varying, IN p_strcoid character varying, IN p_struserid character varying, IN p_strbrid character varying, INOUT p_result refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageuserpermissionbranch(IN p_strmode character varying, IN p_strcoid character varying DEFAULT NULL::character varying, IN p_struserid character varying DEFAULT NULL::character varying, IN p_strbrid character varying DEFAULT NULL::character varying, INOUT p_result refcursor DEFAULT 'cobranch_cursor'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'GetCo' THEN
        OPEN p_result FOR
            SELECT fcoid, fconame
            FROM dbo.tblcompany
            ORDER BY fpositionno, fcoid;
    END IF;

    IF p_strmode = 'GetBr' THEN
        OPEN p_result FOR
            SELECT fbrid, fbrname
            FROM dbo.tblbranch
            WHERE fcoid = p_strcoid
            ORDER BY fpositionno, fbrid;
    END IF;

    IF p_strmode = 'GetCoBr' THEN
        OPEN p_result FOR
            SELECT c.fcoid, c.fconame, b.fbrid, b.fbrname
            FROM dbo.tblcompany c
            LEFT JOIN dbo.tblbranch b ON b.fcoid = c.fcoid
            WHERE p_strcoid IS NULL OR c.fcoid = p_strcoid
            ORDER BY c.fpositionno, c.fcoid, b.fpositionno, b.fbrid;
    END IF;

    IF p_strmode = 'S' THEN
        INSERT INTO dbo.tbluserpermissionbranch (fuserid, fcoid, fbrid)
        VALUES (p_struserid, p_strcoid, p_strbrid);
    END IF;

    IF p_strmode = 'D' THEN
        DELETE FROM dbo.tbluserpermissionbranch
        WHERE fuserid = p_struserid;
    END IF;

END;
$procedure$;
