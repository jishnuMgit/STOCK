-- FUNCTION: dbo.getsupplierlist()

-- DROP FUNCTION IF EXISTS dbo.getsupplierlist();

CREATE OR REPLACE FUNCTION dbo.getsupplierlist(
	)
    RETURNS TABLE(fcsaccountid character varying, fcsaccountname character varying, fcs character varying, fbrid character varying, fhavedivision boolean, fgaccountid character varying, fgaccountname character varying) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    SELECT
        a.fcsaccountid,
        a.fcsaccountname,
        a.fcs,
        a.fbrid,
        a.fhavedivision,
        b.faccountid,
        b.faccountname
    FROM dbo.tblaccountcs a
    LEFT JOIN dbo.tblaccount b
        ON a.fgaccountid = b.faccountid
    LEFT JOIN dbo.tblcoasetting c
        ON b.faccountid = c.fgaccountid
    WHERE a.fcs = 'S';
END;
$BODY$;

ALTER FUNCTION dbo.getsupplierlist()
    OWNER TO postgres;