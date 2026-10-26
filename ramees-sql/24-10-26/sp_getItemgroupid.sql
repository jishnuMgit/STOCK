CREATE OR REPLACE FUNCTION dbo.getitemgroupid(
    pstrcoid VARCHAR(3),
    stritemid VARCHAR(40)
)
RETURNS VARCHAR(12)
LANGUAGE plpgsql
AS $$
DECLARE
    v_strresult VARCHAR(12);
BEGIN
    SELECT fitemgroupid
    INTO v_strresult
    FROM dbo.tblitemhd
    WHERE fcoid = pstrcoid
      AND fitemid = stritemid;

    RETURN v_strresult;
END;
$$;