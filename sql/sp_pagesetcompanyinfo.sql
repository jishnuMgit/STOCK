-- Settings/SetCompanyInfo (converted from SQL Server SP_frmSetCompanyInfo).
-- Company before user, as everywhere else.
--
-- The company ADDRESS columns (fcoaddress1-4 and the _ar ones) were
-- removed from tblcompany and from this procedure, so the parameter
-- list changed: run sql/alter_tblcompany_drop_address.sql first - it
-- drops the old 19-parameter version, which CREATE OR REPLACE cannot do.
--
-- Modes
--   G   the company's details
--   M   update the company's details
CREATE OR REPLACE PROCEDURE dbo.sp_pagesetcompanyinfo(
    p_strmode              varchar(1),
    p_pstrcoid             varchar(3),
    p_strconame            varchar(100) DEFAULT NULL,
    p_strconame_ar         varchar(100) DEFAULT NULL,
    p_strconame_qr         varchar(30)  DEFAULT NULL,
    p_strconame_short      varchar(30)  DEFAULT NULL,
    p_strcovatno           varchar(15)  DEFAULT NULL,
    p_strcovatno_ar        varchar(15)  DEFAULT NULL,
    p_strcostatus          varchar(1)   DEFAULT NULL,
    p_pstruserid           varchar(30)  DEFAULT NULL,
    p_result_cursor        refcursor    DEFAULT 'cur_setcompanyinfo'
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
                fcoid,
                fconame,
                fconame_ar,
                fconame_qr,
                fconame_short,
                fcovatno,
                fcovatno_ar,
                fcostatus
            FROM dbo.tblcompany
            WHERE fcoid = p_pstrcoid
            ORDER BY fpositionno, fcoid;

    END IF;


    /* =====================================================
       MODE M - MODIFY
    ===================================================== */

    IF p_strmode = 'M' THEN

        UPDATE dbo.tblcompany
        SET
            fconame           = COALESCE(p_strconame, fconame),
            fconame_ar        = p_strconame_ar,
            fconame_qr        = p_strconame_qr,
            fconame_short     = p_strconame_short,
            fcovatno          = p_strcovatno,
            fcovatno_ar       = p_strcovatno_ar,
            fcostatus         = COALESCE(p_strcostatus, fcostatus),
            fmuserid          = p_pstruserid,
            fmuserdate        = now()
        WHERE fcoid = p_pstrcoid;

    END IF;

END;
$$;
