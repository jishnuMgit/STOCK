-- FUNCTION: dbo.getprefixlen(character varying, character varying, character varying, character varying)

-- DROP FUNCTION IF EXISTS dbo.getprefixlen(character varying, character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION dbo.getprefixlen(
	p_pstrcoid character varying,
	p_pstryear character varying,
	p_strbrid character varying,
	p_strdoctype character varying)
    RETURNS character varying
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    v_result integer;
BEGIN

    SELECT length(fdocnoprefix)
    INTO v_result
    FROM dbo.tbldocumentno
    WHERE fcoid = p_pstrcoid
      AND fyear = p_pstryear
      AND fbrid = p_strbrid
      AND fdoctype = p_strdoctype;

    RETURN COALESCE(v_result, 0)::varchar(15);

END;
$BODY$;

ALTER FUNCTION dbo.getprefixlen(character varying, character varying, character varying, character varying)
    OWNER TO postgres;