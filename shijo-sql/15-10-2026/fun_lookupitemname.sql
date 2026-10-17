create or replace function dbo.filllookupitemname(
    p_pstrcoid character varying
)
returns table
(
    fitemid character varying,
    fitemname character varying,
    fbrid character varying,
    fpacking character varying,
    fitemgroupid character varying,
    fallowsalebelowcost boolean,
    finactive boolean
)
language plpgsql
cost 100
volatile
parallel unsafe
rows 1000
as $body$
begin
    return query
    select
        a.fitemid,
        b.fitemname,
        a.fbrid,
        b.fpacking::varchar,
        b.fitemgroupid,
        a.fallowsalebelowcost,
        a.finactive
    from dbo.tblitemtl a
    left join dbo.tblitemhd b
        on a.fcoid = b.fcoid
       and a.fitemid = b.fitemid
    where a.fcoid = p_pstrcoid
    order by b.fitemname;
end;
$body$;

alter function dbo.filllookupitemname(character varying)
    owner to postgres;