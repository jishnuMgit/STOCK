-- FUNCTION: dbo.fillpostingaccount(character varying)

-- DROP FUNCTION IF EXISTS dbo.fillpostingaccount(character varying);

CREATE OR REPLACE FUNCTION dbo.fillpostingaccount(
	p_pstrcoid character varying)
    RETURNS TABLE(faccountid character varying, faccountname character varying) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN

    RETURN QUERY
        SELECT
            a.faccountid,
            a.faccountname
        FROM dbo.tblaccount a
        WHERE a.fcoid = p_pstrcoid
          AND a.fgcs = 'G'
          AND a.fgph = 'H'
        ORDER BY a.faccountid;

END;
$BODY$;

ALTER FUNCTION dbo.fillpostingaccount(character varying)
    OWNER TO postgres;

