create or replace function dbo.isincomeorexpense(
    p_pstrcoid varchar(3),
    p_straccountid varchar(12)
)
returns boolean
language plpgsql
as $$
begin
    if dbo.isincome(p_pstrcoid, p_straccountid)
       or dbo.isexpense(p_pstrcoid, p_straccountid) then
        return true;
    else
        return false;
    end if;
end;
$$;