-- FUNCTION: dbo.getnexttransno(character varying, character varying, character varying, character varying)

-- Your function, with only the type fixes it needs to run (each marked "was:"):
--   1. fSavingTransNo / fPostingTransNo are text, so MAX(...) must be read as a
--      number before "+ 1"          ->  MAX(...::BIGINT)
--   2. fYear is a smallint but pstryear is text  ->  pstryear::SMALLINT
-- The logic is unchanged: the first number of a year is YY + 000000 + 1
-- (260000001), then the highest + 1. Saving and posting are counted separately.
-- Needs the two columns of alter_tblstocktrans_transno.sql.

-- DROP FUNCTION IF EXISTS dbo.getnexttransno(character varying, character varying, character varying, character varying);

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
          AND fYear = pstryear::SMALLINT                          -- was: fYear = pstryear
          AND fBrID = strbrid;

    ELSE

        -- Posting
        SELECT COALESCE(MAX(fPostingTransNo::BIGINT), 0) + 1     -- was: MAX(fPostingTransNo)
        INTO nextno
        FROM dbo.tblStockTrans
        WHERE fCoID = pstrcoid
          AND fYear = pstryear::SMALLINT                          -- was: fYear = pstryear
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
