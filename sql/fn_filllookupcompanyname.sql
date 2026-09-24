CREATE OR REPLACE FUNCTION dbo.filllookupcompanyname()
RETURNS TABLE (
    fcoid   varchar(3),
    fconame varchar(100)
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT
            t.fcoid,
            t.fconame
        FROM dbo.tblcompany t
        WHERE t.fcostatus = 'A'
        ORDER BY t.fpositionno;

END;
$$;
