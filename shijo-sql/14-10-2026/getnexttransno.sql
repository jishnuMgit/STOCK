CREATE OR REPLACE FUNCTION dbo.getnexttransno(
    p_pstrcoid VARCHAR(3),
    p_pstryear VARCHAR(4),
    p_strbrid VARCHAR(3),
    p_strsavingposting VARCHAR(1)
)
RETURNS VARCHAR(9)
LANGUAGE plpgsql
AS $$
DECLARE
    v_strnexttransno BIGINT;
    v_result VARCHAR(9);
BEGIN
    IF p_strsavingposting = 'S' THEN
        -- saving transaction number
        SELECT COALESCE(MAX(fsavingtransno), 0) + 1
        INTO v_strnexttransno
        FROM dbo.tblstocktrans
        WHERE fcoid = p_pstrcoid
          AND fyear::VARCHAR = p_pstryear
          AND fbrid = p_strbrid;
    ELSE
        -- posting transaction number
        SELECT COALESCE(MAX(fpostingtransno), 0) + 1
        INTO v_strnexttransno
        FROM dbo.tblstocktrans
        WHERE fcoid = p_pstrcoid
          AND fyear::VARCHAR = p_pstryear
          AND fbrid = p_strbrid;
    END IF;

    IF v_strnexttransno = 1 THEN
        v_result := RIGHT(p_pstryear, 2) || '000000' || v_strnexttransno::VARCHAR;
    ELSE
        v_result := v_strnexttransno::VARCHAR;
    END IF;

    RETURN v_result;
END;
$$;