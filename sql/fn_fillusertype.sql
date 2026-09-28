CREATE OR REPLACE FUNCTION dbo.fillusertype(p_strcoid character varying)
 RETURNS TABLE(fpid character varying, fpname character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fpid,
            t.fpname
        FROM dbo.tbluserparam t
        WHERE t.fcoid = p_strcoid
          AND t.fptype = 'USERTP'
        ORDER BY t.fpositionno, t.fpid;

END;
$function$
