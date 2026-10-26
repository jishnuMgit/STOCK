CREATE OR REPLACE FUNCTION dbo.getnexttransno(
    pstrcoid VARCHAR(3),
    pstryear VARCHAR(4),
    strbrid VARCHAR(3),
    strsavingposting VARCHAR(1)
)
RETURNS VARCHAR(9)
LANGUAGE plpgsql
AS $$
DECLARE
    v_strnexttransno BIGINT;
    v_result VARCHAR(9);
BEGIN
    IF strsavingposting = 'S' THEN
        -- Saving
        SELECT COALESCE(MAX(fsavingno::BIGINT), 0) + 1
        INTO v_strnexttransno
        FROM dbo.tblstocktrans
        WHERE fcoid = pstrcoid
          AND fyear = pstryear
          AND fbrid = strbrid;
    ELSE
        -- Posting
        SELECT COALESCE(MAX(fpostingno::BIGINT), 0) + 1
        INTO v_strnexttransno
        FROM dbo.tblstocktrans
        WHERE fcoid = pstrcoid
          AND fyear = pstryear
          AND fbrid = strbrid;
    END IF;

    IF v_strnexttransno = 1 THEN
        v_result := RIGHT(pstryear, 2)
                    || '000000'
                    || v_strnexttransno::VARCHAR;
    ELSE
        v_result := v_strnexttransno::VARCHAR;
    END IF;

    RETURN v_result;
END;
$$;