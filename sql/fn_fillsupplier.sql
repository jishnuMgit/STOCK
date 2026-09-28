CREATE OR REPLACE FUNCTION dbo.fillsupplier(p_strcoid character varying)
 RETURNS TABLE(fcsaccountid character varying, fcsaccountname character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fcsaccountid,
            t.fcsaccountname
        FROM dbo.tblaccountcs t
        WHERE t.fcoid = p_strcoid
          AND t.fcs = 'S'
        ORDER BY t.fcoid ASC, t.fcsaccountid ASC;

END;
$function$
