-- FUNCTION: dbo.filluserid(p_strcoid character varying)

-- DROP FUNCTION IF EXISTS dbo.filluserid(p_strcoid character varying);

CREATE OR REPLACE FUNCTION dbo.filluserid(p_strcoid character varying)
 RETURNS TABLE(fuserid character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fuserid
        FROM dbo.tbluserlogin t
        WHERE t.fcoid = p_strcoid
          AND t.fuserid <> 'ADMIN'
        ORDER BY t.fuserid;

END;
$function$;
