-- PROCEDURE: dbo.sp_pageunmatchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pageunmatchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, character varying, character varying, refcursor);

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
	INOUT p_result refcursor DEFAULT 'unmatchaccounts_cursor'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
begin

    -- GET TRANSACTION LINES
    if p_strmode = 'GetTL' then

        open p_result for
            select
                false as fselect,
                a.fslno,
                a.fslnosub,
                a.fcsaccountid,
                a.fdate,
                a.fdescription,
                a.fdocamt,
                a.fdebit,
                a.fcredit,
                a.fstatus,
                a.fpost,
                true as fmatch,
                0 as fview
            from dbo.tblarap a
            where a.fcoid = p_pstrcoid
              and a.fyear = p_pstryear
              and a.fbrid = p_strbrid
              and a.fdoctype = p_strdoctype
              and a.fdocno = p_strdocno
              and a.fpost = true
              and a.fmatch = true
              and exists (
                    select 1
                    from dbo.tblmatchrecords m
                    where m.fcoid = a.fcoid
                      and m.fpyear = a.fyear
                      and m.fpbrid = a.fbrid
                      and m.fpdoctype = a.fdoctype
                      and m.fpdocno = a.fdocno
                      and m.fpost = true
              )
            order by a.fslno;

    end if;

    -- UNMATCH TRANSACTIONS
    if p_strmode = 'U' then

        -- REMOVE PARENT MATCH
        update dbo.tblarap
        set fmatch = false,
            fclosed = false,
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

        -- REMOVE MATCH FROM FINANCIAL TRANSACTION
        update dbo.tblfintrans
        set fmatch = false
        where fcoid = p_pstrcoid
          and fyear = p_pstryear
          and fbrid = p_strbrid
          and fdoctype = p_strdoctype
          and fdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid
          and fslno = p_intslno;

        -- REMOVE CHILD MATCH
        update dbo.tblarap b
        set fmatch = false,
            fclosed = false,
            fmatchuserid = '',
            fmatchuserdate = null
        from dbo.tblmatchrecords a
        where a.fcoid = b.fcoid
          and a.fcyear = b.fyear
          and a.fcbrid = b.fbrid
          and a.fcdoctype = b.fdoctype
          and a.fcdocno = b.fdocno
          and a.fcslno = b.fslno
          and a.fcoid = p_pstrcoid
          and a.fpyear = p_pstryear
          and a.fpbrid = p_strbrid
          and a.fpdoctype = p_strdoctype
          and a.fpdocno = p_strdocno
          and a.fcsaccountid = p_strcsaccountid
          and a.fpslno = p_intslno;

        -- TEMPORARY TABLE FOR MATCH RECORDS
        drop table if exists pg_temp.tmp_tblmatch;

        create temporary table tmp_tblmatch
        (
            fcoid varchar(3),
            fyear varchar(4),
            fbrid varchar(3),
            fdoctype varchar(5),
            fdocno varchar(15),
            fcsaccountid varchar(12),
            fslno smallint,
            fdebit numeric(18,2) default 0,
            fcredit numeric(18,2) default 0,
            fdrcr numeric(18,2) default 0
        ) on commit drop;

        -- INSERT CHILD MATCH RECORDS
        insert into tmp_tblmatch
        (
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            fcsaccountid,
            fslno
        )
        select distinct
            fcoid,
            fcyear,
            fcbrid,
            fcdoctype,
            fcdocno,
            fcsaccountid,
            fcslno
        from dbo.tblmatchrecords
        where fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and fpdoctype = p_strdoctype
          and fpdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid
          and fpslno = p_intslno;

        -- REMOVE MATCH RECORDS
        delete from dbo.tblmatchrecords
        where fcoid = p_pstrcoid
          and fpyear = p_pstryear
          and fpbrid = p_strbrid
          and fpdoctype = p_strdoctype
          and fpdocno = p_strdocno
          and fcsaccountid = p_strcsaccountid
          and fpslno = p_intslno;

        -- KEEP ONLY DOCUMENTS WHICH STILL HAVE OTHER MATCH RECORDS
        delete from tmp_tblmatch t
        where not exists
        (
            select 1
            from dbo.tblmatchrecords m
            where m.fcoid = t.fcoid
              and m.fcyear = t.fyear
              and m.fcbrid = t.fbrid
              and m.fcdoctype = t.fdoctype
              and m.fcdocno = t.fdocno
              and m.fcslno = t.fslno
        );

        -- RESTORE MATCH STATUS FOR THOSE DOCUMENTS
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
ALTER PROCEDURE dbo.sp_pageunmatchaccounts(character varying, character varying, character varying, character varying, character varying, character varying, smallint, smallint, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

