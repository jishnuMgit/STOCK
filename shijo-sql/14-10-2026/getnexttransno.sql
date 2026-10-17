-- FUNCTION: dbo.getnexttransno(character varying, character varying, character varying, character varying)
 DROP FUNCTION IF EXISTS dbo.getnexttransno(character varying, character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION dbo.getnexttransno(
	pstrcoid character varying,
	pstryear character varying,
	strbrid character varying,
	strsavingposting character varying)
    RETURNS character varying
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    strnexttransno VARCHAR(9);
    nextno BIGINT;
BEGIN

    IF strsavingposting = 'S' THEN

        -- Saving
        SELECT COALESCE(MAX(fSavingTransNo::BIGINT), 0) + 1      -- was: MAX(fSavingTransNo)
        INTO nextno
        FROM dbo.tblStockTrans
        WHERE fCoID = pstrcoid
          AND fYear = pstryear                        -- was: fYear = pstryear
          AND fBrID = strbrid;

    ELSE

        -- Posting
        SELECT COALESCE(MAX(fPostingTransNo::BIGINT), 0) + 1     -- was: MAX(fPostingTransNo)
        INTO nextno
        FROM dbo.tblStockTrans
        WHERE fCoID = pstrcoid
          AND fYear = pstryear                         -- was: fYear = pstryear
          AND fBrID = strbrid;

    END IF;

    -- First transaction
    IF nextno = 1 THEN
        strnexttransno :=
            RIGHT(pstryear, 2) ||
            '000000' ||
            nextno::VARCHAR;
    ELSE
        strnexttransno := nextno::VARCHAR;
    END IF;

    RETURN strnexttransno;

END;
$BODY$;

ALTER FUNCTION dbo.getnexttransno(character varying, character varying, character varying, character varying)
    OWNER TO postgres;

