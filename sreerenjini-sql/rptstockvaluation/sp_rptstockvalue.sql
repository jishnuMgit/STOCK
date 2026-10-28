-- dbo.sp_rptstockvalue - the Stock Valuation report (port of the SQL Server SP_rptStockValue, used by the
-- old rptStockValue form and its rptStockValuerpt report). Run it yourself; it only creates a procedure.
--
-- It reads dbo.tblstocktrans (the stock movements), dbo.tblitemhd (item name, unit, group),
-- dbo.tblitemgroup (group name) and dbo.tblstockcontrol (the stored unit cost).
-- No temporary tables and no text glued into SQL: the answer is one query, returned through a refcursor.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptstockvalue('01', 2, NULL, NULL, 1, NULL, '2026-10-26', 1, '2026', 'cur_rptstockvalue');
--   FETCH ALL FROM "cur_rptstockvalue";
--   COMMIT;
--
-- Parameters: the SAME ones, in the SAME order, with the SAME codes as the SQL Server SP_rptStockValue
-- (@name -> p_name, lower case), plus p_pstryear (new, see below).
--   @gstrCoID       -> p_pstrcoid        the company (the logged-in company, Pstr = logged-in value)
--   @rdgBranch      -> p_rdgbranch       0 One Branch, 1 Selected Branch, 2 All Branch
--   @strBrID        -> p_strbrid         the branch, used when p_rdgbranch = 0
--   @strFilter      -> p_strfilter       the ticked branch ids (a list), used when p_rdgbranch = 1.
--                                        (The old one was a piece of SQL text, " (a.fBrID='01' OR ...)",
--                                        pasted into the query; a list of ids does the same, safely.)
--   @rdgItemGroup   -> p_rdgitemgroup    0 One Item Group, anything else All Item Group
--   @strItemGroupID -> p_stritemgroupid  the item group, used when p_rdgitemgroup = 0
--   @strAsOnDate    -> p_strasondate     DATE (the old one was dd/mm/yyyy text); the whole of that day counts
--   @cboPostStatus  -> p_lkppoststatus   0 All, 1 Posted, 2 Non Posted  (the codes of the Stock report;
--                                        the old @cboPostStatus was 0 Non Posted, 1 Posted, 2 All)
--   (new)           -> p_pstryear        the login year: which tblstockcontrol row gives the Unit Cost
--
-- Result columns: fbrid, fitemid, fitemgroupid, fitemgroupname, fitemname, funit, fstock, funitcost, fstockvalue
--   * fstock      = Qty In - Qty Out of every movement up to the As On Date (per branch and item);
--   * fstockvalue = (Qty In - Qty Out) * the movement's own unit cost, only for movements with a unit cost
--                   other than 0 (as in the old procedure);
--   * funitcost   = the STORED cost of the item in that branch (tblstockcontrol.funitcost - the job of
--                   tblItemTL.fUnitCost in the old database), 0 when the item has no stock control row yet.
--                   As in the old report it is not Stock Value / Stock.
--   * items whose stock is 0 are left out (the old "Delete from #tblStockValue where fStock = 0").
--   * the rows come ordered by item group, item, branch. For One Branch there is one row per item; for
--     Selected / All Branch there is one row per item PER BRANCH (as in the old report).

-- the input p_cbopoststatus is now p_lkppoststatus: a parameter cannot be renamed with CREATE OR REPLACE,
-- so the old one goes first
DROP PROCEDURE IF EXISTS dbo.sp_rptstockvalue(character varying, integer, character varying, character varying[], integer, character varying, date, integer, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptstockvalue(
	IN p_pstrcoid character varying,        -- the logged-in company
	IN p_rdgbranch integer,                 -- 0 = One Branch, 1 = Selected Branch, 2 = All Branch
	IN p_strbrid character varying,         -- the branch, used when p_rdgbranch = 0
	IN p_strfilter character varying[],     -- the ticked branch ids, used when p_rdgbranch = 1
	IN p_rdgitemgroup integer,              -- 0 = One Item Group, anything else = All Item Group
	IN p_stritemgroupid character varying,  -- the item group, used when p_rdgitemgroup = 0
	IN p_strasondate date,                  -- the As On Date (the whole of that day counts)
	IN p_lkppoststatus integer,             -- 0 = All, 1 = Posted, 2 = Non Posted
	IN p_pstryear character varying,        -- the login year (picks the tblstockcontrol row of the Unit Cost)
	IN p_result_cursor refcursor DEFAULT 'cur_rptstockvalue'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_to_excl date := p_strasondate + 1;   -- the whole of the As On Date counts
BEGIN

    -- THE CODES (the same as the old SP_rptStockValue)
    --   p_rdgbranch      0 One Branch      1 Selected Branch      2 All Branch
    --   p_rdgitemgroup   0 One Item Group  (anything else: All Item Group)
    --   p_lkppoststatus  0 All             1 Posted               2 Non Posted

    OPEN p_result_cursor FOR
        WITH base AS (
            SELECT a.fbrid,
                   a.fitemid,
                   b.fitemgroupid,
                   COALESCE(a.fqtyin, 0) - COALESCE(a.fqtyout, 0) AS fnet,
                   a.funitcost
              FROM dbo.tblstocktrans a
              LEFT JOIN dbo.tblitemhd b
                ON b.fcoid = a.fcoid AND b.fitemid = a.fitemid
             WHERE a.fcoid = p_pstrcoid
               -- 0 One Branch, 1 Selected Branch, 2 All Branch
               AND (   p_rdgbranch = 2
                    OR (p_rdgbranch = 0 AND a.fbrid = p_strbrid)
                    OR (p_rdgbranch = 1 AND a.fbrid = ANY (p_strfilter)))
               -- 0 All, 1 Posted (fpost = true), 2 Non Posted (fpost = false)
               AND (p_lkppoststatus = 0 OR a.fpost = (p_lkppoststatus = 1))
               -- 0 One Item Group, anything else All Item Group
               AND (p_rdgitemgroup <> 0 OR b.fitemgroupid = p_stritemgroupid)
               AND a.fdate < v_to_excl
        ),
        sums AS (
            SELECT fbrid,
                   fitemid,
                   MAX(fitemgroupid)                                         AS fitemgroupid,
                   SUM(fnet)                                                 AS fstock,
                   -- only the movements that have a unit cost are valued (old: fUnitCost <> 0)
                   SUM(fnet * funitcost) FILTER (WHERE funitcost <> 0)       AS fstockvalue
              FROM base
             GROUP BY fbrid, fitemid
        )
        SELECT s.fbrid,
               s.fitemid,
               s.fitemgroupid,
               g.fitemgroupname,
               h.fitemname,
               h.funit,
               s.fstock,
               COALESCE(sc.funitcost, 0)       AS funitcost,
               COALESCE(s.fstockvalue, 0)      AS fstockvalue
          FROM sums s
          LEFT JOIN dbo.tblitemhd h
            ON h.fcoid = p_pstrcoid AND h.fitemid = s.fitemid
          LEFT JOIN dbo.tblitemgroup g
            ON g.fcoid = p_pstrcoid AND g.fitemgroupid = s.fitemgroupid
          LEFT JOIN dbo.tblstockcontrol sc
            ON sc.fcoid = p_pstrcoid
           AND sc.fbrid = s.fbrid
           AND sc.fitemid = s.fitemid
           AND sc.fyear = p_pstryear
         WHERE s.fstock <> 0
         ORDER BY s.fitemgroupid, s.fitemid, s.fbrid;

END;
$BODY$;
