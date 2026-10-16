drop procedure if exists dbo.sp_pagestocktransferpost(
    character varying,
    character varying,
    character varying,
    character varying,
    character varying,
    character varying,
    character varying
);

create or replace procedure dbo.sp_pagestocktransferpost
(
    in p_strmode varchar(1),
    in p_pstrcoid varchar(3),
    in p_pstryear varchar(4),
    in p_strbrid varchar(3),
    in p_strdoctype varchar(5),
    in p_strdocno varchar(15),
    in p_pstruserid varchar(20) default null
)
language plpgsql
as $body$
declare
    v_trans record;
    v_numstock numeric := 0;
    v_numoldunitcost numeric := 0;
    v_numnewunitcost numeric := 0;
    v_numqtyout numeric := 0;
    v_numcostofstock numeric := 0;
    v_numtransno bigint;
    v_numlinecount integer := 0;
    v_numupdated integer := 0;
begin
    if upper(coalesce(p_strmode, '')) <> 'P' then
        raise exception 'Invalid posting mode: %', p_strmode;
    end if;

    if p_strdoctype <> 'st' and p_strdoctype <> 'ST' then
        raise exception 'Invalid document type for stock transfer posting: %',
            p_strdoctype;
    end if;

    /*
       Lock and validate the unposted stock-transfer OUT rows.
    */
    perform 1
    from dbo.tblstocktrans st
    where st.fcoid = p_pstrcoid
      and st.fyear = p_pstryear
      and st.fbrid = p_strbrid
      and st.fdoctype = p_strdoctype
      and st.fdocno = p_strdocno
      and coalesce(st.fpost, false) = false
    for update;

    select count(*)
    into v_numlinecount
    from dbo.tblstocktrans st
    where st.fcoid = p_pstrcoid
      and st.fyear = p_pstryear
      and st.fbrid = p_strbrid
      and st.fdoctype = p_strdoctype
      and st.fdocno = p_strdocno
      and coalesce(st.fpost, false) = false;

    if v_numlinecount = 0 then
        raise exception
            'No unposted stock transfer found for company %, year %, branch %, document %.',
            p_pstrcoid, p_pstryear, p_strbrid, p_strdocno;
    end if;

    /*
       Every ST row must have a matching, unposted STI row at the
       destination branch before any stock quantities are changed.
    */
    if exists
    (
        select 1
        from dbo.tblstocktrans st
        where st.fcoid = p_pstrcoid
          and st.fyear = p_pstryear
          and st.fbrid = p_strbrid
          and st.fdoctype = p_strdoctype
          and st.fdocno = p_strdocno
          and coalesce(st.fpost, false) = false
          and not exists
          (
              select 1
              from dbo.tblstocktrans sti
              where sti.fcoid = st.fcoid
                and sti.fyear = st.fyear
                and sti.fbrid = st.fsttobrid
                and sti.fstbrid = st.fstbrid
                and sti.fdoctype = 'STI'
                and sti.fdocno = st.fdocno
                and sti.fslno = st.fslno
                and sti.fitemid = st.fitemid
                and coalesce(sti.fpost, false) = false
          )
    ) then
        raise exception
            'A matching unposted STI destination row is missing for stock transfer document %.',
            p_strdocno;
    end if;

    /*
       Obtain one posting transaction number for the transfer.
       The same number is applied to both ST and STI rows.
    */
    v_numtransno := dbo.getnexttransno(
        p_pstrcoid,
        p_pstryear,
        p_strbrid,
        'P'
    )::bigint;

    /*
       Process each unposted ST (source branch) row.
    */
    for v_trans in
        select st.*
        from dbo.tblstocktrans st
        where st.fcoid = p_pstrcoid
          and st.fyear = p_pstryear
          and st.fbrid = p_strbrid
          and st.fdoctype = p_strdoctype
          and st.fdocno = p_strdocno
          and coalesce(st.fpost, false) = false
        order by st.fslno
        for update
    loop
        v_numqtyout := coalesce(v_trans.fqtyout, 0);
        v_numcostofstock :=
            v_numcostofstock
            + (v_numqtyout * coalesce(v_trans.funitcost, 0));

        /*
           Read and lock source-branch stock-control row.
           Create the row if it does not exist.
        */
        perform 1
        from dbo.tblstockcontrol sc
        where sc.fcoid = p_pstrcoid
          and sc.fyear = p_pstryear
          and sc.fbrid = v_trans.fbrid
          and sc.fitemid = v_trans.fitemid
        for update;

        if not found then
            insert into dbo.tblstockcontrol
            (
                fcoid,
                fyear,
                fbrid,
                fitemid,
                fstock,
                funitcost,
                fpreviousstock,
                fpreviousunitcost
            )
            values
            (
                p_pstrcoid,
                p_pstryear,
                v_trans.fbrid,
                v_trans.fitemid,
                0,
                0,
                0,
                0
            )
            on conflict (fcoid, fyear, fbrid, fitemid)
            do nothing;
        end if;

        select
            coalesce(sc.fstock, 0),
            coalesce(sc.funitcost, 0)
        into
            v_numstock,
            v_numoldunitcost
        from dbo.tblstockcontrol sc
        where sc.fcoid = p_pstrcoid
          and sc.fyear = p_pstryear
          and sc.fbrid = v_trans.fbrid
          and sc.fitemid = v_trans.fitemid
        for update;

        /*
           Preserve the source branch's previous stock and cost,
           then subtract the transfer quantity.
        */
        update dbo.tblstockcontrol sc
        set fpreviousstock = coalesce(sc.fstock, 0),
            fpreviousunitcost = coalesce(sc.funitcost, 0),
            fstock = coalesce(sc.fstock, 0) - v_numqtyout
        where sc.fcoid = p_pstrcoid
          and sc.fyear = p_pstryear
          and sc.fbrid = v_trans.fbrid
          and sc.fitemid = v_trans.fitemid;

        /*
           Read and lock destination-branch stock-control row.
        */
        perform 1
        from dbo.tblstockcontrol sc
        where sc.fcoid = p_pstrcoid
          and sc.fyear = p_pstryear
          and sc.fbrid = v_trans.fsttobrid
          and sc.fitemid = v_trans.fitemid
        for update;

        if not found then
            insert into dbo.tblstockcontrol
            (
                fcoid,
                fyear,
                fbrid,
                fitemid,
                fstock,
                funitcost,
                fpreviousstock,
                fpreviousunitcost
            )
            values
            (
                p_pstrcoid,
                p_pstryear,
                v_trans.fsttobrid,
                v_trans.fitemid,
                0,
                0,
                0,
                0
            )
            on conflict (fcoid, fyear, fbrid, fitemid)
            do nothing;
        end if;

        select
            coalesce(sc.fstock, 0),
            coalesce(sc.funitcost, 0)
        into
            v_numstock,
            v_numoldunitcost
        from dbo.tblstockcontrol sc
        where sc.fcoid = p_pstrcoid
          and sc.fyear = p_pstryear
          and sc.fbrid = v_trans.fsttobrid
          and sc.fitemid = v_trans.fitemid
        for update;

        /*
           Calculate destination weighted-average unit cost.
        */
        if v_numstock < 0 then
            v_numstock := 0;
        end if;

        if (v_numstock + v_numqtyout) <> 0 then
            v_numnewunitcost :=
                (
                    (v_numstock * v_numoldunitcost)
                    +
                    (v_numqtyout * coalesce(v_trans.funitcost, 0))
                )
                /
                (v_numstock + v_numqtyout);
        else
            v_numnewunitcost := 0;
        end if;

        /*
           Increase destination stock and preserve its previous values.
        */
        update dbo.tblstockcontrol sc
        set fpreviousstock = coalesce(sc.fstock, 0),
            fpreviousunitcost = coalesce(sc.funitcost, 0),
            fstock = coalesce(sc.fstock, 0) + v_numqtyout,
            funitcost = v_numnewunitcost
        where sc.fcoid = p_pstrcoid
          and sc.fyear = p_pstryear
          and sc.fbrid = v_trans.fsttobrid
          and sc.fitemid = v_trans.fitemid;

        /*
           Mark the source ST row as posted.
        */
        update dbo.tblstocktrans st
        set fpost = true,
            fpostingtransno = v_numtransno
        where st.fcoid = p_pstrcoid
          and st.fyear = p_pstryear
          and st.fbrid = v_trans.fbrid
          and st.fdoctype = p_strdoctype
          and st.fdocno = v_trans.fdocno
          and st.fslno = v_trans.fslno
          and st.fitemid = v_trans.fitemid
          and coalesce(st.fpost, false) = false;

        /*
           Mark the matching destination STI row as posted.
        */
        update dbo.tblstocktrans sti
        set fpost = true,
            fpostingtransno = v_numtransno
        where sti.fcoid = p_pstrcoid
          and sti.fyear = p_pstryear
          and sti.fbrid = v_trans.fsttobrid
          and sti.fstbrid = v_trans.fstbrid
          and sti.fdoctype = 'STI'
          and sti.fdocno = v_trans.fdocno
          and sti.fslno = v_trans.fslno
          and sti.fitemid = v_trans.fitemid
          and coalesce(sti.fpost, false) = false;

        get diagnostics v_numupdated = row_count;

        if v_numupdated = 0 then
            raise exception
                'Failed to post destination STI row for document %, line %.',
                v_trans.fdocno, v_trans.fslno;
        end if;

    end loop;

    /*
       Any exception rolls back the procedure's changes when called
       within the transaction, preventing a partially posted transfer.
    */
end;
$body$;