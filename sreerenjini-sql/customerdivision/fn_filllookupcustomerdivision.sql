-- =====================================================================
-- dbo.filllookupcustomerdivision(p_pstrcoid)
--
-- The Customer ID / Customer Name boxes of the Customer Division screen: the customers that HAVE divisions - the old
-- form listed  fHaveDivision = 1  (the "Have Division" flag of the customer), by name.
-- (dbo.filllookupcustomername lists every customer.)
-- =====================================================================

-- the first install named the company parameter p_coid: CREATE OR REPLACE cannot rename a parameter, so it is dropped first
DROP FUNCTION IF EXISTS dbo.filllookupcustomerdivision(varchar);

CREATE OR REPLACE FUNCTION dbo.filllookupcustomerdivision(p_pstrcoid varchar)
RETURNS TABLE (fcsaccountid varchar, fcsaccountname varchar)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT a.fcsaccountid,
           a.fcsaccountname
      FROM dbo.tblaccountcs AS a
     WHERE a.fcoid = p_pstrcoid
       AND a.fcs = 'C'
       AND a.fhavedivision = TRUE
     ORDER BY a.fcsaccountname;
END;
$$;
