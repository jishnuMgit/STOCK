CREATE OR REPLACE FUNCTION dbo.getuserbranches(
    p_strcoid   varchar(3),
    p_struserid varchar(30)
)
RETURNS TABLE (
    fbrid   varchar(3),
    fbrname varchar(40)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_usertype varchar(2);
BEGIN

    v_usertype := dbo.getusertype(p_strcoid, p_struserid);

    IF v_usertype = 'AU' THEN

        RETURN QUERY
            SELECT
                b.fbrid,
                b.fbrname
            FROM dbo.tblbranch b
            WHERE b.fcoid = p_strcoid
            ORDER BY b.fpositionno, b.fbrid;

    ELSE

        RETURN QUERY
            SELECT
                b.fbrid,
                b.fbrname
            FROM dbo.tblbranch b
            WHERE b.fcoid = p_strcoid
              AND b.fbrid IN (
                  SELECT p.fbrid
                  FROM dbo.tbluserpermissionbranch p
                  WHERE p.fcoid = p_strcoid
                    AND p.fuserid = p_struserid
              )
            ORDER BY b.fpositionno, b.fbrid;

    END IF;

END;
$$;
