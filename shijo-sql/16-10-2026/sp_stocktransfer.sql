
-- =====================================================================
-- dbo.sp_pagestocktransferpage
-- stock transfer page
-- =====================================================================

drop procedure if exists dbo.sp_pagestocktransfer(
    character varying, character varying, smallint,
    character varying, character varying, character varying,
    character varying, character varying, timestamp without time zone,
    numeric, character varying, numeric, smallint,
    character varying, character varying, numeric, numeric, numeric,
    smallint, character varying, character varying, refcursor
);

drop procedure if exists dbo.sp_pagestocktransferpage(
    character varying, character varying, character varying,
    character varying, character varying, character varying,
    character varying, character varying, timestamp without time zone,
    numeric, character varying, numeric, smallint,
    character varying, character varying, numeric, numeric, numeric,
    smallint, character varying, character varying, refcursor
);

create or replace procedure dbo.sp_pagestocktransferpage
(
    in p_strmode          character varying,
    in p_pstrcoid         character varying,
    in p_pstryear         character varying,
    in p_strstbrid        character varying,
    in p_strdoctype       character varying,
    in p_strdoctypeg      character varying,
    in p_strdocno         character varying,
    in p_strtobrid        character varying default null,
    in p_dtpdate          timestamp without time zone default null,
    in p_numtransexpense  numeric default 0,
    in p_strdnno          character varying default null,
    in p_numdocamt        numeric default 0,
    in p_intslno          smallint default 0,
    in p_stritemid        character varying default null,
    in p_strunit          character varying default null,
    in p_numqtyout        numeric default 0,
    in p_numunitcost      numeric default 0,
    in p_numtotalcost     numeric default 0,
    in p_original_fslno   smallint default 0,
    in p_strnote          character varying default null,
    in p_pstruserid       character varying default null,
    inout p_result_cursor refcursor default 'cur_stocktransfer'
)
language plpgsql
as $procedure$
declare
    v_suserid           character varying;
    v_suserdate         timestamp without time zone;
    v_muserid           character varying;
    v_muserdate         timestamp without time zone;
    v_strsavingtransno  character varying;
