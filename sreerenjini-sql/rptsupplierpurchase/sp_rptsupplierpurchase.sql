-- dbo.sp_rptsupplierpurchase - the Supplier Purchase SUMMARY (port of the SQL Server SP_rptSupplierPurchase,
-- used by the old report rptSupplierPurchaseRpt). Run it yourself; it only creates a procedure.
--
-- WHAT IT SHOWS: every Purchase Invoice (PI) and Purchase Return (PR) of the period, ONE LINE PER DOCUMENT, with
-- the supplier it belongs to. The backend groups the lines by supplier and adds the Total of every supplier:
--       Supplier : 70000   supplier1
--       28-Oct-26   PI   JD-2600001   12,450.0000   12,450.00
--       ...
--       Total :                       12,450.0000   12,450.00
-- A Purchase Return counts as MINUS (the old: fNetDocAmt * -1).
--
-- It reads dbo.tblstocktrans (the document lines), dbo.tblfintrans (the extra costs of a document) and
-- dbo.tblaccountcs (the supplier name). No temporary tables and no text glued into SQL: the answer is one query,
-- returned through a refcursor.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptsupplierpurchase('01', true, NULL, true, NULL, '2026-10-01', '2026-10-31', 'cur_rptsupplierpurchase');
--   FETCH ALL FROM "cur_rptsupplierpurchase";
--   COMMIT;
--
-- Parameters (the old @name -> p_name, lower case; the two dates are DATE now, the old ones were dd/mm/yyyy text):
--   @gstrCoID      -> p_pstrcoid       the logged-in company
--   @rdgBranch     -> p_rdgbranch      false (0) One Branch, true (1) All Branch      (bit there, boolean here)
--   @strBrID       -> p_strbrid        the branch, used when p_rdgbranch is false
--   @rdgSupplier   -> p_rdgsupplier    false (0) One Supplier, true (1) All Supplier  (bit there, boolean here)
--   @strSupplierID -> p_strsupplierid  the supplier, used when p_rdgsupplier is false
--   @strFromDate   -> p_dtpfromdate    DATE, the whole of that day counts
--   @strToDate     -> p_dtptodate      DATE, the whole of that day counts
--
-- Result columns: fbrid, fdocno, fdoctype, fdate, fcsaccountid, fcsaccountname, fnetdocamt_fc, fnetdocamt
--   * fnetdocamt     = the net amount of the document (Amount), MINUS for a PR;
--   * fnetdocamt_fc  = the same in the SUPPLIER'S CURRENCY (Amount_FC): the sum of the lines' fsup_totalprice
--                      plus the extra costs of the document (see below), MINUS for a PR;
--   * the rows come ordered by supplier, date, document no. (the old: Order By fAccountID, fDate).
--
-- Differences from the SQL Server procedure - all forced by our tables, or for safety:
--   * the supplier is tblstocktrans.fcsaccountid (the old fAccountID) and its name comes from tblaccountcs;
--   * the old _FC columns (fTotalPrice_FC) are fsup_totalprice here. The Purchase Invoice screen does not save
--     them any more (a document saved now has 0 there), so a line with 0 uses its normal total price divided by the
--     currency rate of the document - the same thing, as the foreign amount x the rate = our amount;
--   * the extra costs (freight ... entered with "Purchase Expense") are the lines of the document in tblfintrans
--     with fslno > 0, as the old one did. tblfintrans keeps them in OUR currency only, so they are divided by the
--     currency rate of the document to give the foreign-currency amount (the old fDebitFC / fCreditFC columns
--     do not exist). In the data so far no invoice has such lines, so this adds 0;
--   * the old procedure had no fIntDocNo here, the documents are ordered by their document no.;
--   * a document is told apart by branch + year + type + document no. (the old one ignored the year);
--   * the filters are parameters, no dynamic SQL, no temporary tables.
--   * like the old procedure it takes posted AND not posted documents.

CREATE OR REPLACE PROCEDURE dbo.sp_rptsupplierpurchase(
	IN p_pstrcoid character varying,        -- the logged-in company
	IN p_rdgbranch boolean,                 -- false (0) = One Branch, true (1) = All Branch
	IN p_strbrid character varying,         -- the branch, used when p_rdgbranch is false
	IN p_rdgsupplier boolean,               -- false (0) = One Supplier, true (1) = All Supplier
	IN p_strsupplierid character varying,   -- the supplier, used when p_rdgsupplier is false
	IN p_dtpfromdate date,                  -- from this date (the whole day counts)
	IN p_dtptodate date,                    -- to this date (the whole day counts)
	INOUT p_result_cursor refcursor
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
	OPEN p_result_cursor FOR
		WITH docs AS (
			-- one row per document: its lines are added up
			SELECT a.fyear,
			       a.fbrid,
			       a.fdoctype,
			       a.fdocno,
			       MIN(a.fdate)::date                              AS fdate,
			       MIN(a.fcsaccountid)                             AS fcsaccountid,
			       MAX(a.fnetdocamt)                               AS fnetdocamt,
			       SUM(CASE WHEN COALESCE(a.fsup_totalprice, 0) <> 0
			                THEN a.fsup_totalprice
			                ELSE COALESCE(a.ftotalprice, 0) / COALESCE(NULLIF(a.fcurrencyrate, 0), 1)
			           END)                                        AS fprice_fc,
			       COALESCE(NULLIF(MAX(a.fcurrencyrate), 0), 1)    AS frate
			  FROM dbo.tblstocktrans a
			 WHERE a.fcoid = p_pstrcoid
			   AND a.fdoctype IN ('PI', 'PR')
			   AND (p_rdgbranch OR a.fbrid = p_strbrid)
			   AND (p_rdgsupplier OR a.fcsaccountid = p_strsupplierid)
			   AND a.fdate >= p_dtpfromdate
			   AND a.fdate <  p_dtptodate + 1
			 GROUP BY a.fyear, a.fbrid, a.fdoctype, a.fdocno
		)
		SELECT d.fbrid,
		       d.fdocno,
		       d.fdoctype,
		       d.fdate,
		       d.fcsaccountid,
		       s.fcsaccountname,
		       -- Amount_FC: the lines in the supplier's currency + the extra costs of the document, MINUS for a PR
		       (d.fprice_fc + COALESCE(x.fexp, 0) / d.frate)
		           * CASE WHEN d.fdoctype = 'PR' THEN -1 ELSE 1 END   AS fnetdocamt_fc,
		       COALESCE(d.fnetdocamt, 0)
		           * CASE WHEN d.fdoctype = 'PR' THEN -1 ELSE 1 END   AS fnetdocamt
		  FROM docs d
		  LEFT JOIN dbo.tblaccountcs s
		    ON s.fcoid = p_pstrcoid
		   AND s.fcsaccountid = d.fcsaccountid
		  -- the extra costs: the finance lines of the document after the first (fslno > 0)
		  LEFT JOIN LATERAL (
				SELECT ABS(SUM(COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0))) AS fexp
				  FROM dbo.tblfintrans t
				 WHERE t.fcoid = p_pstrcoid
				   AND t.fyear::text = d.fyear::text
				   AND t.fbrid = d.fbrid
				   AND t.fdoctype = d.fdoctype
				   AND t.fdocno = d.fdocno
				   AND t.fslno > 0
		       ) x ON TRUE
		 ORDER BY d.fcsaccountid, d.fdate, d.fdocno;
END;
$procedure$;
