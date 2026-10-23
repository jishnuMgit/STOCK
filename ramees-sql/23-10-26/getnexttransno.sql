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

    -- tblstocktrans has a single transaction-number column, ftransno.
    -- fSavingTransNo and fPostingTransNo do not exist, so both the
    -- saving ('S') and posting ('P') branches read ftransno.
    -- fyear is varchar, so it is compared with the varchar parameter
    -- (the old "pstryear::SMALLINT" cast caused varchar = smallint).
    -- NULLIF(...,'') ignores empty values so the BIGINT cast cannot fail on them.

    IF strsavingposting = 'S' THEN

        -- Saving
        SELECT COALESCE(MAX(NULLIF(ftransno, '')::BIGINT), 0) + 1
        INTO nextno
        FROM dbo.tblstocktrans
        WHERE fcoid = pstrcoid
          AND fyear = pstryear
          AND fbrid = strbrid;

    ELSE

        -- Posting
        SELECT COALESCE(MAX(NULLIF(ftransno, '')::BIGINT), 0) + 1
        INTO nextno
        FROM dbo.tblstocktrans
        WHERE fcoid = pstrcoid
          AND fyear = pstryear
          AND fbrid = strbrid;

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