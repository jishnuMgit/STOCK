-- =========================================================
-- dbo.sp_frmuserlogin   (converted from SQL Server SP_frmUserLogin)
--
-- Modes
--   G   list all users of a company
--   S   insert a user
--   M   modify a user (row identified by p_stroriginal_userid)
--   MP  change password only
--   D1  delete one user
--
-- Notes vs the original T-SQL
--   * Original G read "tbllUserLogin" and S inserted into "tblUser"
--     (typos) - both use dbo.tbluserlogin here.
--   * M: a blank/NULL p_struserpwd keeps the existing password, and a
--     NULL p_numdatevalidity keeps the existing validity (the original
--     always overwrote both).
--   * Password arrives already encrypted (backend does it); this
--     procedure never sees the plain password.
-- =========================================================

CREATE OR REPLACE PROCEDURE dbo.sp_frmuserlogin(
    p_strmode              varchar(2),
    p_pstrcoid             varchar(3)     DEFAULT NULL,
    p_struserid            varchar(30)    DEFAULT NULL,
    p_strusername          varchar(60)    DEFAULT NULL,
    p_struserpwd           varchar(100)   DEFAULT NULL,
    p_strusertype          varchar(2)     DEFAULT NULL,
    p_struserstatus        varchar(1)     DEFAULT NULL,
    p_numdatevalidity      numeric(18,2)  DEFAULT 0,
    p_stroriginal_userid   varchar(30)    DEFAULT NULL,
    p_strmenuname          varchar(50)    DEFAULT NULL,
    p_result_cursor        refcursor      DEFAULT 'cur_frmuserlogin'
)
LANGUAGE plpgsql
AS $$
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
$$;
