-- FUNCTION: dbo.fillyear(p_strcoid character varying)

-- DROP FUNCTION IF EXISTS dbo.fillyear(p_strcoid character varying);

CREATE OR REPLACE FUNCTION dbo.fillyear(p_strcoid character varying)
 RETURNS TABLE(fyear smallint)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT DISTINCT
            t.fyear
        FROM dbo.tblyear t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.fyear;

END;
$function$;
