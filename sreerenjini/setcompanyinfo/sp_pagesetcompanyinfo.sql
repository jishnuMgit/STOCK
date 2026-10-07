-- PROCEDURE: dbo.sp_pagesetcompanyinfo(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagesetcompanyinfo(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagesetcompanyinfo(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_strconame character varying DEFAULT NULL::character varying,
	IN p_strconame_ar character varying DEFAULT NULL::character varying,
	IN p_strconame_qr character varying DEFAULT NULL::character varying,
	IN p_strconame_short character varying DEFAULT NULL::character varying,
	IN p_strcovatno character varying DEFAULT NULL::character varying,
	IN p_strcovatno_ar character varying DEFAULT NULL::character varying,
	IN p_strcostatus character varying DEFAULT NULL::character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	IN p_result_cursor refcursor DEFAULT 'cur_setcompanyinfo'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
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
$BODY$;
ALTER PROCEDURE dbo.sp_pagesetcompanyinfo(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

