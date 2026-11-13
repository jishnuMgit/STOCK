-- FUNCTION: dbo.filllookupzatcastockparam(character varying)

-- DROP FUNCTION IF EXISTS dbo.filllookupzatcastockparam(character varying);

CREATE OR REPLACE FUNCTION dbo.filllookupzatcastockparam(
	p_pstrcoid character varying)
    RETURNS TABLE(fpid character varying, fpname character varying) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
begin
    return query
    select
        s.fpid,
        s.fpname
    from dbo.tblstockparam s
    where s.fcoid = p_pstrcoid
      and s.fptype = 'INVDT'
    order by s.fpositionno;
end;
$BODY$;

ALTER FUNCTION dbo.filllookupzatcastockparam(character varying)
    OWNER TO postgres;

