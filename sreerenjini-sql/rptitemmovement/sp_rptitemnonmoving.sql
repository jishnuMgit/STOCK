-- dbo.sp_rptitemnonmoving - the Non Moving report (port of the SQL Server SP_rptItemNonMoving, used by the old report
-- rptItemNonMovingrpt). Run it yourself; it only creates a procedure.
--
-- WHAT IT SHOWS: the items that did NOT sell at all in a period, with the stock they still have as on the To date.
--   An item is "moving" when it has a sales line (SI / SR, and the old SIC / SIR / SRC / SRR) in the period, under the same
--   branch, item and post filters - even when the sale was returned in full (Moved Qty 0). Every other item is listed.
--   The items come from the item master (dbo.tblitemhd) - all of them, whatever the branch - and the stock is the
--   everything-in minus everything-out of the chosen branch(es), as on the To date, ALL document types. An item that is
--   not in the item master but has stock in the branch is listed too (blank name and group), as the old procedure did.
--   The order is by item group, then by item.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptitemnonmoving('01', NULL, true, 2, NULL, NULL, NULL, '2025-01-01', '2025-12-31', 1, 'cur_rptitemnonmoving');
--   FETCH ALL FROM "cur_rptitemnonmoving";
--   COMMIT;
--
-- Parameters: the same as dbo.sp_rptitemmovement (without the report type and the order by).
--   @gstrCoID -> p_pstrcoid   @strBrID -> p_strbrid   @rdgBranch -> p_rdgbranch (false One Branch, true All Branch)
--   @rdgItem  -> p_rdgitem (0 One Item, 1 Range Item, 2 All Item)   @strItemID -> p_stritemid
--   @strFromItemID -> p_strfromitemid   @strToItemID -> p_strtoitemid
--   @strFromDate -> p_dtpfromdate (DATE)   @strToDate -> p_dtptodate (DATE)
--   @cboPostStatus -> p_lkppoststatus   0 All, 1 Posted, 2 Non Posted (the old: 0 Non Posted, 1 Posted, 2 All)
--
-- Result columns: fitemid, fitemname, fitemgroupname, fstock   (the stock is a whole number, as in the old report)
--
-- Differences from the SQL Server procedure: no dynamic SQL and no temporary tables - one query, the filters are
-- parameters; the dates are DATE; the old sales types SIC / SIR / SRC / SRR are kept next to SI and SR.

CREATE OR REPLACE PROCEDURE dbo.sp_rptitemnonmoving(
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
	INOUT p_result_cursor refcursor
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
	OPEN p_result_cursor FOR
		WITH mv AS (
			-- the items that had a sale or a sales return in the period
			SELECT DISTINCT a.fitemid
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
		),
		cand AS (
			-- every item of the item master (within the item filter) and every item that has stock
			SELECT h.fitemid
			  FROM dbo.tblitemhd h
			 WHERE h.fcoid = p_pstrcoid
			   AND (   p_rdgitem NOT IN (0, 1)
			        OR (p_rdgitem = 0 AND h.fitemid = p_stritemid)
			        OR (p_rdgitem = 1 AND h.fitemid >= p_strfromitemid AND h.fitemid <= p_strtoitemid))
			UNION
			SELECT st.fitemid FROM st
		)
		SELECT c.fitemid,
		       h.fitemname,
		       g.fitemgroupname,
		       COALESCE(st.fstock, 0) AS fstock
		  FROM cand c
		  LEFT JOIN st
		    ON st.fitemid = c.fitemid
		  LEFT JOIN dbo.tblitemhd h
		    ON h.fcoid = p_pstrcoid
		   AND h.fitemid = c.fitemid
		  LEFT JOIN dbo.tblitemgroup g
		    ON g.fcoid = h.fcoid
		   AND g.fitemgroupid = h.fitemgroupid
		 WHERE NOT EXISTS (SELECT 1 FROM mv WHERE mv.fitemid = c.fitemid)
		 ORDER BY h.fitemgroupid, c.fitemid;
END;
$procedure$;
