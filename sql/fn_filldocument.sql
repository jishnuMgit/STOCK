CREATE OR REPLACE FUNCTION dbo.filldocument(
    p_strcoid     varchar(3),
    p_strmoduleid varchar(4)
)
RETURNS TABLE (
    fdoctype varchar(5),
    fdocname varchar(40)
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT
            t.fdoctype,
            t.fdocname
        FROM dbo.tbldocument t
        WHERE t.fcoid = p_strcoid
          AND t.fmoduleid = p_strmoduleid
        ORDER BY t.fpositionno;

END;
$$;
