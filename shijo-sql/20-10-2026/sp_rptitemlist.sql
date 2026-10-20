-- PROCEDURE: dbo.sp_rptitemlist(character varying, boolean, character varying, boolean, character varying, smallint, character varying, character varying, character varying, smallint, boolean, refcursor)
 DROP PROCEDURE IF EXISTS dbo.sp_rptitemlist(character varying, boolean, character varying, boolean, character varying, smallint, character varying, character varying, character varying, smallint, boolean, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptitemlist(
	IN p_pstrcoid character varying,
	IN p_rdgbranch boolean,
	IN p_strbrid character varying,
	IN p_rdgitemgroup boolean,
	IN p_stritemgroupid character varying DEFAULT NULL::character varying,
	IN p_rdgitem smallint DEFAULT 2,
	IN p_stritemid character varying DEFAULT NULL::character varying,
	IN p_strfromitemid character varying DEFAULT NULL::character varying,
	IN p_strtoitemid character varying DEFAULT NULL::character varying,
	IN p_rdgitemstatus smallint DEFAULT 0,
	IN p_blnsalesbelowcost boolean DEFAULT false,
	INOUT p_result_cursor refcursor DEFAULT 'cur_rptitemlist'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
declare
    v_sql text;
    v_filter text;
begin
    v_filter := 'a.fcoid = $1';

    if p_rdgbranch = false then
        v_filter := v_filter || ' and c.fbrid = $3';
    end if;

    if p_rdgitemgroup = false then
        v_filter := v_filter || ' and a.fitemgroupid = $5';
    end if;

    if p_rdgitem = 0 then
        -- One item
        v_filter := v_filter || ' and a.fitemid = $7';

    elsif p_rdgitem = 1 then
        -- Item range
        v_filter := v_filter || ' and a.fitemid >= $8 and a.fitemid <= $9';
    end if;

    if p_rdgitemstatus = 1 then
        v_filter := v_filter || ' and c.finactive = true';
    end if;

    if p_blnsalesbelowcost = true then
        v_filter := v_filter || ' and c.fallowsalebelowcost = true';
    end if;

    if p_rdgbranch = false then

        v_sql :=
            'select distinct
                a.fitemid,
                a.fitemgroupid,
                b.fitemgroupname,
                a.fitemname,
                a.funit,
                a.fpacking,
                a.freorderlevel,
                a.freorderqty,
                c.funitprice,
                c.fbrid,
                d.fstock
             from dbo.tblitemhd a
             left join dbo.tblitemgroup b
                on a.fcoid = b.fcoid
               and a.fitemgroupid = b.fitemgroupid
             left join dbo.tblitemtl c
                on a.fcoid = c.fcoid
               and a.fitemid = c.fitemid
             left join dbo.tblstockcontrol d
                on a.fcoid = d.fcoid
               and a.fitemid = d.fitemid
			   and d.fbrid = c.fbrid
             where ' || v_filter ||
            ' order by a.fitemgroupid, a.fitemid';

    else

        v_sql :=
            'select distinct
                a.fitemid,
                a.fitemgroupid,
                b.fitemgroupname,
                a.fitemname,
                a.funit,
                a.fpacking
             from dbo.tblitemhd a
             left join dbo.tblitemgroup b
                on a.fcoid = b.fcoid
               and a.fitemgroupid = b.fitemgroupid
             left join dbo.tblitemtl c
                on a.fcoid = c.fcoid
               and a.fitemid = c.fitemid
             where ' || v_filter ||
            ' order by a.fitemgroupid, a.fitemid';

    end if;

    open p_result_cursor for execute v_sql
    using
        p_pstrcoid,
        p_rdgbranch,
        p_strbrid,
        p_rdgitemgroup,
        p_stritemgroupid,
        p_rdgitem,
        p_stritemid,
        p_strfromitemid,
        p_strtoitemid,
        p_rdgitemstatus,
        p_blnsalesbelowcost;

end;
$BODY$;
ALTER PROCEDURE dbo.sp_rptitemlist(character varying, boolean, character varying, boolean, character varying, smallint, character varying, character varying, character varying, smallint, boolean, refcursor)
    OWNER TO postgres;

