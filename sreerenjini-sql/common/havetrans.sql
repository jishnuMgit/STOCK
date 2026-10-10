-- FUNCTION: dbo.havetrans(strcoid, strsearchkey, strsearchvalue)
--
-- "Is this value already used?" - the one function every page uses for its
-- delete / modify check. It reads the rule rows of BOTH setup deletion tables
-- (dbo.tblfinsetupdeletion and dbo.tblstocksetupdeletion) for the search key,
-- and counts the rows of each rule's table / column that hold the value.
-- Returns 1 when it is used, 0 when it is not.
--
-- (Given as is by the team - not changed here.)
--
--   SELECT dbo.havetrans('01', 'fUnit', 'NOS.')

CREATE OR REPLACE FUNCTION dbo.havetrans
(
    strcoid VARCHAR,
    strsearchkey VARCHAR,
    strsearchvalue VARCHAR
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $BODY$
DECLARE
    intcount INTEGER := 0;
    strtblname VARCHAR(50);
    strfldname VARCHAR(50);
    strsql TEXT;
    result_count INTEGER;
BEGIN

    -- Check both financial and stock setup deletion tables
    FOR strtblname, strfldname IN
        SELECT TRIM(ftblname), TRIM(ffldname)
        FROM dbo.tblfinsetupdeletion
        WHERE fcoid = strcoid
          AND fsearchkey = strsearchkey
          AND ftblname IS NOT NULL
          AND ffldname IS NOT NULL

        UNION ALL

        SELECT TRIM(ftblname), TRIM(ffldname)
        FROM dbo.tblstocksetupdeletion
        WHERE fcoid = strcoid
          AND fsearchkey = strsearchkey
          AND ftblname IS NOT NULL
          AND ffldname IS NOT NULL
    LOOP

        strsql := format(
            'SELECT COUNT(*)
             FROM dbo.%I
             WHERE fcoid = $1
               AND %I = $2',
            strtblname,
            strfldname
        );

        EXECUTE strsql
        INTO result_count
        USING strcoid, strsearchvalue;

        IF result_count > 0 THEN
            intcount := 1;
            EXIT;
        END IF;

    END LOOP;

    RETURN intcount;

END;
$BODY$;

ALTER FUNCTION dbo.havetrans(VARCHAR, VARCHAR, VARCHAR)
    OWNER TO postgres;
