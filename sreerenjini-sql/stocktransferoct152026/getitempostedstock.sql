-- =====================================================================
-- dbo.getitempostedstock   (from the TL, exactly as sent)
--
-- The posted stock of an item in a branch: tblstockcontrol.fstock for the
-- company, year, branch and item (0 when there is no stock row).
--

-- =====================================================================

create or replace function dbo.getitempostedstock(
    p_pstrcoid varchar(3),
    p_pstryear varchar(4),
    p_strbrid varchar(3),
    p_stritemid varchar(20)
)
returns numeric(18,0)
language plpgsql
as $body$
declare
    v_numstock numeric(18,4) := 0;
begin
    select coalesce(fstock, 0)
    into v_numstock
    from dbo.tblstockcontrol
    where fcoid = p_pstrcoid
      and fyear::varchar(4) = p_pstryear
      and fbrid = p_strbrid
      and fitemid = p_stritemid
    limit 1;

    return coalesce(v_numstock, 0);
end;
$body$;
