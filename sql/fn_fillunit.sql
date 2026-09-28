CREATE OR REPLACE FUNCTION dbo.fillunit(p_strcoid character varying)
 RETURNS TABLE(funit character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.funit
        FROM dbo.tblunit t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.funit;

END;
$function$
