CREATE OR REPLACE FUNCTION dbo.fillbranchbyuser(
    p_strcoid   varchar(3),
    p_struserid varchar(30)
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
            b.fbrid,
            b.fbrname
        FROM dbo.tblbranch b
        INNER JOIN dbo.tbluserpermissionbranch p
            ON p.fcoid = b.fcoid
           AND p.fbrid = b.fbrid
        WHERE b.fcoid = p_strcoid
          AND p.fuserid = p_struserid
        ORDER BY b.fbrname;

END;
$$;
