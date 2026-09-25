CREATE OR REPLACE FUNCTION dbo.fillyear(
    p_strcoid varchar(3)
)
RETURNS TABLE (
    fyear smallint
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT DISTINCT
            t.fyear
        FROM dbo.tblyear t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.fyear;

END;
$$;
