-- PROCEDURE: dbo.sp_rptmatchenquiry(character varying, character varying, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_rptmatchenquiry(character varying, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptmatchenquiry(
	IN p_pstrcoid character varying,
	IN p_pstryear character varying,
	IN p_lkpbranch character varying,
	IN p_lkpdoctype character varying,
	IN p_lkpdocno character varying,
	INOUT p_cursor refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN

    OPEN p_cursor FOR
    SELECT m.fpc::varchar                     AS fpc,              -- as stored (P / C)
           m.fbrid::varchar                   AS fbrid,
           m.fdoctype::varchar                AS fdoctype,
           m.fdocno::varchar                  AS fdocno,
           m.fdate::date                      AS fdate,
           m.fcsaccountid::varchar            AS fcsaccountid,
           ac.faccountname::varchar           AS fcsaccountname,   -- NULL when the account is not in tblaccount
           b.fdescription::varchar            AS fdescription,     -- description of the matched line from tblarap
           COALESCE(m.fdebit, 0)::numeric(18,2)   AS fdebit,       -- as stored, no swap
           COALESCE(m.fcredit, 0)::numeric(18,2)  AS fcredit,      -- as stored, no swap
           m.fmatchdate::date                 AS fmatchapplydate
      FROM dbo.tblmatchrecords m
      LEFT JOIN LATERAL (
            SELECT x.fdescription
              FROM dbo.tblarap x
             WHERE x.fcoid    = m.fcoid
               AND x.fyear    = m.fyear
               AND x.fbrid    = m.fbrid
               AND x.fdoctype = m.fdoctype
               AND x.fdocno   = m.fdocno
               AND x.fslno    = m.fslno
             ORDER BY x.fslnosub
             LIMIT 1                                               -- one description per line
      ) b ON true
      LEFT JOIN dbo.tblaccount ac
        ON ac.fcoid      = m.fcoid
       AND ac.faccountid = m.fcsaccountid
     WHERE m.fcoid     = p_pstrcoid
       AND m.fpyear    = p_pstryear
       AND m.fpbrid    = p_lkpbranch
       AND m.fpdoctype = p_lkpdoctype
       AND m.fpdocno   = p_lkpdocno
     ORDER BY m.fcsaccountid,
              m.fpc DESC,          -- P first, then C
              m.fyear, m.fbrid, m.fdoctype, m.fdocno, m.fslno;

END;
$BODY$;
ALTER PROCEDURE dbo.sp_rptmatchenquiry(character varying, character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

