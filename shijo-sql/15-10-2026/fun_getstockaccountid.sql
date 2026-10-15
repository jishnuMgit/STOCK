create or replace function dbo.getstockaccountid(
    p_pstrcoid varchar(3),
    p_pstrbrid varchar(3)
)
returns varchar(12)
language plpgsql
as $$
declare
    v_strresult varchar(12);
begin
    select fstockaccountid
    into v_strresult
    from dbo.tblstockposting
    where fcoid = p_pstrcoid
      and fbrid = p_pstrbrid
    limit 1;

    return v_strresult;
end;
$$;