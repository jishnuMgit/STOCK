-- dbo.sp_rptitemmovement - the Fast Moving and the Slow Moving report (port of the SQL Server SP_rptItemMovement, used by
-- the old report rptItemMovementrpt). Run it yourself; it only creates a procedure.
--
-- WHAT IT SHOWS: the items that SOLD in a period, with how much they moved.
--   Moved Qty    = what the sales invoices took OUT minus what the sales returns brought back IN, in the period
--   Moved Value  = the same net quantity x the SELLING price (funitprice) of each line
--   Stock        = the stock the item has as on the To date: everything IN minus everything OUT, ALL document types
--                  (the same branch, item and post filters; no lower date)
-- Only the items that moved 1 or more are kept (a sale that is returned in full, Moved Qty 0, is dropped).
--   Fast Moving  the biggest first;  Slow Moving  the smallest first (the same items, the other way round).
--   The order is by Qty or by Value (p_rdgorderby).
-- The items that did NOT sell at all are the Non Moving report: dbo.sp_rptitemnonmoving.
--
-- It reads dbo.tblstocktrans (the lines), dbo.tblitemhd (the name) and dbo.tblitemgroup (the group name). No temporary
-- tables and no text glued into SQL: the answer is one query, returned through a refcursor.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptitemmovement('01', NULL, true, 2, NULL, NULL, NULL, '2025-01-01', '2025-12-31', 1, 'F', 0, 'cur_rptitemmovement');
--   FETCH ALL FROM "cur_rptitemmovement";
--   COMMIT;
--
-- Parameters (the old @name -> p_name, lower case; the dates are DATE now, the old ones were dd/mm/yyyy text):
--   @gstrCoID      -> p_pstrcoid        the logged-in company
--   @strBrID       -> p_strbrid         the branch, used when p_rdgbranch is false
--   @rdgBranch     -> p_rdgbranch       false (0) One Branch, true (1) All Branch   (bit there, boolean here)
--   @rdgItem       -> p_rdgitem         0 One Item, 1 Range Item, 2 All Item
--   @strItemID     -> p_stritemid       used when p_rdgitem = 0
--   @strFromItemID -> p_strfromitemid   used when p_rdgitem = 1: the first item (first <= item <= last)
--   @strToItemID   -> p_strtoitemid     used when p_rdgitem = 1: the last item
--   @strFromDate   -> p_dtpfromdate     DATE, the whole of that day counts
--   @strToDate     -> p_dtptodate       DATE, the whole of that day counts
--   @cboPostStatus -> p_lkppoststatus   0 All, 1 Posted, 2 Non Posted  (the codes of the other stock reports; the old
--                                       @cboPostStatus was 0 Non Posted, 1 Posted, 2 All)
--   @strRptType    -> p_strrpttype      'F' Fast Moving, 'S' Slow Moving
--   @rdgOrderBy    -> p_rdgorderby      0 Order by Qty, 1 Order by Value
--
-- Result columns: fitemid, fitemname, fitemgroupname, fmovedqty, fmovedvalue, fstock
--   * the quantities (Moved Qty, Stock) are whole numbers: the old temporary table kept them as NUMERIC with no
--     decimals, so the sums were rounded; the Moved Value has 2 decimals (the old numeric(18,2));
--   * an item that is not in the item master (dbo.tblitemhd) comes with a blank name and group, as the old LEFT JOIN did.
--
-- Differences from the SQL Server procedure - all forced by our tables, or for safety:
--   * the sales documents are SI and SR (the old SIC / SIR / SRC / SRR are one SI and one SR now); the old types are kept in
--     the list so the sales that were made under them still count;
--   * the filters are parameters, no dynamic SQL, no temporary tables;
--   * fIntDocNo is not used by this report.

