-- =====================================================================
-- =====================================================================

drop procedure if exists dbo.sp_pagebeginningbalancepost(
    varchar, varchar, varchar, varchar, varchar, integer
);

create or replace procedure dbo.sp_pagebeginningbalancepost(
    in p_pstrcoid varchar(3),
    in p_pstryear varchar(4),
    in p_strbrid varchar(3),
    in p_strdoctype varchar(5) default 'BG',
    in p_pstruserid varchar(30) default null,
    inout p_intdocpostcount integer default 0
)
language plpgsql
as $body$
begin

    select count(distinct f.fdocno)
      into p_intdocpostcount
      from dbo.tblfintrans f
     where f.fcoid = p_pstrcoid
       and f.fyear = p_pstryear
       and f.fbrid = p_strbrid
       and f.fdoctype = p_strdoctype
       and f.fpost = false
       and coalesce(f.forigin, '') <> 'GD';

    update dbo.tblfintrans
       set fpost = true
     where fcoid = p_pstrcoid
       and fyear = p_pstryear
       and fbrid = p_strbrid
       and fdoctype = p_strdoctype
       and fpost = false
       and coalesce(forigin, '') <> 'GD';

    update dbo.tblarap
       set fpost = true
     where fcoid = p_pstrcoid
       and fyear = p_pstryear
       and fbrid = p_strbrid
       and fdoctype = p_strdoctype
       and fpost = false;

end;
$body$;
