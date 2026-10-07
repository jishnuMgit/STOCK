-- FUNCTION: dbo.filldocument(p_strcoid character varying, p_strmoduleid character varying)

-- DROP FUNCTION IF EXISTS dbo.filldocument(p_strcoid character varying, p_strmoduleid character varying);

CREATE OR REPLACE FUNCTION dbo.filldocument(p_strcoid character varying, p_strmoduleid character varying)
 RETURNS TABLE(fdoctype character varying, fdocname character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fdoctype,
            t.fdocname
        FROM dbo.tbldocument t
        WHERE t.fcoid = p_strcoid
          AND t.fmoduleid = p_strmoduleid
        ORDER BY t.fpositionno;

END;
$function$;
