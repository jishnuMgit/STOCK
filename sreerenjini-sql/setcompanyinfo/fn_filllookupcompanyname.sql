-- FUNCTION: dbo.filllookupcompanyname(character varying)

-- DROP FUNCTION IF EXISTS dbo.filllookupcompanyname(character varying);

CREATE OR REPLACE FUNCTION dbo.filllookupcompanyname(
	p_pstrcoid character varying)
    RETURNS TABLE(fcoid character varying, fconame character varying) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
  BEGIN
      RETURN QUERY
          SELECT t.fcoid, t.fconame
          FROM dbo.tblcompany t
          WHERE t.fcostatus = 'A'
            AND t.fcoid = p_pstrcoid
          ORDER BY t.fpositionno;
  END;
  
$BODY$;

ALTER FUNCTION dbo.filllookupcompanyname(character varying)
    OWNER TO postgres;

