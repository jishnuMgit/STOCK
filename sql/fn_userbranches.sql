CREATE OR REPLACE FUNCTION dbo.userbranches(
    p_pstrcoid   varchar(3),
    p_strbrid    varchar(3),
    p_pstruserid varchar(30)
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_usertype varchar(2);
    v_temp     varchar(3);
    v_result   boolean := false;
BEGIN

    v_usertype := dbo.getusertype(p_pstrcoid, p_pstruserid);

    IF v_usertype = 'AU' THEN

        v_result := true;

    ELSE

        SELECT fbrid INTO v_temp
        FROM dbo.tbluserpermissionbranch
        WHERE fcoid = p_pstrcoid
          AND fbrid = p_strbrid
          AND fuserid = p_pstruserid;

        IF NOT dbo.isnullorempty(v_temp) THEN
            v_result := true;
        END IF;

    END IF;

    RETURN v_result;

END;
$$;
