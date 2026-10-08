DROP FUNCTION IF EXISTS dbo.getcustsupcountry(character varying);

CREATE FUNCTION dbo.getcustsupcountry(
    p_strcoid character varying)
    RETURNS TABLE(
        fcountryname character varying,
        fcountryname_a character varying,
        fcountryid character varying,
        fpositionno smallint
    )
    LANGUAGE plpgsql
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000
AS $BODY$
BEGIN
    RETURN QUERY
    SELECT
        c.fcountryname,
        c.fcountryname_a,
        c.fcountryid,
        c.fpositionno
    FROM dbo.tblcustsupcountry c
    WHERE c.fcoid = p_strcoid
    ORDER BY c.fpositionno;
END;
$BODY$;

ALTER FUNCTION dbo.getcustsupcountry(character varying)
    OWNER TO postgres;