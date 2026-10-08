-- FUNCTION: dbo.sp_havetrans(strcoid character varying, strsearchkey character varying, strsearchvalue character varying)

-- DROP FUNCTION IF EXISTS dbo.sp_havetrans(strcoid character varying, strsearchkey character varying, strsearchvalue character varying);

-- Port of the SQL Server SP_HaveTrans: "is this value already used?"
-- It reads the rule rows of dbo.tblstocksetupdeletion for the search key,
-- and counts the rows of each rule's table / column that hold the value.
-- Returns 1 when it is used, 0 when it is not.
--
--   Select dbo.sp_havetrans('01', 'fUnit', 'NOS.')

CREATE OR REPLACE FUNCTION dbo.sp_havetrans(strcoid character varying, strsearchkey character varying, strsearchvalue character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    intcount INTEGER := 0;
    strtblname VARCHAR(50);
    strfldname VARCHAR(50);
    strsql TEXT;
    result_count INTEGER;
BEGIN

    FOR strtblname, strfldname IN
        SELECT
            TRIM(ftblName),
            TRIM(ffldName)
        FROM dbo.tblstocksetupdeletion
        WHERE fCoID = strcoid
          AND fSearchKey = strsearchkey
    LOOP

        strsql := format(
            'SELECT COUNT(%I)
             FROM dbo.%I
             WHERE fCoID = $1
               AND %I = $2',
            strfldname,
            strtblname,
            strfldname
        );

        EXECUTE strsql
        INTO result_count
        USING strcoid, strsearchvalue;

        intcount := result_count;

        IF intcount > 0 THEN
            intcount := 1;
            EXIT;
        END IF;

    END LOOP;

    RETURN intcount;

END;
$function$;
