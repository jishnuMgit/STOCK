-- PROCEDURE: dbo.sp_rptitemhistory(character varying, boolean, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_rptitemhistory(character varying, boolean, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptitemhistory(
	IN p_pstrcoid character varying,
	IN p_rdgbranch boolean,
	IN p_strbrid character varying,
	IN p_stritemid character varying DEFAULT NULL::character varying,
	IN p_strasondate character varying DEFAULT NULL::character varying,
	INOUT p_result_cursor refcursor DEFAULT 'cur_rptitemhistory'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
begin
    open p_result_cursor for
    with params as (
        select
            p_pstrcoid as coid,
            p_rdgbranch as all_branches,
            p_strbrid as brid,
            p_stritemid as itemid,
            case
                when nullif(trim(p_strasondate), '') is not null
                then to_date(p_strasondate, 'DD/MM/YYYY')
                else current_date
            end as asondate
    ),
    stock as (
        select
            st.fcoid,
            st.fitemid,
            coalesce(sum(coalesce(st.fqtyin, 0)), 0)
              - coalesce(sum(coalesce(st.fqtyout, 0)), 0) as stock
        from dbo.tblstocktrans st
        cross join params p
        where st.fcoid = p.coid
          and (p.all_branches or st.fbrid = p.brid)
          and (p.itemid is null or st.fitemid = p.itemid)
        group by st.fcoid, st.fitemid
    ),
    transactions as (
        select st.*
        from dbo.tblstocktrans st
        cross join params p
        where st.fcoid = p.coid
          and (p.all_branches or st.fbrid = p.brid)
          and (p.itemid is null or st.fitemid = p.itemid)
          and st.fdate < p.asondate + interval '1 day'
    ),
    last_purchase_date as (
        select
            t.fcoid,
            t.fitemid,
            max(t.fdate) as lastpurdate
        from transactions t
        where t.fdoctype = 'PI'
        group by t.fcoid, t.fitemid
    ),
    last_purchase as (
        select
            t.fcoid,
            t.fitemid,
            d.lastpurdate,
            max(t.funitprice)::numeric(18,4) as lastpurunitprice,
            max(t.fcurrency)::varchar(3) as lastpurcurrency,
            max(t.funitcost)::numeric(18,4) as lastpurunitcost
        from transactions t
        inner join last_purchase_date d
            on d.fcoid = t.fcoid
           and d.fitemid = t.fitemid
           and d.lastpurdate = t.fdate
        where t.fdoctype = 'PI'
        group by t.fcoid, t.fitemid, d.lastpurdate
    ),
    last_sale_date as (
        select
            t.fcoid,
            t.fitemid,
            max(t.fdate) as lastsaledate
        from transactions t
        where t.fdoctype like 'SI%'
        group by t.fcoid, t.fitemid
    ),
    last_sale as (
        select
            t.fcoid,
            t.fitemid,
            d.lastsaledate,
            max(t.funitprice)::numeric(18,2) as lastsaleunitprice
        from transactions t
        inner join last_sale_date d
            on d.fcoid = t.fcoid
           and d.fitemid = t.fitemid
           and d.lastsaledate = t.fdate
        where t.fdoctype like 'SI%'
        group by t.fcoid, t.fitemid, d.lastsaledate
    )
    select
        s.stock::numeric(18,0) as fstock,
        lp.lastpurunitprice as flastpurunitprice,
        lp.lastpurcurrency as flastpurcurrency,
        lp.lastpurunitcost as flastpurunitcost,
        lp.lastpurdate::timestamp as flastpurdate,
        ls.lastsaledate::timestamp as flastsaledate,
        ls.lastsaleunitprice as flastsaleunitprice,
        t.fcoid::varchar(3) as fcoid,
        t.fbrid::varchar(3) as fbrid,
        t.fdoctype::varchar(5) as fdoctype,
        t.fdocno::varchar(15) as fdocno,
        t.fgaccountid::varchar(12) as faccountid,
        t.fdate::timestamp as fdate,
        t.fitemid::varchar(20) as fitemid,
        t.fqtyin::numeric as fqtyin,
        t.fqtyout::numeric as fqtyout,
        t.funitcost::numeric(18,4) as funitcost,
        t.funitprice::numeric(18,2) as funitprice,
        ih.fitemname::varchar as fitemname,
        ac.faccountname::varchar as faccountname
    from stock s
    left join last_purchase lp
        on lp.fcoid = s.fcoid
       and lp.fitemid = s.fitemid
    left join last_sale ls
        on ls.fcoid = s.fcoid
       and ls.fitemid = s.fitemid
    left join transactions t
        on t.fcoid = s.fcoid
       and t.fitemid = s.fitemid
    left join dbo.tblitemhd ih
        on ih.fcoid = s.fcoid
       and ih.fitemid = s.fitemid
    left join dbo.tblaccount ac
        on ac.fcoid = ih.fcoid
       and ac.faccountid = ih.fsupplierid
    order by s.fitemid, t.fdate, t.fdoctype;
end;
$BODY$;
ALTER PROCEDURE dbo.sp_rptitemhistory(character varying, boolean, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

