-- PROCEDURE: dbo.sp_pagematchenquiry(character varying, character varying, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagematchenquiry(character varying, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagematchenquiry(
	IN p_pstrcoid character varying,
	IN p_pstryear character varying DEFAULT '0'::character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	INOUT p_result refcursor DEFAULT 'matchenquiry_cursor'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    OPEN p_result FOR
    SELECT
        a.fcoid,
        a.fyear::varchar(4)      AS fyear,
        a.fbrid,
        a.fdoctype,
        a.fdoctypeno as fdocno,
        a.fdate,
        a.fcsaccountid,
        b.fdescription,
        a.fslno,
        COALESCE(a.fdebit, 0)    AS fdebit,    -- as stored, no swap
        COALESCE(a.fcredit, 0)   AS fcredit,   -- as stored, no swap
        a.fmatchdate             AS fmatchapplydate,
        a.fpc                    AS fpc        -- as stored (P / C)
    FROM dbo.tblmatchrecords a
    LEFT JOIN dbo.tblarap b
           ON b.fcoid    = a.fcoid
          AND b.fyear    = a.fyear
          AND b.fbrid    = a.fbrid
          AND b.fdoctype = a.fdoctype
          AND b.fdocno   = a.fdocno
          AND b.fslno    = a.fslno
    WHERE a.fcoid     = p_pstrcoid
      AND a.fpyear    = p_pstryear
      AND a.fpbrid    = p_strbrid
      AND a.fpdoctype = p_strdoctype
      AND a.fpdocno   = p_strdocno
    ORDER BY
        a.fpc DESC,      -- P first, then C
        a.fslno ASC;
END;
$BODY$;
ALTER PROCEDURE dbo.sp_pagematchenquiry(character varying, character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

