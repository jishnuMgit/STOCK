-- PROCEDURE: dbo.sp_pageunmatchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, character varying, character varying, refcursor, character varying, character varying, character varying, character varying, smallint)

-- DROP PROCEDURE IF EXISTS dbo.sp_pageunmatchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, character varying, character varying, refcursor, character varying, character varying, character varying, character varying, smallint);

-- NOTE: on C rows in tblmatchrecords, fslno is now a running serial (1,2,3...)
-- per parent document. It is NOT the child's tblarap line number any more, so
-- every link from a C row to tblarap / tblfintrans is made at DOCUMENT level.
-- p_intcslno (sent by the controller from the GetTL row's fSlNo) is that serial.

CREATE OR REPLACE PROCEDURE dbo.sp_pageunmatchaccounts(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_pstryear character varying DEFAULT '0000'::character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_strdoctype character varying DEFAULT NULL::character varying,
	IN p_strdocno character varying DEFAULT NULL::character varying,
	IN p_intslno smallint DEFAULT 0,
	IN p_intslnosub smallint DEFAULT 0,
	IN p_strcsaccountid character varying DEFAULT NULL::character varying,
	IN p_strdivid character varying DEFAULT NULL::character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	INOUT p_result refcursor DEFAULT 'unmatchaccounts_cursor'::refcursor,
	IN p_strcyear character varying DEFAULT NULL::character varying,
	IN p_strcbrid character varying DEFAULT NULL::character varying,
	IN p_strcdoctype character varying DEFAULT NULL::character varying,
	IN p_strcdocno character varying DEFAULT NULL::character varying,
	IN p_intcslno smallint DEFAULT 0)
LANGUAGE 'plpgsql'
AS $BODY$
declare
    v_cdr numeric(18,2);
    v_ccr numeric(18,2);
    v_rows integer;
begin

    -------------------------------------------------------------------
    -- GET TRANSACTION LINES: child documents matched to the parent
    -------------------------------------------------------------------
    if p_strmode = 'GetTL' then

        open p_result for
            select
                false as fselect,
                m.fslno,                         -- serial 1,2,3...
                coalesce(a.fslnosub, 0) as fslnosub,
                m.fcsaccountid,
                m.fdate,
                a.fdescription,
                a.fdocamt,
                m.fdebit,
                m.fcredit,
                a.fstatus,
                a.fpost,
                true as fmatch,
                0 as fview,
                -- child document key, needed to call mode UC
                m.fyear,
                m.fbrid,
                m.fdoctype,
                m.fdocno,
                m.fdoctypeno
            from dbo.tblmatchrecords m
            left join lateral (
                select ar.fslnosub, ar.fdescription, ar.fdocamt,
                       ar.fstatus, ar.fpost
                from dbo.tblarap ar
                where ar.fcoid = m.fcoid
                  and ar.fyear = m.fyear
                  and ar.fbrid = m.fbrid
                  and ar.fdoctype = m.fdoctype
                  and ar.fdocno = m.fdocno
                order by ar.fslno, ar.fslnosub
                limit 1
            ) a on true
            where m.fpc = 'C'
              and m.fcoid = p_pstrcoid
              and m.fpyear = p_pstryear
              and m.fpbrid = p_strbrid
              and (coalesce(p_strdoctype, '') = '' or m.fpdoctype = p_strdoctype)
              and m.fpdocno = p_strdocno
            order by m.fslno;

    end if;

    -------------------------------------------------------------------
    -- UNMATCH ONE CHILD DOCUMENT FROM THE PARENT
    -- p_intcslno = serial (fslno) of the C row under this parent
    -------------------------------------------------------------------
    if p_strmode = 'UC' then

        -- matched amount of this child against this parent
        select coalesce(sum(fdebit), 0), coalesce(sum(fcredit), 0)
        into v_cdr, v_ccr
        from dbo.tblmatchrecords
        where fpc = 'C'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or fpdoctype = p_strdoctype)
          and fpdocno = p_strdocno
          and fyear = p_strcyear
          and fbrid = p_strcbrid
          and fdoctype = p_strcdoctype
          and fdocno = p_strcdocno
          and fslno = p_intcslno;

        if not exists (
            select 1
            from dbo.tblmatchrecords
            where fpc = 'C'
              and fcoid = p_pstrcoid
              and fpyear = p_pstryear
              and fpbrid = p_strbrid
              and (coalesce(p_strdoctype, '') = '' or fpdoctype = p_strdoctype)
              and fpdocno = p_strdocno
              and fyear = p_strcyear
              and fbrid = p_strcbrid
              and fdoctype = p_strcdoctype
              and fdocno = p_strcdocno
              and fslno = p_intcslno
        ) then
            return;
        end if;

        -- remove the child side record
        delete from dbo.tblmatchrecords
        where fpc = 'C'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or fpdoctype = p_strdoctype)
          and fpdocno = p_strdocno
          and fyear = p_strcyear
          and fbrid = p_strcbrid
          and fdoctype = p_strcdoctype
          and fdocno = p_strcdocno
          and fslno = p_intcslno;

        -- reduce the parent side by the amount that was matched to this child
        update dbo.tblmatchrecords
        set fdebit = greatest(coalesce(fdebit, 0) - v_ccr, 0),
            fcredit = greatest(coalesce(fcredit, 0) - v_cdr, 0)
        where fpc = 'P'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or fpdoctype = p_strdoctype)
          and fpdocno = p_strdocno
          and fslno = p_intslno;

        -- parent line has nothing left matched: remove it and reset the parent
        delete from dbo.tblmatchrecords
        where fpc = 'P'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or fpdoctype = p_strdoctype)
          and fpdocno = p_strdocno
          and fslno = p_intslno
          and coalesce(fdebit, 0) = 0
          and coalesce(fcredit, 0) = 0;

        get diagnostics v_rows = row_count;

        if v_rows > 0 then
            update dbo.tblarap
            set fmatch = false,
                fmatchcompleted = false,
                fmatchuserid = '',
                fmatchuserdate = null
            where fcoid = p_pstrcoid
              and fyear = p_pstryear
              and fbrid = p_strbrid
              and (coalesce(p_strdoctype, '') = '' or fdoctype = p_strdoctype)
              and fdocno = p_strdocno
              and fslno = p_intslno;

            update dbo.tblfintrans
            set fmatch = false
            where fcoid = p_pstrcoid
              and fyear = p_pstryear
              and fbrid = p_strbrid
              and (coalesce(p_strdoctype, '') = '' or fdoctype = p_strdoctype)
              and fdocno = p_strdocno
              and fslno = p_intslno;
        else
            -- parent still partly matched, but no longer completed
            update dbo.tblarap
            set fmatchcompleted = false
            where fcoid = p_pstrcoid
              and fyear = p_pstryear
              and fbrid = p_strbrid
              and (coalesce(p_strdoctype, '') = '' or fdoctype = p_strdoctype)
              and fdocno = p_strdocno
              and fslno = p_intslno;
        end if;

        -- child document: still matched elsewhere, or fully unmatched
        -- (document level, because C-row fslno is only a serial)
        if exists (
            select 1
            from dbo.tblmatchrecords m
            where m.fpc = 'C'
              and m.fcoid = p_pstrcoid
              and m.fyear = p_strcyear
              and m.fbrid = p_strcbrid
              and m.fdoctype = p_strcdoctype
              and m.fdocno = p_strcdocno
        ) then
            update dbo.tblarap
            set fmatch = true,
                fmatchcompleted = false
            where fcoid = p_pstrcoid
              and fyear = p_strcyear
              and fbrid = p_strcbrid
              and fdoctype = p_strcdoctype
              and fdocno = p_strcdocno;
        else
            update dbo.tblarap
            set fmatch = false,
                fmatchcompleted = false,
                fmatchuserid = '',
                fmatchuserdate = null
            where fcoid = p_pstrcoid
              and fyear = p_strcyear
              and fbrid = p_strcbrid
              and fdoctype = p_strcdoctype
              and fdocno = p_strcdocno;

            update dbo.tblfintrans
            set fmatch = false
            where fcoid = p_pstrcoid
              and fyear = p_strcyear
              and fbrid = p_strcbrid
              and fdoctype = p_strcdoctype
              and fdocno = p_strcdocno;
        end if;

    end if;

    -------------------------------------------------------------------
    -- UNMATCH THE WHOLE PARENT LINE (all child documents)
    -------------------------------------------------------------------
    if p_strmode = 'U' then

        drop table if exists pg_temp.tmp_tblmatch;

        -- child documents (document level; C-row fslno is only a serial)
        create temporary table tmp_tblmatch
        (
            fcoid varchar(3),
            fyear varchar(4),
            fbrid varchar(3),
            fdoctype varchar(5),
            fdocno varchar(15),
            fcsaccountid varchar(12)
        ) on commit drop;

        insert into tmp_tblmatch
        (fcoid, fyear, fbrid, fdoctype, fdocno, fcsaccountid)
        select distinct
            fcoid, fyear, fbrid, fdoctype, fdocno, fcsaccountid
        from dbo.tblmatchrecords
        where fpc = 'C'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or fpdoctype = p_strdoctype)
          and fpdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid;

        update dbo.tblarap
        set fmatch = false,
            fmatchcompleted = false,
            fmatchuserid = '',
            fmatchuserdate = null
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or fdoctype = p_strdoctype)
          and fdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid
          and fslno = p_intslno
          and fslnosub = p_intslnosub;

        update dbo.tblfintrans
        set fmatch = false
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or fdoctype = p_strdoctype)
          and fdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid
          and fslno = p_intslno;

        update dbo.tblarap b
        set fmatch = false,
            fmatchcompleted = false,
            fmatchuserid = '',
            fmatchuserdate = null
        from tmp_tblmatch t
        where t.fcoid = b.fcoid
          and t.fyear = b.fyear
          and t.fbrid = b.fbrid
          and t.fdoctype = b.fdoctype
          and t.fdocno = b.fdocno
          and t.fcsaccountid = b.fcsaccountid;

        delete from dbo.tblmatchrecords
        where fpc = 'P'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or fpdoctype = p_strdoctype)
          and fpdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid
          and fslno = p_intslno;

        delete from dbo.tblmatchrecords c
        where c.fpc = 'C'
          and c.fcoid = p_pstrcoid
          and c.fpyear = p_pstryear
          and c.fpbrid = p_strbrid
          and (coalesce(p_strdoctype, '') = '' or c.fpdoctype = p_strdoctype)
          and c.fpdocno = p_strdocno
          and c.fcsaccountid = p_strcsaccountid
          and not exists
          (
              select 1
              from dbo.tblmatchrecords p
              where p.fpc = 'P'
                and p.fcoid = c.fcoid
                and p.fpyear = c.fpyear
                and p.fpbrid = c.fpbrid
                and p.fpdoctype = c.fpdoctype
                and p.fpdocno = c.fpdocno
                and p.fcsaccountid = c.fcsaccountid
          );

        -- children with no remaining C match record are fully unmatched
        delete from tmp_tblmatch t
        where not exists
        (
            select 1
            from dbo.tblmatchrecords m
            where m.fpc = 'C'
              and m.fcoid = t.fcoid
              and m.fyear = t.fyear
              and m.fbrid = t.fbrid
              and m.fdoctype = t.fdoctype
              and m.fdocno = t.fdocno
              and m.fcsaccountid = t.fcsaccountid
        );

        -- the rest are still matched elsewhere
        update dbo.tblarap a
        set fmatch = true,
            fmatchuserid = p_pstruserid,
            fmatchuserdate = current_timestamp
        where a.fcoid = p_pstrcoid
          and a.fcsaccountid = p_strcsaccountid
          and exists
          (
              select 1
              from tmp_tblmatch t
              where t.fcoid = a.fcoid
                and t.fyear = a.fyear
                and t.fbrid = a.fbrid
                and t.fdoctype = a.fdoctype
                and t.fdocno = a.fdocno
          );

    end if;

end;
$BODY$;
ALTER PROCEDURE dbo.sp_pageunmatchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, character varying, character varying, refcursor, character varying, character varying, character varying, character varying, smallint)
    OWNER TO postgres;