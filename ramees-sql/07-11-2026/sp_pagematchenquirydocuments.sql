-- PROCEDURE: dbo.sp_pagematchenquirydocuments(character varying, character varying, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagematchenquirydocuments(character varying, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagematchenquirydocuments(
	IN p_pstrcoid character varying,
	IN p_pstryear character varying DEFAULT '0'::character varying,
	IN p_lkpcsaccountid character varying DEFAULT NULL::character varying,
	IN p_lkpdivision character varying DEFAULT NULL::character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	INOUT p_result_cursor refcursor DEFAULT 'cur_matchenquirydocuments'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    OPEN p_result_cursor FOR
    SELECT
        a.fbrid                                   AS fbrid,
        a.fdoctype                                AS fdoctype,
        a.fdocno                                  AS fdocno,
        (a.fdoctype || ' ' || a.fdocno)::varchar  AS fdoctypeno,
        MIN(a.fdate)                              AS fdate,
        MAX(a.fdescription)                       AS fdescription,
        SUM(COALESCE(a.fdebit, 0))                AS fdebit,
        SUM(COALESCE(a.fcredit, 0))               AS fcredit
    FROM dbo.tblarap a
    WHERE a.fcoid = p_pstrcoid
      AND a.fyear::varchar(4) = p_pstryear
      AND a.fcsaccountid = p_lkpcsaccountid
      AND a.fmatch = true
	  AND a.fcredit >0
    GROUP BY a.fbrid, a.fdoctype, a.fdocno
    ORDER BY MIN(a.fdate), a.fbrid, a.fdoctype, a.fdocno;
END;
$BODY$;
ALTER PROCEDURE dbo.sp_pagematchenquirydocuments(character varying, character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