begin

    -- ================================================================
    -- Get the document's saving transaction number.
    -- Use the existing number if available.
    -- Otherwise generate one for the new document.
    -- ================================================================

    if p_strmode in ('S', 'M') then

        select max(fsavingtransno)
        into v_strsavingtransno
        from dbo.tblstocktrans
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno;

        if v_strsavingtransno is null then
            v_strsavingtransno :=
                dbo.getnexttransno(
                    p_pstrcoid,
                    p_pstryear,
                    p_strstbrid,
                    'S'
                );
        end if;

    end if;

    -- ================================================================
    -- GHD: Get document header
    -- ================================================================

    if p_strmode = 'GHD' then

        open p_result_cursor for
            select
                fsttobrid as fsttobrid,
                to_char(fdate, 'YYYY-MM-DD') as fdate,
                fnote as fnote,
                fpost as fpost,
                fcuserid as fsuserid,
                to_char(
                    fcuserdate,
                    'DD Mon YYYY HH24:MI:SS'
                ) as fsuserdate,
                fmuserid as fmuserid,
                to_char(
                    fmuserdate,
                    'DD Mon YYYY HH24:MI:SS'
                ) as fmuserdate
            from dbo.tblstocktrans
            where fcoid = p_pstrcoid
              and fyear = p_pstryear
              and fstbrid = p_strstbrid
              and fdoctype = p_strdoctype
              and fdocno = p_strdocno
            order by fslno
            limit 1;

    -- ================================================================
    -- GTL: Get document lines
    -- ================================================================

    elsif p_strmode = 'GTL' then

        open p_result_cursor for
            select
                fslno,
                fitemid,
                funit,
                fqtyout,
                funitcost,
                ftotalcost
            from dbo.tblstocktrans
            where fcoid = p_pstrcoid
              and fyear = p_pstryear
              and fstbrid = p_strstbrid
              and fdoctype = p_strdoctype
              and fdocno = p_strdocno
            order by fslno;

    -- ================================================================
    -- S: Insert one transfer line.
    -- Insert the OUT row for the From branch and the IN row for
    -- the To branch. Both rows share the saving transaction number.
    -- ================================================================

    elsif p_strmode = 'S' then

        -- OUT row: From branch
        insert into dbo.tblstocktrans
        (
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            fstbrid,
            fsttobrid,
            fdate,
            fnote,
            fslno,
            fitemid,
            funit,
            fqtyout,
            funitcost,
            ftotalcost,
            fdocamt,
            forigin,
            fpost,
            fcuserid,
            fcuserdate,
            fsavingtransno
        )
        values
        (
            p_pstrcoid,
            p_pstryear,
            p_strstbrid,
            p_strdoctype,
            p_strdocno,
            p_strstbrid,
            p_strtobrid,
            p_dtpdate,
            nullif(p_strnote, ''),
            p_intslno,
            p_stritemid,
            p_strunit,
            coalesce(p_numqtyout, 0),
            coalesce(p_numunitcost, 0),
            coalesce(p_numtotalcost, 0),
            coalesce(p_numdocamt, 0),
            'UI',
            false,
            p_pstruserid,
            now(),
            v_strsavingtransno
        );

        -- IN row: To branch
        insert into dbo.tblstocktrans
        (
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            fstbrid,
            fsttobrid,
            fdate,
            fnote,
            fslno,
            fitemid,
            funit,
            fqtyin,
            funitcost,
            ftotalcost,
            fdocamt,
            forigin,
            fpost,
            fcuserid,
            fcuserdate,
            fsavingtransno
        )
        values
        (
            p_pstrcoid,
            p_pstryear,
            p_strtobrid,
            p_strdoctypeg,
            p_strdocno,
            p_strstbrid,
            p_strtobrid,
            p_dtpdate,
            nullif(p_strnote, ''),
            p_intslno,
            p_stritemid,
            p_strunit,
            coalesce(p_numqtyout, 0),
            coalesce(p_numunitcost, 0),
            coalesce(p_numtotalcost, 0),
            coalesce(p_numdocamt, 0),
            'GS',
            false,
            p_pstruserid,
            now(),
            v_strsavingtransno
        );

    -- ================================================================
    -- M: Modify document header.
    -- Preserve the original saved-by values and existing saving number.
    -- ================================================================

    elsif p_strmode = 'M' then

        v_muserid := p_pstruserid;
        v_muserdate := now();

        -- Preserve saved-by information from the existing OUT row.
        select
            fcuserid,
            fcuserdate
        into
            v_suserid,
            v_suserdate
        from dbo.tblstocktrans
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno
        order by fslno
        limit 1;

        -- Update OUT rows.
        update dbo.tblstocktrans
        set
            fbrid = p_strstbrid,
            fsttobrid = p_strtobrid,
            fdate = p_dtpdate,
            fdocamt = coalesce(p_numdocamt, 0),
            fnote = nullif(p_strnote, ''),
            fcuserid = v_suserid,
            fcuserdate = v_suserdate,
            fmuserid = v_muserid,
            fmuserdate = v_muserdate,
            fsavingtransno =
                coalesce(fsavingtransno, v_strsavingtransno)
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno;

        -- Update IN rows, including moving them to the new To branch.
        -- fstbrid remains the original From branch to identify the pair.
        update dbo.tblstocktrans
        set
            fbrid = p_strtobrid,
            fsttobrid = p_strtobrid,
            fdate = p_dtpdate,
            fdocamt = coalesce(p_numdocamt, 0),
            fnote = nullif(p_strnote, ''),
            fcuserid = v_suserid,
            fcuserdate = v_suserdate,
            fmuserid = v_muserid,
            fmuserdate = v_muserdate,
            fsavingtransno =
                coalesce(fsavingtransno, v_strsavingtransno)
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctypeg
          and fdocno = p_strdocno;

    -- ================================================================
    -- M1: Modify one transfer line on both branches.
    -- ================================================================

    elsif p_strmode = 'M1' then

        -- Update OUT row.
        update dbo.tblstocktrans
        set
            fslno = p_intslno,
            fitemid = p_stritemid,
            funit = p_strunit,
            fqtyout = coalesce(p_numqtyout, 0),
            funitcost = coalesce(p_numunitcost, 0),
            ftotalcost = coalesce(p_numtotalcost, 0)
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno
          and fslno = p_original_fslno;

        -- Update matching IN row.
        update dbo.tblstocktrans
        set
            fslno = p_intslno,
            fitemid = p_stritemid,
            funit = p_strunit,
            fqtyin = coalesce(p_numqtyout, 0),
            funitcost = coalesce(p_numunitcost, 0),
            ftotalcost = coalesce(p_numtotalcost, 0)
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctypeg
          and fdocno = p_strdocno
          and fslno = p_original_fslno;

    -- ================================================================
    -- D1: Delete one line from both branches.
    -- ================================================================

    elsif p_strmode = 'D1' then

        delete from dbo.tblstocktrans
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno
          and fslno = p_original_fslno;

        delete from dbo.tblstocktrans
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctypeg
          and fdocno = p_strdocno
          and fslno = p_original_fslno;

    -- ================================================================
    -- D: Delete the complete transfer and associated finance rows.
    -- ================================================================

    elsif p_strmode = 'D' then

        delete from dbo.tblstocktrans
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno;

        delete from dbo.tblstocktrans
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fstbrid = p_strstbrid
          and fdoctype = p_strdoctypeg
          and fdocno = p_strdocno;

        delete from dbo.tblfintrans
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fbrid = p_strstbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno;

        delete from dbo.tblfintrans
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fbrid = p_strstbrid
          and fdoctype = p_strdoctypeg
          and fdocno = p_strdocno;

    end if;

end;
$procedure$;
