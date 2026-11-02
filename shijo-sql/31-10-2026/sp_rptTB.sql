-- PROCEDURE: dbo.sp_rpttb(character varying, smallint, character varying, character varying, character varying, smallint, smallint, boolean, smallint, boolean, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_rpttb(character varying, smallint, character varying, character varying, character varying, smallint, smallint, boolean, smallint, boolean, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rpttb(
	IN p_pstrcoid character varying,
	IN p_rdgbranch smallint,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strfromdate character varying DEFAULT NULL::character varying,
	IN p_strtodate character varying DEFAULT NULL::character varying,
	IN p_intaccountlevel smallint DEFAULT 4,
	IN p_cbopoststatus smallint DEFAULT 2,
	IN p_blnprint0bal boolean DEFAULT false,
	IN p_rdgtranstype smallint DEFAULT 2,
	IN p_blnprintacgroup boolean DEFAULT false,
	INOUT p_result_cursor refcursor DEFAULT 'cur_rpttb'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
declare
    v_stryear varchar(4);
    v_fromdate date;
    v_todate date;
begin
    if p_strfromdate is null or p_strtodate is null then
        raise exception 'from date and to date are required';
    end if;

    v_fromdate := to_date(p_strfromdate, 'DD/MM/YYYY');
    v_todate := to_date(p_strtodate, 'DD/MM/YYYY');

    if v_fromdate > v_todate then
        raise exception 'from date cannot be greater than to date';
    end if;

    v_stryear := extract(year from v_todate)::varchar(4);

    drop table if exists pg_temp.tbltbt;
    drop table if exists pg_temp.tbltb;

    create temporary table tbltbt
    (
        fcoid varchar(3),
        faccountid1 varchar(12),
        faccountid2 varchar(12),
        faccountid3 varchar(12),
        faccountid4 varchar(12),
        fop_drcr numeric(18,2) default 0,
        fcu_dr numeric(18,2) default 0,
        fcu_cr numeric(18,2) default 0,
        fcl_drcr numeric(18,2) default 0
    ) on commit drop;

    create temporary table tbltb
    (
        fcoid varchar(3),
        fgaccountid varchar(12),
        faccountname varchar(120),
        faccountname_ar varchar(120),
        faccountlevel smallint default 0,
        fop_drcr numeric(18,2) default 0,
        fcu_dr numeric(18,2) default 0,
        fcu_cr numeric(18,2) default 0,
        fcu_movement numeric(18,2) default 0,
        fcl_drcr numeric(18,2) default 0
    ) on commit drop;

    /*
      Opening balance: BG and OP transactions.
    */
    insert into tbltbt (
        fcoid,
        faccountid4,
        fop_drcr
    )
    select
        f.fcoid,
        f.fgaccountid,
        sum(coalesce(f.fdebit, 0) - coalesce(f.fcredit, 0))
    from dbo.tblfintrans f
    where f.fcoid = p_pstrcoid
      and f.fyear = v_stryear
      and f.fdoctype in ('BG', 'OP')
      and f.fdoctype <> 'YC'
      and (
            p_rdgbranch <> 0
            or f.fbrid = p_strbrid
          )
      and (
            p_cbopoststatus not in (0, 1)
            or (p_cbopoststatus = 0 and f.fpost = false)
            or (p_cbopoststatus = 1 and f.fpost = true)
          )
      and (
            p_rdgtranstype = 2
            or (
                p_rdgtranstype = 0
                and f.forigin = 'UIG'
            )
            or (
                p_rdgtranstype = 1
                and f.forigin <> 'UIG'
            )
          )
    group by f.fcoid, f.fgaccountid;

    /*
      Opening balance: non-BG/OP transactions before the from date.
    */
    insert into tbltbt (
        fcoid,
        faccountid4,
        fop_drcr
    )
    select
        f.fcoid,
        f.fgaccountid,
        sum(coalesce(f.fdebit, 0) - coalesce(f.fcredit, 0))
    from dbo.tblfintrans f
    where f.fcoid = p_pstrcoid
      and f.fyear = v_stryear
      and f.fdoctype not in ('BG', 'OP', 'YC')
      and f.fdate::date < v_fromdate
      and (
            p_rdgbranch <> 0
            or f.fbrid = p_strbrid
          )
      and (
            p_cbopoststatus not in (0, 1)
            or (p_cbopoststatus = 0 and f.fpost = false)
            or (p_cbopoststatus = 1 and f.fpost = true)
          )
      and (
            p_rdgtranstype = 2
            or (
                p_rdgtranstype = 0
                and f.forigin = 'UIG'
            )
            or (
                p_rdgtranstype = 1
                and f.forigin <> 'UIG'
            )
          )
    group by f.fcoid, f.fgaccountid;

    /*
      Current-period debit and credit movements.
    */
    insert into tbltbt (
        fcoid,
        faccountid4,
        fcu_dr,
        fcu_cr
    )
    select
        f.fcoid,
        f.fgaccountid,
        sum(coalesce(f.fdebit, 0)),
        sum(coalesce(f.fcredit, 0))
    from dbo.tblfintrans f
    where f.fcoid = p_pstrcoid
      and f.fyear = v_stryear
      and f.fdoctype not in ('BG', 'OP', 'YC')
      and f.fdate::date between v_fromdate and v_todate
      and (
            p_rdgbranch <> 0
            or f.fbrid = p_strbrid
          )
      and (
            p_cbopoststatus not in (0, 1)
            or (p_cbopoststatus = 0 and f.fpost = false)
            or (p_cbopoststatus = 1 and f.fpost = true)
          )
      and (
            p_rdgtranstype = 2
            or (
                p_rdgtranstype = 0
                and f.forigin ='UIG'
            )
            or (
                p_rdgtranstype = 1
                and f.forigin <> 'UIG'
            )
          )
    group by f.fcoid, f.fgaccountid;

    /*
      Resolve account hierarchy.
    */
    update tbltbt t
    set faccountid1 = dbo.getaccountgroupid(
        p_pstrcoid, t.faccountid4, 1
    );

    update tbltbt t
    set faccountid2 = dbo.getaccountgroupid(
        p_pstrcoid, t.faccountid4, 2
    );

    update tbltbt t
    set faccountid3 = dbo.getaccountgroupid(
        p_pstrcoid, t.faccountid4, 3
    );

    /*
      Level 4 accounts.
    */
    insert into tbltb (
        fcoid,
        fgaccountid,
        fop_drcr,
        fcu_dr,
        fcu_cr
    )
    select
        fcoid,
        faccountid4,
        sum(fop_drcr),
        sum(fcu_dr),
        sum(fcu_cr)
    from tbltbt
    group by fcoid, faccountid4;

    /*
      Level 3 accounts.
    */
    insert into tbltb (
        fcoid,
        fgaccountid,
        fop_drcr,
        fcu_dr,
        fcu_cr
    )
    select
        fcoid,
        faccountid3,
        sum(fop_drcr),
        sum(fcu_dr),
        sum(fcu_cr)
    from tbltbt
    group by fcoid, faccountid3;

    /*
      Level 2 accounts.
    */
    insert into tbltb (
        fcoid,
        fgaccountid,
        fop_drcr,
        fcu_dr,
        fcu_cr
    )
    select
        fcoid,
        faccountid2,
        sum(fop_drcr),
        sum(fcu_dr),
        sum(fcu_cr)
    from tbltbt
    group by fcoid, faccountid2;

    /*
      Level 1 accounts.
    */
    insert into tbltb (
        fcoid,
        fgaccountid,
        fop_drcr,
        fcu_dr,
        fcu_cr
    )
    select
        fcoid,
        faccountid1,
        sum(fop_drcr),
        sum(fcu_dr),
        sum(fcu_cr)
    from tbltbt
    group by fcoid, faccountid1;

    /*
      Calculate movement and closing balance.
    */
    update tbltb
    set
        fcu_movement = fcu_dr - fcu_cr,
        fcl_drcr = fop_drcr + fcu_dr - fcu_cr;

    /*
      Remove zero-balance accounts when requested.
    */
    if not p_blnprint0bal then
        delete from tbltb
        where fop_drcr = 0
          and fcu_dr = 0
          and fcu_cr = 0;
    end if;

    /*
      Add account names and account levels.
    */
    update tbltb t
    set
        faccountname = a.faccountname,
        faccountname_ar = a.faccountname_ar,
        faccountlevel = a.faccountlevel
    from dbo.tblaccount a
    where t.fcoid = a.fcoid
      and t.fgaccountid = a.faccountid;

    /*
      Return only the selected account level.
    */
    if not p_blnprintacgroup then

        open p_result_cursor for
            select *
            from tbltb
            where faccountlevel = p_intaccountlevel
            order by fgaccountid;

    else

        /*
          Indent account names to show the hierarchy.
        */
        update tbltb
        set faccountname =
            repeat(' ', case faccountlevel
                when 2 then 4
                when 3 then 8
                when 4 then 12
                else 0
            end) || coalesce(faccountname, '')
        where faccountlevel in (2, 3, 4);

        update tbltb
        set faccountname_ar =
            repeat(' ', case faccountlevel
                when 2 then 4
                when 3 then 8
                when 4 then 12
                else 0
            end) || coalesce(faccountname_ar, '')
        where faccountlevel in (2, 3, 4);

        open p_result_cursor for
            select distinct on (fgaccountid) *
            from tbltb
            where faccountlevel <= p_intaccountlevel
            order by fgaccountid;

    end if;
end;
$BODY$;
ALTER PROCEDURE dbo.sp_rpttb(character varying, smallint, character varying, character varying, character varying, smallint, smallint, boolean, smallint, boolean, refcursor)
    OWNER TO postgres;

