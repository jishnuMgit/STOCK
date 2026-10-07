-- PROCEDURE: dbo.sp_pageuserlogin(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_struserid character varying, IN p_strusername character varying, IN p_struserpwd character varying, IN p_strusertype character varying, IN p_struserstatus character varying, IN p_numdatevalidity numeric, IN p_stroriginal_userid character varying, IN p_strmenuname character varying, IN p_result_cursor refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pageuserlogin(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_struserid character varying, IN p_strusername character varying, IN p_struserpwd character varying, IN p_strusertype character varying, IN p_struserstatus character varying, IN p_numdatevalidity numeric, IN p_stroriginal_userid character varying, IN p_strmenuname character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageuserlogin(IN p_strmode character varying, IN p_pstrcoid character varying DEFAULT NULL::character varying, IN p_struserid character varying DEFAULT NULL::character varying, IN p_strusername character varying DEFAULT NULL::character varying, IN p_struserpwd character varying DEFAULT NULL::character varying, IN p_strusertype character varying DEFAULT NULL::character varying, IN p_struserstatus character varying DEFAULT NULL::character varying, IN p_numdatevalidity numeric DEFAULT 0, IN p_stroriginal_userid character varying DEFAULT NULL::character varying, IN p_strmenuname character varying DEFAULT NULL::character varying, IN p_result_cursor refcursor DEFAULT 'cur_userlogin'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    /* =====================================================
       MODE G - GET
    ===================================================== */

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                fuserid,
                fusername,
                fuserpwd,
                fusertype,
                fuserstatus,
                fdatevalidity
            FROM dbo.tbluserlogin
            WHERE fcoid = p_pstrcoid
            ORDER BY fuserid;

    END IF;

    /* =====================================================
       MODE S - SAVE (insert)
    ===================================================== */

    IF p_strmode = 'S' THEN

        INSERT INTO dbo.tbluserlogin (
            fcoid,
            fuserid,
            fusername,
            fuserpwd,
            fusertype,
            fuserstatus,
            fdatevalidity
        )
        VALUES (
            p_pstrcoid,
            p_struserid,
            p_strusername,
            p_struserpwd,
            p_strusertype,
            p_struserstatus,
            COALESCE(p_numdatevalidity, 0)
        );

    END IF;

    /* =====================================================
       MODE M - MODIFY
    ===================================================== */

    IF p_strmode = 'M' THEN

        UPDATE dbo.tbluserlogin
        SET
            fuserid       = p_struserid,
            fusername     = p_strusername,
            fuserpwd      = COALESCE(NULLIF(p_struserpwd, ''), fuserpwd),
            fusertype     = p_strusertype,
            fuserstatus   = p_struserstatus,
            fdatevalidity = COALESCE(p_numdatevalidity, fdatevalidity)
        WHERE fcoid = p_pstrcoid
          AND fuserid = p_stroriginal_userid;

    END IF;

    /* =====================================================
       MODE MP - MODIFY PASSWORD ONLY
    ===================================================== */

    IF p_strmode = 'MP' THEN

        UPDATE dbo.tbluserlogin
        SET fuserpwd = p_struserpwd
        WHERE fcoid = p_pstrcoid
          AND fuserid = p_struserid;

    END IF;

    /* =====================================================
       MODE D1 - DELETE ONE
    ===================================================== */

    IF p_strmode = 'D1' THEN

        DELETE FROM dbo.tbluserlogin
        WHERE fcoid = p_pstrcoid
          AND fuserid = p_stroriginal_userid;

    END IF;

END;
$procedure$;
