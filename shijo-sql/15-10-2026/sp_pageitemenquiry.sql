-- PROCEDURE: dbo.sp_pageitemenquiry(character varying, character varying, character varying, character varying, refcursor)

 DROP PROCEDURE IF EXISTS dbo.sp_pageitemenquiry(character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageitemenquiry(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_pstryear character varying DEFAULT NULL::character varying,
	IN p_stritemid character varying DEFAULT NULL::character varying,
	INOUT p_result_cursor refcursor DEFAULT 'cur_pageitemenquiry'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
begin
    if p_strmode = 'G' then

        open p_result_cursor for
            select
                a.fitemid,
                a.fitemname
            from dbo.tblitemhd a
            where a.fcoid = p_pstrcoid
            order by a.fitemid;

    elsif p_strmode = 'GHD' then

        open p_result_cursor for
            select
                a.fitemid,
                a.fitemname,
                a.funit,
                a.fpacking,
                a.fcbm,
                a.fitemgroupid,
                g.fitemgroupname,
                a.fsupplierid,
                s.faccountname as fsuppliername,
                a.fsupplieritemid,
                a.freorderlevel,
                a.freorderqty
            from dbo.tblitemhd a
            left join dbo.tblitemgroup g
                on g.fcoid = a.fcoid
               and g.fitemgroupid = a.fitemgroupid
            left join dbo.tblaccount s
                on s.fcoid = a.fcoid
               and s.faccountid = a.fsupplierid
            where a.fcoid = p_pstrcoid
              and a.fitemid = p_stritemid;

    elsif p_strmode = 'GTL' then

        open p_result_cursor for
            select
                c.fbrid,
                c.fbrname,
                coalesce(sc.fstock, 0) as fstock,
                coalesce(sc.fpreviousunitcost, 0) as fpreviousunitcost,
                a.funitprice,
                coalesce(sc.funitcost, 0) as funitcost,
                coalesce(sc.fstock, 0) * coalesce(sc.funitcost, 0)
                    as ftotalcost
            from dbo.tblitemtl a
            inner join dbo.tblbranch c
                on c.fcoid = a.fcoid
               and c.fbrid = a.fbrid
            left join dbo.tblstockcontrol sc
                on sc.fcoid = a.fcoid
               and sc.fitemid = a.fitemid
               and sc.fbrid = a.fbrid
               and sc.fyear::varchar(4) = p_pstryear
            where a.fcoid = p_pstrcoid
              and a.fitemid = p_stritemid
            order by c.fbrid;

    end if;
end;
$BODY$;
ALTER PROCEDURE dbo.sp_pageitemenquiry(character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

