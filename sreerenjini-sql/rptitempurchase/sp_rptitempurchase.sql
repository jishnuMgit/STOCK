-- dbo.sp_rptitempurchase - the Item Purchase report (port of the SQL Server SP_rptItemPurchase, used by the old
-- report rptItemPurchaseRpt). Run it yourself; it only creates a procedure.
--
-- WHAT IT SHOWS: every purchase of an item, LINE BY LINE, in a period - the Purchase Invoices (PI) and the
-- Purchase Returns (PR). The backend groups the lines by item and adds the Qty Total of every item:
--       Item : 0001   o1item1
--       28-Oct-26   PI   JD-2600001   11   111   110.00   supplier1
--       Total :                             111
-- A Purchase Return counts as MINUS in the Qty (the old: fQtyOut * -1), so a purchase and its return add up to 0.
--
-- It reads dbo.tblstocktrans (the document lines), dbo.tblitemhd (the item name) and dbo.tblaccountcs (the
-- supplier name). No temporary tables and no text glued into SQL: the answer is one query, returned through a
-- refcursor.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptitempurchase('01', true, NULL, true, NULL, '2026-10-01', '2026-10-31', 'cur_rptitempurchase');
--   FETCH ALL FROM "cur_rptitempurchase";
--   COMMIT;
--
-- Parameters (the old @name -> p_name, lower case; the two dates are DATE now, the old ones were dd/mm/yyyy text):
--   @gstrCoID    -> p_pstrcoid     the logged-in company
--   @rdgBranch   -> p_rdgbranch    false (0) One Branch, true (1) All Branch   (bit there, boolean here)
--   @strBrID     -> p_strbrid      the branch, used when p_rdgbranch is false
--   @rdgItem     -> p_rdgitem      false (0) One Item, true (1) All Item       (bit there, boolean here)
--   @strItemID   -> p_stritemid    the item, used when p_rdgitem is false
--   @strFromDate -> p_dtpfromdate  DATE, the whole of that day counts
--   @strToDate   -> p_dtptodate    DATE, the whole of that day counts
--
-- Result columns: fbrid, fdocno, fdoctype, fpino, fdate, fitemid, fqty, funitprice, fcsaccountid,
--                 fitemname, fcsaccountname
--   * fqty        = Qty In of a PI, MINUS the Qty Out of a PR;
--   * funitprice  = the unit price printed on the document (not the cost);
--   * fpino       = the supplier's invoice no. of a PI; a PR has none (the old procedure did not take it for a PR);
--   * the rows come ordered by item, date, document no., line (the old: Order By fItemID, fDate).
--
-- Differences from the SQL Server procedure - all forced by our tables, or for safety:
--   * the supplier is tblstocktrans.fcsaccountid (the old fAccountID) and its name comes from tblaccountcs;
--   * the old procedure copied the rows of the PI and of the PR into a temporary table and read it again; here the
--     two kinds are read in ONE query;
--   * fIntDocNo is not in our table (the report does not show it);
--   * the filters are parameters, no dynamic SQL, no temporary tables;
--   * like the old procedure it takes posted AND not posted documents.

CREATE OR REPLACE PROCEDURE dbo.sp_rptitempurchase(
	IN p_pstrcoid character varying,        -- the logged-in company
	IN p_rdgbranch boolean,                 -- false (0) = One Branch, true (1) = All Branch
	IN p_strbrid character varying,         -- the branch, used when p_rdgbranch is false
	IN p_rdgitem boolean,                   -- false (0) = One Item, true (1) = All Item
	IN p_stritemid character varying,       -- the item, used when p_rdgitem is false
	IN p_dtpfromdate date,                  -- from this date (the whole day counts)
	IN p_dtptodate date,                    -- to this date (the whole day counts)
	INOUT p_result_cursor refcursor
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
	OPEN p_result_cursor FOR
		SELECT a.fbrid,
		       a.fdocno,
		       a.fdoctype,
		       CASE WHEN a.fdoctype = 'PI' THEN a.fpino END                      AS fpino,
		       a.fdate::date                                                      AS fdate,
		       a.fitemid,
		       CASE WHEN a.fdoctype = 'PR' THEN -COALESCE(a.fqtyout, 0)
		            ELSE COALESCE(a.fqtyin, 0) END                                AS fqty,
		       COALESCE(a.funitprice, 0)                                          AS funitprice,
		       a.fcsaccountid,
		       h.fitemname,
		       s.fcsaccountname
		  FROM dbo.tblstocktrans a
		  LEFT JOIN dbo.tblitemhd h
		    ON h.fcoid = a.fcoid
		   AND h.fitemid = a.fitemid
		  LEFT JOIN dbo.tblaccountcs s
		    ON s.fcoid = a.fcoid
		   AND s.fcsaccountid = a.fcsaccountid
		 WHERE a.fcoid = p_pstrcoid
		   AND a.fdoctype IN ('PI', 'PR')
		   AND (p_rdgbranch OR a.fbrid = p_strbrid)
		   AND (p_rdgitem OR a.fitemid = p_stritemid)
		   AND a.fdate >= p_dtpfromdate
		   AND a.fdate <  p_dtptodate + 1
		 ORDER BY a.fitemid, a.fdate, a.fdocno, a.fslno;
END;
$procedure$;
