-- dbo.sp_rptstockageing - the Stock Ageing report (port of the SQL Server SP_rptStockAgeing).
-- Run it yourself (run fn_getunitcost.sql first); it only creates a procedure.
--
-- WHAT IT SHOWS: how OLD the stock on hand is. For every item: the balance as on the date, and how much of it
-- came in during the last 30 days, 31-60, 61-90, 91-180 and older (the columns of dbo.tblageingperiod, module
-- 'STK'; Days or Month). It takes the oldest stock to be sold first (FIFO): the total Qty Out is taken off the
-- OLDEST column first, then the next one ..., so what is left in each column is the stock still there.
--     e.g. in: 10 old + 20 middle + 30 new = 60, out: 35, balance 25
--          the 35 out take the 10 old, the 20 middle and 5 of the new  ->  the 25 on hand are all NEW.
--
-- It reads dbo.tblstocktrans (movements), dbo.tblageingperiod (column sizes), dbo.tblitemhd, dbo.tblitemgroup
-- and (through dbo.getunitcost) dbo.tblstockcontrol. No temporary tables, no cursor, no text glued into SQL:
-- the answer is one query, returned through a refcursor.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptstockageing('01', '2026', NULL, true, 2, NULL, NULL, NULL, '2026-10-28', 'Days', 0, false, 'cur_rptstockageing');
--   FETCH ALL FROM "cur_rptstockageing";
--   COMMIT;
--
-- Parameters (the old @name -> p_name, lower case; the dates are DATE now, the old ones were dd/mm/yyyy text):
--   @gstrCoID      -> p_pstrcoid        the logged-in company
--   @rdgBranch     -> p_rdgbranch       false (0) One Branch, true (1) All Branch
--   @strBrID       -> p_strbrid         the branch, used when p_rdgbranch is false
--   @rdgItem       -> p_rdgitem         0 One Item, 1 Item Range, 2 All Item
--   @strItemID     -> p_stritemid       used when p_rdgitem = 0
--   @strFromItemID -> p_strfromitemid   used when p_rdgitem = 1: the first item (first <= item <= last)
--   @strToItemID   -> p_strtoitemid     used when p_rdgitem = 1: the last item
--   @strAsOnDate   -> p_dtpasondate     DATE, the whole of that day counts
--   @strAgeingMode -> p_strageingmode   'Days' or 'Month' (how it is kept in tblageingperiod)
--   @cboPostStatus -> p_lkppoststatus   0 All, 1 Posted, 2 Non Posted  (the codes of the other stock reports;
--                                       the old @cboPostStatus was 0 Non Posted, 1 Posted, 2 All)
--   @blnPrint0Bal  -> p_blnprint0bal    true = leave out the items whose balance is 0 (as the old: 1 deleted them)
--   (new)          -> p_pstryear        the login year: which tblstockcontrol row gives the Unit Cost
--
-- Result columns: fitemid, fbal, fstockvalueqty, funitcost, fbaldr1, fbaldr2, fbaldr3, fbaldr4, fbaldr5,
--                 fitemname, funit, fitemgroupid, fitemgroupname
--   * fbal = Qty In - Qty Out up to the date; fbaldr1 is the newest column, fbaldr5 the oldest;
--   * a normal item: the columns add up to its balance. An item with a NEGATIVE balance (more went out than
--     came in) is cut the other way round (its Qty In is taken off its Qty Out) and its columns are negative;
--   * AS THE OLD PROCEDURE the stock of an item is added up over ALL the branches asked for, one row per item;
--     the Unit Cost is that of ONE branch (the old MIN(branch id)) - to be confirmed with the tech lead.
--   * the rows come ordered by item.
--
-- Differences from the SQL Server procedure:
--   * the filters are parameters, not text glued together (no dynamic SQL), no temporary tables, no cursor
--     (the FIFO cut is plain arithmetic: greatest(column - what is still to be taken off, 0));
--   * the quantities are not rounded to 2 decimals;
--   * the old dbo.GetUnitCost(co, branch, item) is called with the year too (it is part of tblstockcontrol's key);
--   * the old fStockValue (calculated, never returned) is left out.

CREATE OR REPLACE PROCEDURE dbo.sp_rptstockageing(
	IN p_pstrcoid character varying,        -- the logged-in company
        IN p_pstryear character varying,        -- the login year (picks the tblstockcontrol row of the Unit Cost)
	IN p_strbrid character varying,         -- the branch, used when p_rdgbranch is false
	IN p_rdgbranch boolean,                 -- false (0) = One Branch, true (1) = All Branch
	
	IN p_rdgitem integer,                   -- 0 = One Item, 1 = Item Range, 2 = All Item
	IN p_stritemid character varying,       -- the item, used when p_rdgitem = 0
	IN p_strfromitemid character varying,   -- the first item of the range, used when p_rdgitem = 1
	IN p_strtoitemid character varying,     -- the last item of the range, used when p_rdgitem = 1
	IN p_dtpasondate date,                  -- as on this date (the whole day counts)
	IN p_strageingmode character varying,   -- 'Days' or 'Month'
	IN p_lkppoststatus integer,             -- 0 = All, 1 = Posted, 2 = Non Posted
	IN p_blnprint0bal boolean,              -- true = leave out the items whose balance is 0
	
	INOUT p_result_cursor refcursor
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
	v_days  boolean := (p_strageingmode = 'Days');
	v_found integer;
	-- the size of the columns 1-4: days mode = "To" (days back from the date), month mode = To - From (months)
	v_s1 integer; v_s2 integer; v_s3 integer; v_s4 integer;
	-- the window of every column: from .. to (the 5th and oldest has only a "to")
	v_f1 date; v_e1 date;
	v_f2 date; v_e2 date;
	v_f3 date; v_e3 date;
	v_f4 date; v_e4 date;
	v_e5 date;
BEGIN
	SELECT COUNT(*),
	       MAX(CASE WHEN frptcolumnid = 1 THEN CASE WHEN v_days THEN fto ELSE fto - ffrom END END),
	       MAX(CASE WHEN frptcolumnid = 2 THEN CASE WHEN v_days THEN fto ELSE fto - ffrom END END),
	       MAX(CASE WHEN frptcolumnid = 3 THEN CASE WHEN v_days THEN fto ELSE fto - ffrom END END),
	       MAX(CASE WHEN frptcolumnid = 4 THEN CASE WHEN v_days THEN fto ELSE fto - ffrom END END)
	  INTO v_found, v_s1, v_s2, v_s3, v_s4
	  FROM dbo.tblageingperiod
	 WHERE fcoid = p_pstrcoid
	   AND fmoduleid = 'STK'
	   AND fageingmode = p_strageingmode
	   AND frptcolumnid BETWEEN 1 AND 4;

	IF v_found < 4 THEN
		RAISE EXCEPTION 'The ageing periods are not set for this company';
	END IF;

	IF v_days THEN
		-- column 1: (date - To) .. date; every next column ends the day before the previous one starts
		v_e1 := p_dtpasondate; v_f1 := p_dtpasondate - v_s1;
		v_e2 := v_f1 - 1;      v_f2 := p_dtpasondate - v_s2;
		v_e3 := v_f2 - 1;      v_f3 := p_dtpasondate - v_s3;
		v_e4 := v_f3 - 1;      v_f4 := p_dtpasondate - v_s4;
		v_e5 := v_f4 - 1;
	ELSE
		-- whole calendar months: a column of 3 months is the month of the date and the 2 before it
		v_e1 := p_dtpasondate; v_f1 := date_trunc('month', v_e1 - make_interval(months => v_s1 - 1))::date;
		v_e2 := v_f1 - 1;      v_f2 := date_trunc('month', v_e2 - make_interval(months => v_s2 - 1))::date;
		v_e3 := v_f2 - 1;      v_f3 := date_trunc('month', v_e3 - make_interval(months => v_s3 - 1))::date;
		v_e4 := v_f3 - 1;      v_f4 := date_trunc('month', v_e4 - make_interval(months => v_s4 - 1))::date;
		v_e5 := v_f4 - 1;
	END IF;

	OPEN p_result_cursor FOR
		WITH base AS (
			SELECT a.fbrid,
			       a.fitemid,
			       a.fdate::date                AS fdt,
			       COALESCE(a.fqtyin, 0)        AS qin,
			       COALESCE(a.fqtyout, 0)       AS qout
			  FROM dbo.tblstocktrans a
			 WHERE a.fcoid = p_pstrcoid
			   AND (p_rdgbranch OR a.fbrid = p_strbrid)
			   AND (   p_rdgitem NOT IN (0, 1)
			        OR (p_rdgitem = 0 AND a.fitemid = p_stritemid)
			        OR (p_rdgitem = 1 AND a.fitemid >= p_strfromitemid AND a.fitemid <= p_strtoitemid))
			   AND (p_lkppoststatus = 0 OR a.fpost = (p_lkppoststatus = 1))
			   AND a.fdate < p_dtpasondate + 1
		),
		-- one row per item: the balance, the totals and the Qty In / Qty Out of every column
		items AS (
			SELECT fitemid,
			       MIN(fbrid)                                                      AS fbrid,
			       SUM(qin - qout)                                                 AS fbal,
			       SUM(qin)                                                        AS totin,
			       SUM(qout)                                                       AS totout,
			       COALESCE(SUM(qin)  FILTER (WHERE fdt BETWEEN v_f1 AND v_e1), 0) AS in1,
			       COALESCE(SUM(qin)  FILTER (WHERE fdt BETWEEN v_f2 AND v_e2), 0) AS in2,
			       COALESCE(SUM(qin)  FILTER (WHERE fdt BETWEEN v_f3 AND v_e3), 0) AS in3,
			       COALESCE(SUM(qin)  FILTER (WHERE fdt BETWEEN v_f4 AND v_e4), 0) AS in4,
			       COALESCE(SUM(qin)  FILTER (WHERE fdt <= v_e5), 0)               AS in5,
			       COALESCE(SUM(qout) FILTER (WHERE fdt BETWEEN v_f1 AND v_e1), 0) AS out1,
			       COALESCE(SUM(qout) FILTER (WHERE fdt BETWEEN v_f2 AND v_e2), 0) AS out2,
			       COALESCE(SUM(qout) FILTER (WHERE fdt BETWEEN v_f3 AND v_e3), 0) AS out3,
			       COALESCE(SUM(qout) FILTER (WHERE fdt BETWEEN v_f4 AND v_e4), 0) AS out4,
			       COALESCE(SUM(qout) FILTER (WHERE fdt <= v_e5), 0)               AS out5
			  FROM base
			 GROUP BY fitemid
		),
		-- d1..d5 = what came in in each column, c = what has to be taken off (a negative balance is the other way
		-- round: its Qty Out are the "stock" and its Qty In are taken off)
		d AS (
			SELECT i.fitemid, i.fbrid, i.fbal,
			       CASE WHEN i.fbal < 0 THEN i.out1 ELSE i.in1 END AS d1,
			       CASE WHEN i.fbal < 0 THEN i.out2 ELSE i.in2 END AS d2,
			       CASE WHEN i.fbal < 0 THEN i.out3 ELSE i.in3 END AS d3,
			       CASE WHEN i.fbal < 0 THEN i.out4 ELSE i.in4 END AS d4,
			       CASE WHEN i.fbal < 0 THEN i.out5 ELSE i.in5 END AS d5,
			       CASE WHEN i.fbal < 0 THEN i.totin ELSE i.totout END AS c
			  FROM items i
		)
		SELECT d.fitemid,
		       d.fbal,
		       d.fbal                                                        AS fstockvalueqty,
		       dbo.getunitcost(p_pstrcoid, p_pstryear, d.fbrid, d.fitemid)   AS funitcost,
		       CASE WHEN d.fbal >= 0 THEN s1.r1 ELSE -s1.r1 END              AS fbaldr1,
		       CASE WHEN d.fbal >= 0 THEN s2.r2 ELSE -s2.r2 END              AS fbaldr2,
		       CASE WHEN d.fbal >= 0 THEN s3.r3 ELSE -s3.r3 END              AS fbaldr3,
		       CASE WHEN d.fbal >= 0 THEN s4.r4 ELSE -s4.r4 END              AS fbaldr4,
		       CASE WHEN d.fbal >= 0 THEN s5.r5 ELSE -s5.r5 END              AS fbaldr5,
		       h.fitemname,
		       h.funit,
		       h.fitemgroupid,
		       g.fitemgroupname
		  FROM d
		  -- the FIFO cut: take c off the oldest column (5) first; what is left to take off goes on to the next
		 CROSS JOIN LATERAL (SELECT GREATEST(d.d5 - d.c, 0)    AS r5, GREATEST(d.c - d.d5, 0)    AS c5) s5
		 CROSS JOIN LATERAL (SELECT GREATEST(d.d4 - s5.c5, 0)  AS r4, GREATEST(s5.c5 - d.d4, 0)  AS c4) s4
		 CROSS JOIN LATERAL (SELECT GREATEST(d.d3 - s4.c4, 0)  AS r3, GREATEST(s4.c4 - d.d3, 0)  AS c3) s3
		 CROSS JOIN LATERAL (SELECT GREATEST(d.d2 - s3.c3, 0)  AS r2, GREATEST(s3.c3 - d.d2, 0)  AS c2) s2
		 CROSS JOIN LATERAL (SELECT GREATEST(d.d1 - s2.c2, 0)  AS r1, GREATEST(s2.c2 - d.d1, 0)  AS c1) s1
		  LEFT JOIN dbo.tblitemhd h
		    ON h.fcoid = p_pstrcoid AND h.fitemid = d.fitemid
		  LEFT JOIN dbo.tblitemgroup g
		    ON g.fcoid = p_pstrcoid AND g.fitemgroupid = h.fitemgroupid
		 WHERE NOT (p_blnprint0bal AND d.fbal = 0)
		 ORDER BY d.fitemid;
END;
$procedure$;
