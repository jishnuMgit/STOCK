-- FUNCTION: dbo.filllookupsuppliername(character varying)

 DROP FUNCTION IF EXISTS dbo.filllookupsuppliername(character varying);

CREATE OR REPLACE FUNCTION dbo.filllookupsuppliername(
	p_coid character varying)
    RETURNS TABLE(fcsaccountid character varying, fcsaccountname character varying) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    SELECT       
        a.fcsaccountid, 
        a.fcsaccountname
    FROM dbo.tblaccountcs AS a
    WHERE a.fcoid = p_coid 
     AND a.fcs='S'
	 ORDER BY a.fcsaccountname;
END;
$BODY$;

ALTER FUNCTION dbo.filllookupsuppliername(character varying)
    OWNER TO postgres;

