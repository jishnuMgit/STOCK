
create or replace function dbo.haveunitcost(
    p_pstrcoid varchar(3),
    p_strbrid varchar(3),
    p_stritemid varchar(20),
    p_pstryear varchar(4) default '0',
    p_strdoctype varchar(5) default null,
    p_strdocno varchar(15) default null,
    p_numqtyin numeric(18,0) default 0,
    p_numqtyout numeric(18,0) default 0
)
returns boolean
language plpgsql
as $body$
declare
    v_numunitcost numeric(18,4) := 0;
begin
    if p_numqtyout > 0 or p_strdoctype = 'SR' then
        select coalesce(funitcost, 0)
        into v_numunitcost
        from dbo.tblstockcontrol
        where fcoid = p_pstrcoid
          and fyear::varchar(4) = p_pstryear
          and fbrid = p_strbrid
          and fitemid = p_stritemid
        limit 1;
    else
        select coalesce(funitcost, 0)
        into v_numunitcost
        from dbo.tblstocktrans
        where fcoid = p_pstrcoid
          and fyear::varchar(4) = p_pstryear
          and fbrid = p_strbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno
          and fitemid = p_stritemid
        limit 1;
    end if;

    return coalesce(v_numunitcost, 0) > 0;
end;
$body$;