CREATE OR REPLACE PROCEDURE dbo.sp_rptitemmovement(
	IN p_pstrcoid character varying,        -- the logged-in company
	IN p_strbrid character varying,         -- the branch, used when p_rdgbranch is false
	IN p_rdgbranch boolean,                 -- false (0) = One Branch, true (1) = All Branch
	IN p_rdgitem integer,                   -- 0 = One Item, 1 = Range Item, 2 = All Item
	IN p_stritemid character varying,       -- the item, used when p_rdgitem = 0
	IN p_strfromitemid character varying,   -- the first item of the range, used when p_rdgitem = 1
	IN p_strtoitemid character varying,     -- the last item of the range, used when p_rdgitem = 1
	IN p_dtpfromdate date,                  -- from this date (the whole day counts)
	IN p_dtptodate date,                    -- to this date (the whole day counts)
	IN p_lkppoststatus integer,             -- 0 = All, 1 = Posted, 2 = Non Posted
	IN p_strrpttype character varying,      -- 'F' = Fast Moving, 'S' = Slow Moving
	IN p_rdgorderby integer,                -- 0 = Order by Qty, 1 = Order by Value
	INOUT p_result_cursor refcursor
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
	OPEN p_result_cursor FOR
		WITH mv AS (
			-- what the sales took out minus what the returns brought in, in the period
			SELECT a.fitemid,
			       ROUND(SUM(COALESCE(a.fqtyout, 0) - COALESCE(a.fqtyin, 0)), 0)                                   AS fmovedqty,
			       ROUND(SUM((COALESCE(a.fqtyout, 0) - COALESCE(a.fqtyin, 0)) * COALESCE(a.funitprice, 0)), 2)     AS fmovedvalue
			  FROM dbo.tblstocktrans a
			 WHERE a.fcoid = p_pstrcoid
			   AND a.fdoctype IN ('SI', 'SR', 'SIC', 'SIR', 'SRC', 'SRR')
			   AND (p_rdgbranch OR a.fbrid = p_strbrid)
			   AND (   p_rdgitem NOT IN (0, 1)
			        OR (p_rdgitem = 0 AND a.fitemid = p_stritemid)
			        OR (p_rdgitem = 1 AND a.fitemid >= p_strfromitemid AND a.fitemid <= p_strtoitemid))
			   AND (p_lkppoststatus = 0 OR a.fpost = (p_lkppoststatus = 1))
			   AND a.fdate >= p_dtpfromdate
			   AND a.fdate <  p_dtptodate + 1
			 GROUP BY a.fitemid
		),
		st AS (
			-- the stock as on the To date: everything in minus everything out, every document type
			SELECT a.fitemid,
			       ROUND(SUM(COALESCE(a.fqtyin, 0) - COALESCE(a.fqtyout, 0)), 0) AS fstock
			  FROM dbo.tblstocktrans a
			 WHERE a.fcoid = p_pstrcoid
			   AND (p_rdgbranch OR a.fbrid = p_strbrid)
			   AND (   p_rdgitem NOT IN (0, 1)
			        OR (p_rdgitem = 0 AND a.fitemid = p_stritemid)
			        OR (p_rdgitem = 1 AND a.fitemid >= p_strfromitemid AND a.fitemid <= p_strtoitemid))
			   AND (p_lkppoststatus = 0 OR a.fpost = (p_lkppoststatus = 1))
			   AND a.fdate < p_dtptodate + 1
			 GROUP BY a.fitemid
		)
		SELECT mv.fitemid,
		       h.fitemname,
		       g.fitemgroupname,
		       mv.fmovedqty,
		       mv.fmovedvalue,
		       COALESCE(st.fstock, 0) AS fstock
		  FROM mv
		  LEFT JOIN st
		    ON st.fitemid = mv.fitemid
		  LEFT JOIN dbo.tblitemhd h
		    ON h.fcoid = p_pstrcoid
		   AND h.fitemid = mv.fitemid
		  LEFT JOIN dbo.tblitemgroup g
		    ON g.fcoid = h.fcoid
		   AND g.fitemgroupid = h.fitemgroupid
		 WHERE mv.fmovedqty >= 1
		 -- Fast: the biggest first, Slow: the smallest first; by Qty (0) or by Value (1)
		 ORDER BY (CASE WHEN p_rdgorderby = 0 THEN mv.fmovedqty ELSE mv.fmovedvalue END)
		          * (CASE WHEN p_strrpttype = 'F' THEN -1 ELSE 1 END),
		          mv.fitemid;
END;
$procedure$;
