-- FUNCTION: dbo.fillfinaccount(p_pstrcoid character varying)

-- DROP FUNCTION IF EXISTS dbo.fillfinaccount(p_pstrcoid character varying);

CREATE OR REPLACE FUNCTION dbo.fillfinaccount(p_pstrcoid character varying)
 RETURNS TABLE(faccountid character varying, faccountname character varying, fgph character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            a.faccountid,
            a.faccountname,
            a.fgph
        FROM dbo.tblaccount a
        WHERE a.fcoid = p_pstrcoid
          AND a.faccountlevel >= 3
        ORDER BY a.faccountid;

END;
$function$;
