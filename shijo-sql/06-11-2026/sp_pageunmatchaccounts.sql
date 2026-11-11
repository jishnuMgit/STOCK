-- PROCEDURE: dbo.sp_pageunmatchaccounts
-- Match Reversal for the new dbo.tblmatchrecords structure.
--   fpc = 'C' -> invoice (child) side, fdoc* = the invoice,  fp* = the receipt (parent)
--   fpc = 'P' -> receipt (parent) side, fdoc* = the receipt, fp* = the same receipt
--
-- Modes
--   GetTL : grid rows = CHILD documents matched to the selected parent document
--   UC    : unmatch ONE child document from the parent (checked grid row)
--   U     : unmatch the whole parent line with all its children (kept from old version)
--
-- The old signature must be dropped first, otherwise a 12-argument CALL is
-- ambiguous between the old and new procedure.

DROP PROCEDURE IF EXISTS dbo.sp_pageunmatchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, character varying, character varying, refcursor);

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
	-- child document key (used by mode UC)
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
                m.fslno,
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
                  and ar.fslno = m.fslno
                order by ar.fslnosub
                limit 1
            ) a on true
            where m.fpc = 'C'
              and m.fcoid = p_pstrcoid
              and m.fpyear = p_pstryear
              and m.fpbrid = p_strbrid
              and m.fpdoctype = p_strdoctype
              and m.fpdocno = p_strdocno
            order by m.fdate, m.fdocno, m.fslno;

    end if;

    -------------------------------------------------------------------
    -- UNMATCH ONE CHILD DOCUMENT FROM THE PARENT
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
          and fpdoctype = p_strdoctype
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
              and fpdoctype = p_strdoctype
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
          and fpdoctype = p_strdoctype
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
          and fpdoctype = p_strdoctype
          and fpdocno = p_strdocno
          and fslno = p_intslno;

        -- parent line has nothing left matched: remove it and reset the parent
        delete from dbo.tblmatchrecords
        where fpc = 'P'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and fpdoctype = p_strdoctype
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
              and fdoctype = p_strdoctype
              and fdocno = p_strdocno
              and fslno = p_intslno;

            update dbo.tblfintrans
            set fmatch = false
            where fcoid = p_pstrcoid
              and fyear = p_pstryear
              and fbrid = p_strbrid
              and fdoctype = p_strdoctype
              and fdocno = p_strdocno
              and fslno = p_intslno;
        else
            -- parent still partly matched, but no longer completed
            update dbo.tblarap
            set fmatchcompleted = false
            where fcoid = p_pstrcoid
              and fyear = p_pstryear
              and fbrid = p_strbrid
              and fdoctype = p_strdoctype
              and fdocno = p_strdocno
              and fslno = p_intslno;
        end if;

        -- child line: still matched elsewhere, or fully unmatched
        if exists (
            select 1
            from dbo.tblmatchrecords m
            where m.fcoid = p_pstrcoid
              and m.fyear = p_strcyear
              and m.fbrid = p_strcbrid
              and m.fdoctype = p_strcdoctype
              and m.fdocno = p_strcdocno
              and m.fslno = p_intcslno
        ) then
            update dbo.tblarap
            set fmatch = true,
                fmatchcompleted = false
            where fcoid = p_pstrcoid
              and fyear = p_strcyear
              and fbrid = p_strcbrid
              and fdoctype = p_strcdoctype
              and fdocno = p_strcdocno
              and fslno = p_intcslno;
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
              and fdocno = p_strcdocno
              and fslno = p_intcslno;
        end if;

    end if;

    -------------------------------------------------------------------
    -- UNMATCH THE WHOLE PARENT LINE (all child documents)
    -------------------------------------------------------------------
    if p_strmode = 'U' then

        drop table if exists pg_temp.tmp_tblmatch;

        create temporary table tmp_tblmatch
        (
            fcoid varchar(3),
            fyear varchar(4),
            fbrid varchar(3),
            fdoctype varchar(5),
            fdocno varchar(15),
            fcsaccountid varchar(12),
            fslno smallint
        ) on commit drop;

        insert into tmp_tblmatch
        (fcoid, fyear, fbrid, fdoctype, fdocno, fcsaccountid, fslno)
        select distinct
            fcoid, fyear, fbrid, fdoctype, fdocno, fcsaccountid, fslno
        from dbo.tblmatchrecords
        where fpc = 'C'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and fpdoctype = p_strdoctype
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
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid
          and fslno = p_intslno
          and fslnosub = p_intslnosub;

        update dbo.tblfintrans
        set fmatch = false
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fbrid = p_strbrid
          and fdoctype = p_strdoctype
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
          and t.fslno = b.fslno
          and t.fcsaccountid = b.fcsaccountid;

        delete from dbo.tblmatchrecords
        where fpc = 'P'
          and fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and fpdoctype = p_strdoctype
          and fpdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid
          and fslno = p_intslno;

        delete from dbo.tblmatchrecords c
        where c.fpc = 'C'
          and c.fcoid = p_pstrcoid
          and c.fpyear = p_pstryear
          and c.fpbrid = p_strbrid
          and c.fpdoctype = p_strdoctype
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

        delete from tmp_tblmatch t
        where not exists
        (
            select 1
            from dbo.tblmatchrecords m
            where m.fcoid = t.fcoid
              and m.fyear = t.fyear
              and m.fbrid = t.fbrid
              and m.fdoctype = t.fdoctype
              and m.fdocno = t.fdocno
              and m.fslno = t.fslno
              and m.fcsaccountid = t.fcsaccountid
        );

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
                and t.fslno = a.fslno
          );

    end if;

end;
$BODY$;

ALTER PROCEDURE dbo.sp_pageunmatchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, character varying, character varying, refcursor, character varying, character varying, character varying, character varying, smallint)
    OWNER TO postgres;