CREATE OR REPLACE FUNCTION dbo.isstockitemexist(
    p_gstrcoid VARCHAR(3),
    p_gintyear SMALLINT,
    p_gstrbrid VARCHAR(3),
    p_stritemid VARCHAR(20)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_blnresult BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM dbo.tblstockcontrol
        WHERE fcoid = p_gstrcoid
          AND fyear = p_gintyear
          AND fbrid = p_gstrbrid
          AND fitemid = p_stritemid
    )
    INTO v_blnresult;

    RETURN v_blnresult;
END;
$$;