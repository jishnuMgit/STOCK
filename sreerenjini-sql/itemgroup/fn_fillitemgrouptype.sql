-- =====================================================================
-- dbo.fillitemgrouptype(p_pstrcoid)
--
-- The Stock / Non-stock dropdown of the Item Group page: the item group types of the company, from tblstockparam
-- (fptype 'IGTP'):
--     fpid   S   fpname  Stock Item     <- stored in tblitemgroup.fsn
--     fpid   N   fpname  Non Stock
-- The box shows fpname, the page keeps (and saves) fpid.
--
-- (dbo.getpurchasestockparam() is the same idea for the purchase invoice types - it is fixed to fptype 'PITP' and has no
-- company, so it cannot serve here.)
-- =====================================================================

CREATE OR REPLACE FUNCTION dbo.fillitemgrouptype(p_pstrcoid varchar)
RETURNS TABLE (fpid varchar, fpname varchar)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT s.fpid,
           s.fpname
      FROM dbo.tblstockparam AS s
     WHERE s.fcoid = p_pstrcoid
       AND s.fptype = 'IGTP'
     ORDER BY s.fpid DESC;     -- Stock Item (S) first, then Non Stock (N)
END;
$$;
