-- FUNCTION: dbo.fillfinsetup(p_pstrcoid character varying)

-- DROP FUNCTION IF EXISTS dbo.fillfinsetup(p_pstrcoid character varying);

CREATE OR REPLACE FUNCTION dbo.fillfinsetup(p_pstrcoid character varying)
 RETURNS TABLE(fname character varying, ftype character varying, fpositionno integer)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fname::varchar(100),
            t.ftype::varchar(10),
            t.fpositionno::integer
        FROM dbo.tblfinsetup t
        WHERE t.fcoid = p_pstrcoid
        GROUP BY t.fname, t.ftype, t.fpositionno
        ORDER BY t.fpositionno;

END;
$function$;
