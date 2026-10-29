-- dbo.sp_rptstockverification - the Stock Verification report (port of the SQL Server
-- SP_rptStockVerIfication, used by the old rptStockVerfication form and its rptStockVerificationrpt
-- report). Run it yourself; it only creates a procedure.
--
-- What it is for: the stock-taking list. It gives every item the books say is in stock ("Comp. Stock");
-- the counters write what they really counted ("Phys. Stock") beside it.
--
-- It reads dbo.tblstocktrans (the stock movements), dbo.tblitemhd (item name, unit, group) and
-- dbo.tblitemgroup (group name). No temporary tables and no text glued into SQL: the answer is one query,
-- returned through a refcursor.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptstockverification('01', true, NULL, 1, NULL, '2026-10-27', 0, 'cur_rptstockverification');
--   FETCH ALL FROM "cur_rptstockverification";
--   COMMIT;
--
-- Parameters: the SAME ones, in the SAME order, with the SAME meaning as the SQL Server
-- SP_rptStockVerIfication (@name -> p_name, lower case).
--   @gstrCoID       -> p_pstrcoid        the logged-in company
--   @rdgBranch      -> p_rdgbranch       false (0) One Branch, true (1) All Branch
--   @strBrID        -> p_strbrid         the branch, used when p_rdgbranch is false
--   @rdgItemGroup   -> p_rdgitemgroup    0 One Item Group, anything else All Item Group
--   @strItemGroupID -> p_stritemgroupid  the item group, used when p_rdgitemgroup = 0
--   @strAsOnDate    -> p_dtpasondate     DATE (the old one was dd/mm/yyyy text); the whole of that day counts
--   @cboPostStatus  -> p_lkppoststatus   0 All, 1 Posted, 2 Non Posted  (the codes of the Stock report and
--                                        the Stock Valuation; the old @cboPostStatus was 0 Non Posted,
--                                        1 Posted, 2 All)
--
-- Result columns: fbrid, fitemid, fitemgroupid, fitemgroupname, fitemname, funit, fstock
--   * fstock = Qty In - Qty Out of every movement up to the As On Date;
--   * BY BRANCH: the stock is added up per BRANCH and item (the old procedure added an item up over all the
--     branches into one number, "GROUP BY fCoID, fItemID" - to be confirmed with the tech lead); with One
--     Branch there is one branch, with All Branch the backend prints one section per branch
--     ("Branch : Jeddah", its items, then the next ...), as the Stock report and the Stock Valuation do;
--   * items whose stock is 0 are left out (the old HAVING Sum(In - Out) <> 0);
--   * the rows come ordered by item group, item, branch (the backend puts the branches in the order of the
--     Branch screen).

CREATE OR REPLACE PROCEDURE dbo.sp_rptstockverification(
	IN p_pstrcoid character varying,        -- the logged-in company
	IN p_rdgbranch boolean,                 -- false (0) = One Branch, true (1) = All Branch
	IN p_strbrid character varying,         -- the branch, used when p_rdgbranch is false
	IN p_rdgitemgroup integer,              -- 0 = One Item Group, anything else = All Item Group
	IN p_stritemgroupid character varying,  -- the item group, used when p_rdgitemgroup = 0
	IN p_dtpasondate date,                  -- the As On Date (the whole of that day counts)
	IN p_lkppoststatus integer,             -- 0 = All, 1 = Posted, 2 = Non Posted
	IN p_result_cursor refcursor DEFAULT 'cur_rptstockverification'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_to_excl date := p_dtpasondate + 1;   -- the whole of the As On Date counts
BEGIN

    -- THE CODES (the same as the old SP_rptStockVerIfication)
    --   p_rdgbranch      false One Branch   true All Branch
    --   p_rdgitemgroup   0 One Item Group   (anything else: All Item Group)
    --   p_lkppoststatus  0 All              1 Posted              2 Non Posted

    OPEN p_result_cursor FOR
        WITH base AS (
            SELECT a.fbrid,
                   a.fitemid,
                   b.fitemgroupid,
                   COALESCE(a.fqtyin, 0) - COALESCE(a.fqtyout, 0) AS fnet
              FROM dbo.tblstocktrans a
              LEFT JOIN dbo.tblitemhd b
                ON b.fcoid = a.fcoid AND b.fitemid = a.fitemid
             WHERE a.fcoid = p_pstrcoid
               -- false One Branch, true All Branch
               AND (p_rdgbranch OR a.fbrid = p_strbrid)
               -- 0 One Item Group, anything else All Item Group
               AND (p_rdgitemgroup <> 0 OR b.fitemgroupid = p_stritemgroupid)
               -- 0 All, 1 Posted (fpost = true), 2 Non Posted (fpost = false)
               AND (p_lkppoststatus = 0 OR a.fpost = (p_lkppoststatus = 1))
               AND a.fdate < v_to_excl
        ),
        sums AS (
            SELECT fbrid,
                   fitemid,
                   MAX(fitemgroupid)  AS fitemgroupid,
                   SUM(fnet)          AS fstock
              FROM base
             GROUP BY fbrid, fitemid
            HAVING SUM(fnet) <> 0
        )
        SELECT s.fbrid,
               s.fitemid,
               s.fitemgroupid,
               g.fitemgroupname,
               h.fitemname,
               h.funit,
               s.fstock
          FROM sums s
          LEFT JOIN dbo.tblitemhd h
            ON h.fcoid = p_pstrcoid AND h.fitemid = s.fitemid
          LEFT JOIN dbo.tblitemgroup g
            ON g.fcoid = p_pstrcoid AND g.fitemgroupid = s.fitemgroupid
         ORDER BY s.fitemgroupid, s.fitemid, s.fbrid;

END;
$BODY$;
