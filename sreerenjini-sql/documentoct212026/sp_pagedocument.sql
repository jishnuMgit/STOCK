-- =====================================================================

-- =====================================================================

drop procedure if exists dbo.sp_pagedocument(
    varchar, varchar, varchar, varchar, varchar, boolean, smallint,
    varchar, varchar, refcursor
);

create or replace procedure dbo.sp_pagedocument(
    in p_strmode varchar(5),
    in p_pstrcoid varchar(3),
    in p_strmoduleid varchar(4),
    in p_strdoctype varchar(5) default null,
    in p_strdocname varchar(40) default null,
    in p_blntobepost boolean default false,
    in p_intposition smallint default 0,
    in p_stroriginal_doctype varchar(5) default null,
    in p_pstruserid varchar(30) default null,
    inout p_result_cursor refcursor default 'cur_document'
)
language plpgsql
as $body$
declare
    v_original varchar(5);
begin

    if p_strmode = 'G' then

        open p_result_cursor for
            select
                d.fmoduleid,
                d.fdoctype,
                d.fdocname,
                d.fpositionno,
                d.ftobepost
            from dbo.tbldocument d
            where d.fcoid = p_pstrcoid
              and d.fmoduleid = p_strmoduleid
            order by d.fpositionno, d.fdoctype;

    elsif p_strmode = 'S' then

        insert into dbo.tbldocument
            (fcoid, fmoduleid, fdoctype, fdocname, ftobepost, fpositionno,
             fcuserid, fcuserdate)
        values
            (p_pstrcoid, p_strmoduleid, p_strdoctype, p_strdocname,
             coalesce(p_blntobepost, false), coalesce(p_intposition, 0),
             p_pstruserid, now());

    elsif p_strmode = 'M' then

        v_original := coalesce(nullif(p_stroriginal_doctype, ''), p_strdoctype);

        update dbo.tbldocument
        set fmoduleid = p_strmoduleid,
            fdoctype = p_strdoctype,
            fdocname = p_strdocname,
            ftobepost = coalesce(p_blntobepost, false),
            fpositionno = coalesce(p_intposition, 0),
            fmuserid = p_pstruserid,
            fmuserdate = now()
        where fcoid = p_pstrcoid
          and fmoduleid = p_strmoduleid
          and fdoctype = v_original;

    elsif p_strmode = 'D' then

        delete from dbo.tbldocument
        where fcoid = p_pstrcoid
          and fmoduleid = p_strmoduleid
          and fdoctype = p_strdoctype;

    end if;

end;
$body$;
