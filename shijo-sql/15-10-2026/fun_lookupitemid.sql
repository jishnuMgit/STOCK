-- FUNCTION: dbo.filllookupitemid(character varying)

-- DROP FUNCTION IF EXISTS dbo.filllookupitemid(character varying);

CREATE OR REPLACE FUNCTION dbo.filllookupitemid(
	p_pstrcoid character varying)
    RETURNS TABLE(fitemid character varying, fitemname character varying, fbrid character varying, fpacking character varying, fitemgroupid character varying, fallowsalebelowcost boolean, finactive boolean) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
begin
    return query
    select
        a.fitemid::varchar,
        b.fitemname::varchar,
        a.fbrid::varchar,
        b.fpacking::varchar,
        b.fitemgroupid::varchar,
        a.fallowsalebelowcost::boolean,
        a.finactive::boolean
    from dbo.tblitemtl a
    left join dbo.tblitemhd b
        on a.fcoid = b.fcoid
       and a.fitemid = b.fitemid
    where a.fcoid = p_pstrcoid
    order by a.fitemid;
end;
$BODY$;

ALTER FUNCTION dbo.filllookupitemid(character varying)
    OWNER TO postgres;

