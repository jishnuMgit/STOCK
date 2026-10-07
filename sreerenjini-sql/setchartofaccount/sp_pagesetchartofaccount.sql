-- PROCEDURE: dbo.sp_pagesetchartofaccount(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_intslno smallint, IN p_strtype character varying, IN p_straccountid character varying, IN p_strgph character varying, IN p_intoriginal_slno smallint, IN p_stroriginal_type character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagesetchartofaccount(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_intslno smallint, IN p_strtype character varying, IN p_straccountid character varying, IN p_strgph character varying, IN p_intoriginal_slno smallint, IN p_stroriginal_type character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagesetchartofaccount(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_intslno smallint DEFAULT 0, IN p_strtype character varying DEFAULT NULL::character varying, IN p_straccountid character varying DEFAULT NULL::character varying, IN p_strgph character varying DEFAULT NULL::character varying, IN p_intoriginal_slno smallint DEFAULT 0, IN p_stroriginal_type character varying DEFAULT NULL::character varying, IN p_pstruserid character varying DEFAULT NULL::character varying, IN p_result_cursor refcursor DEFAULT 'cur_setchartofaccount'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'G' THEN
        OPEN p_result_cursor FOR
            SELECT fslno, ftype, fgaccountid, fgph
            FROM dbo.tblcoasetting
            WHERE fcoid = p_pstrcoid
            ORDER BY fslno;
    END IF;

    IF p_strmode = 'S1' THEN
        INSERT INTO dbo.tblcoasetting (
            fcoid, fslno, ftype, fgaccountid, fgph, fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_intslno, p_strtype, p_straccountid, p_strgph,
            p_pstruserid, now()
        );
    END IF;

    IF p_strmode = 'M1' THEN
        UPDATE dbo.tblcoasetting
        SET fslno       = p_intslno,
            ftype       = p_strtype,
            fgaccountid = p_straccountid,
            fgph        = p_strgph,
            fmuserid    = p_pstruserid,
            fmuserdate  = now()
        WHERE fcoid = p_pstrcoid
          AND ftype = p_stroriginal_type
          AND fslno = p_intoriginal_slno;
    END IF;

    IF p_strmode = 'D1' THEN
        DELETE FROM dbo.tblcoasetting
        WHERE fcoid = p_pstrcoid
          AND ftype = p_stroriginal_type
          AND fslno = p_intoriginal_slno;
    END IF;

END;
$procedure$;
