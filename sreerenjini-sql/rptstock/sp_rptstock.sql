-- dbo.sp_rptstock - the Stock report (port of the SQL Server SP_rptStock, used by the old
-- rptStockDetRpt and rptStockSumRpt reports). Run it yourself; it only creates a procedure.
--
-- It reads dbo.tblstocktrans (the stock movements) and dbo.tblitemhd (item name, unit, group).
-- It makes no temporary tables: the answer is one query, returned through a refcursor.
--
-- Call (CALL and FETCH in one transaction):
--   BEGIN;
--   CALL dbo.sp_rptstock('D', 0, '01', true, NULL, true, NULL, 2, NULL, NULL, NULL, '2026-10-01', '2026-10-31', false, 'cur_rptstock');
--   FETCH ALL FROM "cur_rptstock";
--   COMMIT;
--
-- Parameters: the SAME ones, in the SAME order, with the SAME meaning as the SQL Server
-- SP_rptStock (@name -> p_name, lower case). @rdgBranch, @rdgByItem and @blnOrderBy were bit there;
-- they are boolean here (0 = false, 1 = true).
--   @strDetOrSum    -> p_strdetorsum     'D' detailed, 'S' summary
--   @lkpPostStatus  -> p_lkppoststatus   0 all, 1 posted, 2 non posted
--   @pstrCoID       -> p_pstrcoid
--   @rdgBranch      -> p_rdgbranch       false (0) one branch, true (1) all branches
--   @strBrID        -> p_strbrid         the branch, used when p_rdgbranch is false
--   @rdgByItem      -> p_rdgbyitem       false (0) by item group, true (1) by item
--   @strItemGroupID -> p_stritemgroupid  the item group, used when p_rdgbyitem is false
--                                        (NULL = every group: the screen has "All Item Group")
--   @rdgItem        -> p_rdgitem         0 one item, 1 item range, 2 all items
--                                        (a report by item group is sent with 2)
--   @strItemID      -> p_stritemid       used when p_rdgitem = 0
--   @strFromItemID  -> p_strfromitemid   used when p_rdgitem = 1: the first item of the range
--   @strToItemID    -> p_strtoitemid     used when p_rdgitem = 1: the last item of the range
--                                        (from the first to the last, both included, in the
--                                        order of the Item ID)
--   @strFromDate    -> p_strfromdate     DATE (the old one was dd/mm/yyyy text)
--   @strToDate      -> p_strtodate       DATE, the whole of that day counts
--   @blnOrderBy     -> p_blnorderby      detailed only: order by Txn. No. instead of by date
--
-- Detailed result columns: fitemid, fitemname, fdate, fdoctype, fdocno, ftxnno, funitcost,
--   fqtyin, fqtyout. The first row of every item is its opening stock: fdoctype 'OP', no date,
--   no document - the net of everything dated BEFORE the from date, shown as a Qty. In when it
--   is positive and as a Qty. Out when it is negative. The running balance is made by the
--   backend, in the order the rows come.
-- Summary result columns: fitemid, fitemname, funit, fqtyop, fqtyin, fqtyout, fqtycl.
--
-- Differences from the SQL Server procedure - all forced by our table, or for safety:
--   * Txn. No. is fpostingno (the posting number of the document, set when it is posted;
--     empty for a document not posted yet and for the old data). It is text, so it is read as a
--     number to be sorted. The old fPostOrder / fIntDocNo columns do not exist here: the order
--     inside a day is document no. then line no.
--   * the filters are parameters, not text glued together (no dynamic SQL).
--   * the old temporary tables held quantities as Numeric(18,0), which rounded them to whole
--     numbers; this procedure keeps the real quantity (the backend decides how to show it).
--   * the old IsItem filter was commented out in the original, so it is not applied here either.
--   * the item range of the original had its comparisons wrong (the opening used the item GROUP,
--     the transactions had <= and >= the wrong way round); here it is simply first <= item <= last.

