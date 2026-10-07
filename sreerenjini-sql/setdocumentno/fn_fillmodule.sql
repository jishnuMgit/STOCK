-- FUNCTION: dbo.fillmodule(p_strcoid character varying)

-- DROP FUNCTION IF EXISTS dbo.fillmodule(p_strcoid character varying);

CREATE OR REPLACE FUNCTION dbo.fillmodule(p_strcoid character varying)
 RETURNS TABLE(fmoduleid character varying, fmodulename character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fmoduleid,
            t.fmodulename
        FROM dbo.tblmodule t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.fpositionno;

END;
$function$;
