-- =====================================================================
-- Branch (Administration > Branch, the old frmBranch)
-- Procedure: dbo.sp_pagebranch   (the port of the old SP_frmBranch)
--
-- The screen edits three columns of dbo.tblbranch: the Branch ID, the Branch
-- name and the Position No. (the address, licence ... of a branch are Set
-- Branch Info).
--
-- Modes
--   GHD  the company of the screen (name of p_pstrcoid)
--   G    the grid: the branches of the company, by position then id
--   S    add a branch   (p_strbrid, p_strbrname, p_intpositionno)
--   M    change a branch. The row is found by p_stroriginal_brid (the ID it
--        had when it was loaded); when that is empty, by p_strbrid. The
--        Branch ID, name and position are simply updated.
--   D    delete the branch p_strbrid. A plain delete of the row.
--
-- M and D touch only dbo.tblbranch: the other tables that carry the Branch ID
-- (stock, finance, users ...) are not looked at - the TL decides later.
--
-- The other checks (a unique ID and name, lengths, the admin user) are made by
-- the backend (validators/AdministrationBranchValidator.ts) before this is
-- called. The older versions are dropped first: with more than one, a call
-- that names its arguments would not know which one to run.
-- =====================================================================

drop procedure if exists dbo.sp_pagebranch(
    varchar, varchar, varchar, varchar, smallint, varchar, refcursor
);

drop procedure if exists dbo.sp_pagebranch(
    varchar, varchar, varchar, varchar, smallint, varchar,
    varchar, boolean, boolean, refcursor
);

drop procedure if exists dbo.sp_pagebranch(
    varchar, varchar, varchar, varchar, smallint, varchar,
    varchar, boolean, refcursor
);

drop procedure if exists dbo.sp_pagebranch(
    varchar, varchar, varchar, varchar, smallint, varchar,
    varchar, refcursor
);

create or replace procedure dbo.sp_pagebranch(
    in p_strmode varchar(5),
    in p_pstrcoid varchar(3),
    in p_strbrid varchar(3) default null,
    in p_strbrname varchar(40) default null,
    in p_intpositionno smallint default null,
    in p_pstruserid varchar(30) default null,
    in p_stroriginal_brid varchar(3) default null,
    inout p_result_cursor refcursor default 'cur_branch'
)
language plpgsql
as $body$
declare
    v_original varchar(3);
begin

    if p_strmode = 'GHD' then

        open p_result_cursor for
            select
                c.fcoid,
                c.fconame
            from dbo.tblcompany c
            where c.fcoid = p_pstrcoid;

    elsif p_strmode = 'G' then

        open p_result_cursor for
            select
                b.fbrid,
                b.fbrname,
                b.fpositionno
            from dbo.tblbranch b
            where b.fcoid = p_pstrcoid
            order by b.fpositionno nulls last, b.fbrid;

    elsif p_strmode = 'S' then

        insert into dbo.tblbranch
            (fcoid, fbrid, fbrname, fpositionno, fcuserid, fcuserdate)
        values
            (p_pstrcoid, p_strbrid, p_strbrname, p_intpositionno,
             p_pstruserid, now());

    elsif p_strmode = 'M' then

        v_original := coalesce(nullif(p_stroriginal_brid, ''), p_strbrid);

        update dbo.tblbranch
        set fbrid = p_strbrid,
            fbrname = p_strbrname,
            fpositionno = p_intpositionno,
            fmuserid = p_pstruserid,
            fmuserdate = now()
        where fcoid = p_pstrcoid
          and fbrid = v_original;

    elsif p_strmode = 'D' then

        delete from dbo.tblbranch
        where fcoid = p_pstrcoid
          and fbrid = p_strbrid;

    end if;

end;
$body$;
