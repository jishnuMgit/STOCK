CREATE OR REPLACE FUNCTION dbo.fillitemgroup(p_strcoid character varying)
 RETURNS TABLE(fitemgroupid character varying, fitemgroupname character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fitemgroupid,
            t.fitemgroupname
        FROM dbo.tblitemgroup t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.fitemgroupid;

END;
$function$
