CREATE OR REPLACE PROCEDURE dbo.sp_setcompanyinfo(
    p_strmode              varchar(1),
    p_pstrcoid             varchar(3),
    p_strconame            varchar(100) DEFAULT NULL,
    p_strconame_ar         varchar(100) DEFAULT NULL,
    p_strconame_qr         varchar(30)  DEFAULT NULL,
    p_strconame_short      varchar(30)  DEFAULT NULL,
    p_strcovatno           varchar(15)  DEFAULT NULL,
    p_strcovatno_ar        varchar(15)  DEFAULT NULL,
    p_strcoaddress1        varchar(80)  DEFAULT NULL,
    p_strcoaddress2        varchar(80)  DEFAULT NULL,
    p_strcoaddress3        varchar(80)  DEFAULT NULL,
    p_strcoaddress4        varchar(80)  DEFAULT NULL,
    p_strcoaddress1_ar     varchar(80)  DEFAULT NULL,
    p_strcoaddress2_ar     varchar(80)  DEFAULT NULL,
    p_strcoaddress3_ar     varchar(80)  DEFAULT NULL,
    p_strcoaddress4_ar     varchar(80)  DEFAULT NULL,
    p_strcostatus          varchar(1)   DEFAULT NULL,
    p_pstruserid           varchar(30)  DEFAULT NULL,
    p_result_cursor        refcursor    DEFAULT 'cur_setcompanyinfo'
)
LANGUAGE plpgsql
AS $$
BEGIN

    /* =====================================================
       MODE G — GET
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
                fcoaddress1,
                fcoaddress2,
                fcoaddress3,
                fcoaddress4,
                fcoaddress1_ar,
                fcoaddress2_ar,
                fcoaddress3_ar,
                fcoaddress4_ar,
                fcostatus
            FROM dbo.tblcompany
            WHERE fcoid = p_pstrcoid
            ORDER BY fpositionno, fcoid;

    END IF;


    /* =====================================================
       MODE M — MODIFY
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
            fcoaddress1       = p_strcoaddress1,
            fcoaddress2       = p_strcoaddress2,
            fcoaddress3       = p_strcoaddress3,
            fcoaddress4       = p_strcoaddress4,
            fcoaddress1_ar    = p_strcoaddress1_ar,
            fcoaddress2_ar    = p_strcoaddress2_ar,
            fcoaddress3_ar    = p_strcoaddress3_ar,
            fcoaddress4_ar    = p_strcoaddress4_ar,
            fcostatus         = COALESCE(p_strcostatus, fcostatus),
            fmuserid          = p_pstruserid,
            fmuserdate        = now()
        WHERE fcoid = p_pstrcoid;

    END IF;

END;
$$;
