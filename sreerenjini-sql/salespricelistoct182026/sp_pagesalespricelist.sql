-- =====================================================================
-- Sales Price List (menu 020202, the old frmEditPriceList)
-- Procedure: dbo.sp_pagesalespricelist   (the TL's dbo.sp_pagesalespricelist, same arguments)
--
-- The TL's procedure with these changes:
--   * the Unit Cost join to tblstockcontrol also matches the BRANCH and the
--     YEAR (p_strbrid, p_pstryear): without them an item shows once for every
--     branch / year card it has, each with a different cost
--   * the two dbo.sp_useraudit calls are gone: that procedure only has the
--     9-argument form, so the TL's 15-argument call fails and Modify never
--     saves. The page's controller writes the audit row (one for each changed
--     item) like every other screen. So p_original_numunitprice,
--     p_strscreenname and p_strmoduleid stay in the argument list (the same
--     signature as the TL's) but this procedure does not use them
--   * the update also stamps fmuserid / fmuserdate of the tblitemtl row, and
--     the grid is ordered by item id
--
-- Modes
--   GBTL  the grid: the items of the branch (p_strbrid) with unit, cost and
--         price. p_rd_itemgroup = 0 -> only the item group p_stritemgroupid,
--         anything else -> all item groups
--   MTL   set the Unit Price of one item (p_stritemid) in ONE branch
--   MTLA  set the Unit Price of one item in ALL branches
--         (the "Apply To All Branches" tick)
--   MTL / MTLA do nothing unless p_blnunitprice_inc is true.
-- =====================================================================

drop procedure if exists dbo.sp_pagesalespricelist(
    varchar, varchar, varchar, varchar, smallint,
    varchar, varchar, boolean, numeric, numeric,
    varchar, varchar, varchar, refcursor
);

create or replace procedure dbo.sp_pagesalespricelist(
    in p_strmode varchar(5),
    in p_pstrcoid varchar(3),
    in p_pstryear varchar(4) default null,
    in p_strbrid varchar(3) default null,
    in p_rd_itemgroup smallint default 0,
    in p_stritemgroupid varchar(8) default null,
    in p_stritemid varchar(20) default null,
    in p_blnunitprice_inc boolean default false,
    in p_numunitprice numeric(18,2) default 0,
    in p_original_numunitprice numeric(18,2) default 0,
    in p_pstruserid varchar(20) default null,
    in p_strscreenname varchar(50) default null,
    in p_strmoduleid varchar(4) default null,
    inout p_result_cursor refcursor default 'cur_editpricelistnew'
)
language plpgsql
as $body$
begin

    if p_strmode = 'GBTL' then

        if p_rd_itemgroup = 0 then
            open p_result_cursor for
                select
                    a.fitemid,
                    b.fitemname,
                    b.funit,
                    coalesce(c.funitcost, 0) as funitcost,
                    coalesce(a.funitprice, 0) as funitprice,
                    a.fbrid,
                    b.fitemgroupid
                from dbo.tblitemtl a
                left join dbo.tblitemhd b
                    on a.fcoid = b.fcoid
                   and a.fitemid = b.fitemid
                left join dbo.tblstockcontrol c
                    on a.fcoid = c.fcoid
                   and a.fbrid = c.fbrid
                   and a.fitemid = c.fitemid
                   and c.fyear = p_pstryear
                where a.fcoid = p_pstrcoid
                  and a.fbrid = p_strbrid
                  and b.fitemgroupid = p_stritemgroupid
                order by a.fitemid;
        else
            open p_result_cursor for
                select
                    a.fitemid,
                    b.fitemname,
                    b.funit,
                    coalesce(c.funitcost, 0) as funitcost,
                    coalesce(a.funitprice, 0) as funitprice,
                    a.fbrid,
                    b.fitemgroupid
                from dbo.tblitemtl a
                left join dbo.tblitemhd b
                    on a.fcoid = b.fcoid
                   and a.fitemid = b.fitemid
                left join dbo.tblstockcontrol c
                    on a.fcoid = c.fcoid
                   and a.fbrid = c.fbrid
                   and a.fitemid = c.fitemid
                   and c.fyear = p_pstryear
                where a.fcoid = p_pstrcoid
                  and a.fbrid = p_strbrid
                order by a.fitemid;
        end if;

    elsif p_strmode = 'MTL' then

        if p_blnunitprice_inc then
            update dbo.tblitemtl
            set funitprice = coalesce(p_numunitprice, 0),
                fmuserid = p_pstruserid,
                fmuserdate = now()
            where fcoid = p_pstrcoid
              and fbrid = p_strbrid
              and fitemid = p_stritemid;
        end if;

    elsif p_strmode = 'MTLA' then

        if p_blnunitprice_inc then
            update dbo.tblitemtl
            set funitprice = coalesce(p_numunitprice, 0),
                fmuserid = p_pstruserid,
                fmuserdate = now()
            where fcoid = p_pstrcoid
              and fitemid = p_stritemid;
        end if;

    end if;
end;
$body$;