-- The earlier versions of this procedure had other argument lists; they are removed so only
-- this one is left (nothing happens if they are not there).
DROP PROCEDURE IF EXISTS dbo.sp_rptstock(character varying, integer, character varying, boolean, character varying, integer, character varying, character varying, date, date, boolean, refcursor);
DROP PROCEDURE IF EXISTS dbo.sp_rptstock(character varying, integer, character varying, boolean, character varying, integer, character varying, character varying, character varying, character varying, date, date, boolean, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptstock(
	IN p_strdetorsum character varying,
	IN p_lkppoststatus integer,
	IN p_pstrcoid character varying,
	IN p_rdgbranch boolean,
	IN p_strbrid character varying,
	IN p_rdgbyitem boolean,
	IN p_stritemgroupid character varying,
	IN p_rdgitem integer,
	IN p_stritemid character varying,
	IN p_strfromitemid character varying,
	IN p_strtoitemid character varying,
	IN p_strfromdate date,
	IN p_strtodate date,
	IN p_blnorderby boolean,
	IN p_result_cursor refcursor DEFAULT 'cur_rptstock'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_to_excl date := p_strtodate + 1;   -- the whole of the to date counts
BEGIN

    /* =====================================================
       D - DETAILED: opening row + every movement of the period
    ===================================================== */

    IF p_strdetorsum = 'D' THEN

        OPEN p_result_cursor FOR
            WITH base AS (
                SELECT a.fitemid,
                       a.fdate,
                       a.fdoctype,
                       a.fdocno,
                       a.fslno,
                       NULLIF(a.fpostingno, '')::bigint AS ftxnno,
                       a.funitcost,
                       COALESCE(a.fqtyin, 0)  AS fqtyin,
                       COALESCE(a.fqtyout, 0) AS fqtyout
                  FROM dbo.tblstocktrans a
                  LEFT JOIN dbo.tblitemhd b
                    ON b.fcoid = a.fcoid AND b.fitemid = a.fitemid
                 WHERE a.fcoid = p_pstrcoid
                   AND (p_rdgbranch OR a.fbrid = p_strbrid)
                   AND (p_rdgbyitem OR p_stritemgroupid IS NULL OR b.fitemgroupid = p_stritemgroupid)
                   AND (p_rdgitem <> 0 OR a.fitemid = p_stritemid)
                   AND (p_rdgitem <> 1 OR a.fitemid BETWEEN p_strfromitemid AND p_strtoitemid)
                   -- p_lkppoststatus = 0 All, 1 Posted (fpost = true), 2 Non Posted (fpost = false)
                   AND (p_lkppoststatus = 0 OR a.fpost = (p_lkppoststatus = 1))
            ),
            lines AS (
                -- opening stock: the net of everything before the from date
                SELECT fitemid,
                       NULL::timestamp        AS fdate,
                       'OP'::varchar          AS fdoctype,
                       NULL::varchar          AS fdocno,
                       0::smallint            AS fslno,
                       NULL::bigint           AS ftxnno,
                       NULL::numeric          AS funitcost,
                       GREATEST(SUM(fqtyin - fqtyout), 0)  AS fqtyin,
                       GREATEST(-SUM(fqtyin - fqtyout), 0) AS fqtyout,
                       0                      AS srt
                  FROM base
                 WHERE fdate < p_strfromdate
                 GROUP BY fitemid

                UNION ALL

                -- the movements of the period
                SELECT fitemid, fdate, fdoctype, fdocno, fslno, ftxnno, funitcost,
                       fqtyin, fqtyout, 1
                  FROM base
                 WHERE fdate >= p_strfromdate
                   AND fdate <  v_to_excl
            )
            SELECT l.fitemid,
                   h.fitemname,
                   l.fdate,
                   l.fdoctype,
                   l.fdocno,
                   l.ftxnno,
                   l.funitcost,
                   l.fqtyin,
                   l.fqtyout
              FROM lines l
              LEFT JOIN dbo.tblitemhd h
                ON h.fcoid = p_pstrcoid AND h.fitemid = l.fitemid
             ORDER BY l.fitemid,
                      l.srt,
                      CASE WHEN p_blnorderby THEN l.ftxnno END NULLS FIRST,
                      l.fdate,
                      l.fdocno,
                      l.fslno;

    /* =====================================================
       S - SUMMARY: one row per item
    ===================================================== */

    ELSIF p_strdetorsum = 'S' THEN

        OPEN p_result_cursor FOR
            WITH base AS (
                SELECT a.fitemid,
                       a.fdate,
                       COALESCE(a.fqtyin, 0)  AS fqtyin,
                       COALESCE(a.fqtyout, 0) AS fqtyout
                  FROM dbo.tblstocktrans a
                  LEFT JOIN dbo.tblitemhd b
                    ON b.fcoid = a.fcoid AND b.fitemid = a.fitemid
                 WHERE a.fcoid = p_pstrcoid
                   AND (p_rdgbranch OR a.fbrid = p_strbrid)
                   AND (p_rdgbyitem OR p_stritemgroupid IS NULL OR b.fitemgroupid = p_stritemgroupid)
                   AND (p_rdgitem <> 0 OR a.fitemid = p_stritemid)
                   AND (p_rdgitem <> 1 OR a.fitemid BETWEEN p_strfromitemid AND p_strtoitemid)
                   -- p_lkppoststatus = 0 All, 1 Posted (fpost = true), 2 Non Posted (fpost = false)
                   AND (p_lkppoststatus = 0 OR a.fpost = (p_lkppoststatus = 1))
                   AND a.fdate < v_to_excl
            ),
            sums AS (
                SELECT fitemid,
                       SUM(CASE WHEN fdate < p_strfromdate THEN fqtyin - fqtyout ELSE 0 END) AS fqtyop,
                       SUM(CASE WHEN fdate >= p_strfromdate THEN fqtyin  ELSE 0 END)         AS fqtyin,
                       SUM(CASE WHEN fdate >= p_strfromdate THEN fqtyout ELSE 0 END)         AS fqtyout
                  FROM base
                 GROUP BY fitemid
            )
            SELECT s.fitemid,
                   h.fitemname,
                   h.funit,
                   s.fqtyop,
                   s.fqtyin,
                   s.fqtyout,
                   s.fqtyop + s.fqtyin - s.fqtyout AS fqtycl
              FROM sums s
              LEFT JOIN dbo.tblitemhd h
                ON h.fcoid = p_pstrcoid AND h.fitemid = s.fitemid
             ORDER BY s.fitemid;

    ELSE

        RAISE EXCEPTION 'sp_rptstock: p_strdetorsum must be D or S (got %)', p_strdetorsum;

    END IF;

END;
$BODY$;

ALTER PROCEDURE dbo.sp_rptstock(character varying, integer, character varying, boolean, character varying, boolean, character varying, integer, character varying, character varying, character varying, date, date, boolean, refcursor)
    OWNER TO postgres;
