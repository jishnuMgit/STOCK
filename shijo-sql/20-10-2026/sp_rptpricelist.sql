-- dbo.sp_rptpricelist with the Item Group / Item filters.
-- NULL filter = all.  The signature changed, so the OLD version must be dropped
-- (otherwise two overloads stay in the database):
DROP PROCEDURE IF EXISTS dbo.sp_rptpricelist(character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptpricelist(
    IN p_pstrcoid   varchar(3),
    IN p_strbranch  varchar(8) DEFAULT NULL,
    IN p_strgroupid varchar    DEFAULT NULL,   -- One Item Group (NULL = all)
    IN p_stritemfrom varchar   DEFAULT NULL,   -- One Item / Range Item (NULL = all)
    IN p_stritemto   varchar   DEFAULT NULL,
    INOUT p_result_cursor refcursor DEFAULT 'cur_rptpricelist'
)
LANGUAGE plpgsql
AS $body$
BEGIN
    OPEN p_result_cursor FOR
        SELECT
            a.fbrid,
            a.fitemid,
            b.fitemname,
            a.funitprice,
            e.funitcost,
            b.funit,
            b.fitemgroupid,
            c.fitemgroupname,
            d.fbrname
        FROM dbo.tblitemtl a
        LEFT JOIN dbo.tblitemhd b
               ON a.fcoid = b.fcoid
              AND a.fitemid = b.fitemid
        LEFT JOIN dbo.tblstockcontrol e
               ON e.fcoid = b.fcoid
              AND e.fitemid = b.fitemid
			  AND e.fbrid = a.fbrid
        LEFT JOIN dbo.tblitemgroup c
               ON b.fitemgroupid = c.fitemgroupid
        LEFT JOIN dbo.tblbranch d
               ON a.fbrid = d.fbrid
        WHERE a.fcoid = p_pstrcoid
          AND (p_strbranch   IS NULL OR a.fbrid = p_strbranch)
          AND (p_strgroupid  IS NULL OR b.fitemgroupid = p_strgroupid)
          AND (p_stritemfrom IS NULL OR a.fitemid >= p_stritemfrom)
          AND (p_stritemto   IS NULL OR a.fitemid <= p_stritemto)
        ORDER BY b.fitemgroupid, a.fitemid;
END;
$body$;