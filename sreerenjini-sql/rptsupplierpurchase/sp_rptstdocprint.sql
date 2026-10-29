-- dbo.sp_rptstdocprint - the DETAILED Supplier Purchase: every line of every Purchase Invoice (PI) or Purchase
-- Return (PR) of the period (port of the SQL Server SP_rptStDocPrint, used by the old reports rptPIprint and
-- rptPRprint). Run it yourself; it only creates a procedure.
--
-- WHAT IT SHOWS: the documents printed one after the other, each with its header (branch, entry no., date,
-- supplier, P.O. No., currency ...) and its item lines. The backend groups the lines by document and adds the
-- Total of every document.
--
-- The old procedure was a general one ("Select a.* ... Where <a filter text>") that printed the documents of
-- many types (PI, PR, SIC, SIR, ST, ADJ ...). This one takes only 'PI' and 'PR' (the Supplier Purchase report);
-- the other types can be added when their reports are made. The filter text is replaced by parameters.
--
-- It reads dbo.tblstocktrans (the lines), dbo.tblitemhd (the item name and unit), dbo.tblbranch (the branch name)
-- and dbo.tblaccountcs (the supplier name). The answer is one query, returned through a refcursor.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptstdocprint('PI', '01', true, NULL, true, NULL, '2026-10-01', '2026-10-31', 'cur_rptstdocprint');
--   FETCH ALL FROM "cur_rptstdocprint";
--   COMMIT;
--
-- Parameters (the old @name -> p_name, lower case; @strFilter is replaced by the last six):
--   @strDoc        -> p_strdoc         'PI' Purchase Invoice, 'PR' Purchase Return
--   (new)          -> p_pstrcoid       the logged-in company
--   (new)          -> p_rdgbranch      false (0) One Branch, true (1) All Branch
--   (new)          -> p_strbrid        the branch, used when p_rdgbranch is false
--   (new)          -> p_rdgsupplier    false (0) One Supplier, true (1) All Supplier
--   (new)          -> p_strsupplierid  the supplier, used when p_rdgsupplier is false
--   (new)          -> p_dtpfromdate    DATE, the whole of that day counts
--   (new)          -> p_dtptodate      DATE, the whole of that day counts
--
-- Result columns, one row per document line:
--   header (the same on every line of a document):
--     fbrid, fbrname, fdocno, fdate, fcsaccountid, fcsaccountname, fpino, fprsrorigdocno, fpono,
--     fcurrency, fcurrencyrate, fdocamt, fnetdocamt, fdiscamt, fsup_discamt, fnote
--   * fdocamt is the Sup. Amount typed on the Purchase Invoice screen (the "Supplier Amt." of the old header);
--     fnetdocamt is the total cost of all the lines;
--   line:
--     fslno, fitemid, fitemname, funit, fqty, fsup_unitprice, fsup_totalprice, funitprice, funitcost, ftotalcost
--   * fqty is the Qty In of a PI and the Qty Out of a PR (the old reports show fQtyIn / fQtyOut);
--   * fpino is the supplier's invoice number ("P. Invoice No." of a PI); fprsrorigdocno is the original entry of a
--     return ("P. Entry No." of a PR) - the backend prints the one that belongs to the document type;
--   * fsup_* are the supplier-currency amounts (the old _FC columns). The Purchase Invoice screen does not save
--     them any more (a document saved now has 0 there), so a value of 0 is replaced by the normal amount divided
--     by the currency rate of the document - the same thing, as the foreign amount x the rate = our amount;
--   * the rows come ordered by branch, document no. (as a number), then line no.
--
-- Differences from the SQL Server procedure - all forced by our tables, or for safety:
--   * the supplier is tblstocktrans.fcsaccountid and its name comes from tblaccountcs (the old tblAccount);
--   * there is no fIntDocNo, the documents are ordered by the number at the end of the document no.;
--   * the filter is made of parameters, no dynamic SQL.

CREATE OR REPLACE PROCEDURE dbo.sp_rptstdocprint(
	IN p_strdoc character varying,          -- 'PI' = Purchase Invoice, 'PR' = Purchase Return
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
	IF p_strdoc NOT IN ('PI', 'PR') THEN
		RAISE EXCEPTION 'sp_rptstdocprint: the document type % is not supported (PI and PR only)', p_strdoc;
	END IF;

	OPEN p_result_cursor FOR
		SELECT a.fbrid,
		       b.fbrname,
		       a.fdocno,
		       a.fdate::date                                       AS fdate,
		       a.fcsaccountid,
		       s.fcsaccountname,
		       a.fpino,
		       a.fprsrorigdocno,
		       a.fpono,
		       a.fcurrency,
		       a.fcurrencyrate,
		       a.fdocamt,
		       a.fnetdocamt,
		       a.fdiscamt,
		       CASE WHEN COALESCE(a.fsup_discamt, 0) <> 0 THEN a.fsup_discamt
		            ELSE COALESCE(a.fdiscamt, 0) / COALESCE(NULLIF(a.fcurrencyrate, 0), 1) END AS fsup_discamt,
		       a.fnote,
		       a.fslno,
		       a.fitemid,
		       COALESCE(h.fitemname, a.fitemname)                  AS fitemname,
		       COALESCE(h.funit, a.funit)                          AS funit,
		       CASE WHEN p_strdoc = 'PI' THEN COALESCE(a.fqtyin, 0) ELSE COALESCE(a.fqtyout, 0) END AS fqty,
		       CASE WHEN COALESCE(a.fsup_unitprice, 0) <> 0 THEN a.fsup_unitprice
		            ELSE COALESCE(a.funitprice, 0) / COALESCE(NULLIF(a.fcurrencyrate, 0), 1) END AS fsup_unitprice,
		       CASE WHEN COALESCE(a.fsup_totalprice, 0) <> 0 THEN a.fsup_totalprice
		            ELSE COALESCE(a.ftotalprice, 0) / COALESCE(NULLIF(a.fcurrencyrate, 0), 1) END AS fsup_totalprice,
		       a.funitprice,
		       a.funitcost,
		       a.ftotalcost
		  FROM dbo.tblstocktrans a
		  LEFT JOIN dbo.tblitemhd h
		    ON h.fcoid = a.fcoid AND h.fitemid = a.fitemid
		  LEFT JOIN dbo.tblbranch b
		    ON b.fcoid = a.fcoid AND b.fbrid = a.fbrid
		  LEFT JOIN dbo.tblaccountcs s
		    ON s.fcoid = a.fcoid AND s.fcsaccountid = a.fcsaccountid
		 WHERE a.fcoid = p_pstrcoid
		   AND a.fdoctype = p_strdoc
		   AND (p_rdgbranch OR a.fbrid = p_strbrid)
		   AND (p_rdgsupplier OR a.fcsaccountid = p_strsupplierid)
		   AND a.fdate >= p_dtpfromdate
		   AND a.fdate <  p_dtptodate + 1
		 ORDER BY a.fbrid,
		          NULLIF(substring(a.fdocno from '(\d+)$'), '')::bigint,
		          a.fdocno,
		          a.fslno;
END;
$procedure$;
