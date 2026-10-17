-- function: dbo.getstockadjaccountid(character varying, character varying)  (as sent by the TL)
-- The stock adjustment account of a branch (tblstockposting.fstockadjaccountid).

drop function if exists dbo.getstockadjaccountid(character varying, character varying);

create or replace function dbo.getstockadjaccountid(
    p_pstrcoid character varying(3),
    p_strbrid character varying(3)
)
returns character varying(12)
language plpgsql
as $body$
declare
    v_strresult character varying(12);
begin
    select fstockadjaccountid
    into v_strresult
    from dbo.tblstockposting
    where fcoid = p_pstrcoid
      and fbrid = p_strbrid;

    return v_strresult;
end;
$body$;

alter function dbo.getstockadjaccountid(character varying, character varying)
    owner to postgres;
