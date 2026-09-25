CREATE OR REPLACE FUNCTION dbo.fillmodule(
    p_strcoid varchar(3)
)
RETURNS TABLE (
    fmoduleid   varchar(4),
    fmodulename varchar(40)
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT
            t.fmoduleid,
            t.fmodulename
        FROM dbo.tblmodule t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.fpositionno;

END;
$$;
