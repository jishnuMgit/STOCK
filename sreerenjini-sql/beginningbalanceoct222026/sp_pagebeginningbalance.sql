
-- =====================================================================

drop procedure if exists dbo.sp_pagebeginningbalance(
    varchar, varchar, varchar, varchar, varchar, varchar, smallint, timestamp,
    varchar, varchar, numeric, numeric, varchar, varchar, timestamp, refcursor
);

create or replace procedure dbo.sp_pagebeginningbalance(
    in p_strmode varchar(5),
    in p_pstrcoid varchar(3),
    in p_pstryear varchar(4),
    in p_strbrid varchar(3),
    in p_strdoctype varchar(5) default 'BG',
    in p_strdocno varchar(14) default 'BG',
    in p_intslno smallint default 0,
    in p_dtpdate timestamp default null,
    in p_straccountid varchar(12) default null,
    in p_strccid varchar(8) default null,
    in p_numdebit numeric default 0,
    in p_numcredit numeric default 0,
    in p_pstruserid varchar(30) default null,
    in p_strcuserid varchar(30) default null,
    in p_dtpcuserdate timestamp default null,
    inout p_result_cursor refcursor default 'cur_beginningbalance'
)
language plpgsql
as $body$
declare
    v_bg2arap boolean;
    v_modify boolean;
begin

    if p_strmode = 'GHD' then

        open p_result_cursor for
            select
                to_char(min(f.fdate), 'YYYY-MM-DD') as fdate,
                min(f.fcuserid) as fcuserid,
                to_char(min(f.fcuserdate), 'DD Mon YYYY HH24:MI:SS') as fcuserdate,
                to_char(min(f.fcuserdate), 'YYYY-MM-DD HH24:MI:SS.US') as fcuserdateraw,
                max(f.fmuserid) as fmuserid,
                to_char(max(f.fmuserdate), 'DD Mon YYYY HH24:MI:SS') as fmuserdate,
                coalesce(bool_or(f.fpost and coalesce(f.forigin, '') <> 'G'), false) as fpost
            from dbo.tblfintrans f
            where f.fcoid = p_pstrcoid
              and f.fbrid = p_strbrid
              and f.fdoctype = p_strdoctype
            having count(*) > 0;

    elsif p_strmode = 'GTL' then

        open p_result_cursor for
            select
                f.fslno,
                f.faccountid,
                f.fccid,
                f.fdebit,
                f.fcredit
            from dbo.tblfintrans f
            where f.fcoid = p_pstrcoid
              and f.fbrid = p_strbrid
              and f.fdoctype = p_strdoctype
            order by f.faccountid, f.fccid, f.fslno;

    elsif p_strmode = 'S' then

        -- a creator passed in = the balance is being modified
        v_modify := nullif(p_strcuserid, '') is not null;

        insert into dbo.tblfintrans
            (fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fdate,
             faccountid, fccid, fdescription, fdebit, fcredit,
             forigin, fpost, fyearclose,
             fcuserid, fcuserdate, fmuserid, fmuserdate)
        values
            (p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, p_intslno, p_dtpdate,
             p_straccountid, coalesce(p_strccid, ''), 'Beginning Balance',
             coalesce(p_numdebit, 0), coalesce(p_numcredit, 0),
             'UI', false, false,
             case when v_modify then p_strcuserid else p_pstruserid end,
             case when v_modify then p_dtpcuserdate else now() end,
             case when v_modify then p_pstruserid else null end,
             case when v_modify then now() else null end);

        select coalesce(c.fbg2arap, false)
          into v_bg2arap
          from dbo.tblcompany c
         where c.fcoid = p_pstrcoid;

        if coalesce(v_bg2arap, false) and dbo.isarap(p_pstrcoid, p_straccountid) then

            insert into dbo.tblarap
                (fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fslnosub, fdate,
                 faccountid, fccid, fdescription, fdocamt, fdebit, fcredit, fpost,
                 fcuserid, fcuserdate, fmuserid, fmuserdate)
            values
                (p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, p_intslno, 1, p_dtpdate,
                 p_straccountid, coalesce(p_strccid, ''), 'Beginning Balance',
                 coalesce(p_numdebit, 0) - coalesce(p_numcredit, 0),
                 coalesce(p_numdebit, 0), coalesce(p_numcredit, 0), false,
                 case when v_modify then p_strcuserid else p_pstruserid end,
                 case when v_modify then p_dtpcuserdate else now() end,
                 case when v_modify then p_pstruserid else null end,
                 case when v_modify then now() else null end);

        end if;

    elsif p_strmode = 'D' then

        delete from dbo.tblfintrans
         where fcoid = p_pstrcoid
           and fyear = p_pstryear
           and fbrid = p_strbrid
           and fdoctype = p_strdoctype
           and fdocno = p_strdocno;

        delete from dbo.tblarap
         where fcoid = p_pstrcoid
           and fyear = p_pstryear
           and fbrid = p_strbrid
           and fdoctype = p_strdoctype
           and fdocno = p_strdocno;

    end if;

end;
$body$;
