CREATE OR REPLACE FUNCTION dbo.getuserdefbranch(
    p_pstrcoid   varchar(3),
    p_pstruserid varchar(30)
)
RETURNS varchar(3)
LANGUAGE plpgsql
AS $$
DECLARE
    v_strbrid varchar(3);
BEGIN

    -- Select dbo.getuserdefbranch('01','ADMIN')
    -- Select dbo.getuserdefbranch('01','JACOB')

    SELECT COALESCE(fdefbrid, '')
      INTO v_strbrid
    FROM dbo.tbldefaultbranch
    WHERE fcoid = p_pstrcoid
      AND fuserid = p_pstruserid;

    RETURN v_strbrid;

END;
$$;
