-- =====================================================================
-- Year (Administration > Year, the old frmYear)
-- Procedure: dbo.sp_pageyear   (the port of the old SQL Server SP_frmYear)
--
-- A branch has one row in dbo.tblyear for each financial year that is OPEN for it
-- (the years the users can log in to). A closed year has the status Closed and
-- is not touched by this screen.
--
-- Modes
--   G   the OPEN years of the company: branch and year, by branch then year
--       (the old G)
--   S   open a year for a branch (p_strbrid, p_intyear): a new row, Open ('O');
--       a row that is already there is set to Open (the old S). The backend does
--       not call it for a closed year: that is refused before.
--   D   take an open year of a branch away. The old D deleted ALL the open years
--       of the company and the form then inserted the grid again; the new page
--       sends the whole grid and the backend deletes only the open years that are
--       not in it and adds only the new ones (so the created user and date of
--       an unchanged year stay), one call each.
--
-- The checks (an admin user, a branch of the company, a 4-digit year, no
-- duplicate, no closed year) are made by the backend
-- (validators/AdministrationYearValidator.ts) before this is called.
-- =====================================================================

drop procedure if exists dbo.sp_pageyear(
    varchar, varchar, varchar, smallint, varchar, refcursor
);

create or replace procedure dbo.sp_pageyear(
    in p_strmode varchar(5),
    in p_pstrcoid varchar(3),
    in p_strbrid varchar(3) default null,
    in p_intyear smallint default 0,
    in p_pstruserid varchar(30) default null,
    inout p_result_cursor refcursor default 'cur_year'
)
language plpgsql
as $body$
begin

    if p_strmode = 'G' then

        open p_result_cursor for
            select
                y.fbrid,
                y.fyear
            from dbo.tblyear y
            where y.fcoid = p_pstrcoid
              and y.fyearclosestatus = 'Open'
            order by y.fbrid, y.fyear;

    elsif p_strmode = 'S' then

        if exists (
            select 1 from dbo.tblyear
            where fcoid = p_pstrcoid
              and fyear = p_intyear
              and fbrid = p_strbrid
        ) then

            update dbo.tblyear
            set fyearclosestatus = 'Open',
                fyearclosestatusid = 'O',
                fmuserid = p_pstruserid,
                fmuserdate = now()
            where fcoid = p_pstrcoid
              and fyear = p_intyear
              and fbrid = p_strbrid;

        else

            insert into dbo.tblyear
                (fcoid, fyear, fbrid, fyearclosestatus, fyearclosestatusid,
                 fcuserid, fcuserdate)
            values
                (p_pstrcoid, p_intyear, p_strbrid, 'Open', 'O',
                 p_pstruserid, now());

        end if;

    elsif p_strmode = 'D' then

        delete from dbo.tblyear
        where fcoid = p_pstrcoid
          and fbrid = p_strbrid
          and fyear = p_intyear
          and fyearclosestatus = 'Open';

    end if;

end;
$body$;
