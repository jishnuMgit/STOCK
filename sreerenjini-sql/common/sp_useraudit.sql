-- PROCEDURE: dbo.sp_useraudit(IN p_strcoid character varying, IN p_stryear character varying, IN p_strbrid character varying, IN p_strdoctype character varying, IN p_strdocno character varying, IN p_strscreenname character varying, IN p_straction character varying, IN p_strnote character varying, IN p_struserid character varying)

-- DROP PROCEDURE IF EXISTS dbo.sp_useraudit(IN p_strcoid character varying, IN p_stryear character varying, IN p_strbrid character varying, IN p_strdoctype character varying, IN p_strdocno character varying, IN p_strscreenname character varying, IN p_straction character varying, IN p_strnote character varying, IN p_struserid character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_useraudit(IN p_strcoid character varying DEFAULT NULL::character varying, IN p_stryear character varying DEFAULT NULL::character varying, IN p_strbrid character varying DEFAULT NULL::character varying, IN p_strdoctype character varying DEFAULT NULL::character varying, IN p_strdocno character varying DEFAULT NULL::character varying, IN p_strscreenname character varying DEFAULT NULL::character varying, IN p_straction character varying DEFAULT NULL::character varying, IN p_strnote character varying DEFAULT NULL::character varying, IN p_struserid character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    INSERT INTO dbo.tbluseraudit
    (
        fcoid,
        fyear,
        fbrid,
        fdoctype,
        fscreenname,
        fscreenkey,
        faction,
        fnote,
        fuserid,
        fuserdate
    )
    VALUES
    (
        p_strcoid,
        p_stryear,
        p_strbrid,
        p_strdoctype,
        p_strscreenname,
        COALESCE(p_strbrid, '')
            || COALESCE(p_strdoctype, '')
            || COALESCE(p_strdocno, ''),
        p_straction,
        p_strnote,
        p_struserid,
        CURRENT_TIMESTAMP
    );

END;
$procedure$;
