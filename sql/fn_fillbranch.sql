CREATE OR REPLACE FUNCTION dbo.fillbranch(
    p_strcoid varchar(3)
)
RETURNS TABLE (
    fbrid   varchar(3),
    fbrname varchar(40)
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT
            t.fbrid,
            t.fbrname
        FROM dbo.tblbranch t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.fbrname;

END;
$$;
