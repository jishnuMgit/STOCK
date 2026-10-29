-- dbo.getunitcost - the stored Unit Cost of an item in a branch (port of the SQL Server dbo.GetUnitCost).
-- Run it yourself; it only creates a function.
--
-- It is the cost kept in dbo.tblstockcontrol (company + year + branch + item); it changes only when a
-- document is POSTED (weighted average), the same cost the Stock Valuation shows.
-- An item with no row there has the cost 0 (the old function returned NULL, which the reports showed as 0).
--
-- Parameters (the old @name -> p_name, lower case):
--   @gstrCoID  -> p_pstrcoid   the logged-in company
--   @gintYear  -> p_pstryear   the login year
--   @strBrID   -> p_strbrid    the branch
--   @strItemID -> p_stritemid  the item
--
-- Try:  SELECT dbo.getunitcost('01', '2026', 'JD', '3U-11W-10');

CREATE OR REPLACE FUNCTION dbo.getunitcost(
	p_pstrcoid character varying,
	p_pstryear character varying,
	p_strbrid character varying,
	p_stritemid character varying
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $function$
	SELECT COALESCE(
		(SELECT sc.funitcost
		   FROM dbo.tblstockcontrol sc
		  WHERE sc.fcoid  = p_pstrcoid
		    AND sc.fyear::varchar = p_pstryear
		    AND sc.fbrid  = p_strbrid
		    AND sc.fitemid = p_stritemid
		  LIMIT 1),
		0);
$function$;
