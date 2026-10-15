-- =====================================================================
-- dbo.sp_pagebeginningstockpost   (Beginning Stock - Post / Repost)
--
-- Named sp_page<form> like the other screens' procedures. It is the old
-- SP_BGPost (earlier created here as dbo.sp_bgpost - that name is dropped by
-- the DROP just above the CREATE).
--
-- An exact copy of the procedure you pasted - same names, same order, same
-- comments, same post-order lines (all kept as comments, ready to switch on
-- when fpostorder / fpostorderc / dbo.getnextpostorder exist).
--
-- Only three lines had to change to run on OUR tables; each keeps your
-- original line right next to it as a comment:
--   1. fYear of tblStockTrans / tblStockControl is smallint, so the year text
--      is cast:  p_pstryear::smallint   (tblFinTrans.fyear is varchar - as is)
--   2. fIntDocNo does not exist in tblStockTrans -> commented out; the loop
--      is ordered by fSlNo.   (Switch back when the column exists.)
--   3. fPost = 0 / 1 -> false / true  (fpost is boolean)
--
-- Two more changes, both decided with you:
--   4. The stock control row is CREATED here when the item has none (the
--      INSERT block "STOCK CONTROL ROW" below is switched on). tblStockControl
--      is empty today and the loop only UPDATEs it - without the row nothing
--      would be stocked. Put "--" in front of the block to switch it off.
--   5. The quantity variables are numeric(18,3) (pasted: 18,2) because the
--      page and tblStockTrans.fQtyIn have 3 decimals; 18,2 would round a
--      quantity like 1.234 to 1.23 in the stock and in the total cost.
--   6. ADDED: the posting transaction number. When the document is posted, one
--      number is taken from dbo.getnexttransno(company, year, branch, 'P') and
--      written into fpostingtransno of EVERY line of the document (a line that
--      already has one keeps it). Needs alter_tblstocktrans_transno.sql.
--   7. tblStockControl.fYear is now varchar(4) (ALTER TABLE dbo.tblstockcontrol ALTER
--      COLUMN fyear TYPE varchar(4)), so every statement on tblStockControl uses
--      p_pstryear as text; the statements on tblStockTrans (fYear smallint) and on
--      tblFinTrans (fYear text) are unchanged.
--   The post order (fPostOrder / fPostOrderC / getnextpostorder) is NOT used
--   for now: all its lines stay commented, exactly as pasted.
--
-- Test (rolled back):
--   BEGIN;
--   CALL dbo.sp_pagebeginningstockpost('P', '01', '2026', 'JD', 'BG', 'BG', 'ADMIN');
--   SELECT * FROM dbo.tblStockControl;
--   SELECT fslno, fitemid, fqtyin, funitcost, ftotalcost, fpost
--     FROM dbo.tblStockTrans WHERE fbrid = 'JD' AND fdoctype = 'BG' ORDER BY fslno;
--   ROLLBACK;
-- =====================================================================

DROP PROCEDURE IF EXISTS dbo.sp_bgpost(character varying, character varying, character varying, character varying, character varying, character varying, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_pagebeginningstockpost
(
    IN p_strmode varchar(1),
    IN p_pstrcoid varchar(3),
    IN p_pstryear varchar(4),
    IN p_strbrid varchar(3),
    IN p_strdoctype varchar(5),
    IN p_strdocno varchar(15),
    IN p_gstruserid varchar(20) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_intslno smallint;
    v_intdocno integer;
    v_stryear varchar(4);
    v_dtpdate timestamp;

    v_stritemid varchar(40);
    v_numqtyinout numeric(18,3);   -- was numeric(18,2)
    v_numqtyin numeric(18,3);   -- was numeric(18,2)
    v_numqtyout numeric(18,3);   -- was numeric(18,2)
    v_numunitcost numeric(18,4);
    v_numstock numeric(18,3);   -- was numeric(18,2)
    v_numoldunitcost numeric(18,4);
    v_numnewunitcost numeric(18,4);
    v_numcostofstock numeric(18,4) := 0;
    v_intpostorder integer := 0;
    v_strpostingtransno varchar(9);      -- the posting transaction number

    v_row record;
BEGIN
    IF p_strdoctype = 'BG' THEN

        FOR v_row IN
            SELECT
                -- fIntDocNo,
                fDate,
                fSlNo,
                fItemID,
                COALESCE(fQtyIn - fQtyOut, 0) AS qtyinout,
                COALESCE(fQtyIn, 0) AS qtyin,
                COALESCE(fQtyOut, 0) AS qtyout,
                COALESCE(fUnitCost, 0) AS unitcost
            FROM dbo.tblStockTrans
            WHERE fCoID = p_pstrcoid
              AND fYear = p_pstryear::smallint          -- was: fYear = p_pstryear
              AND fBrID = p_strbrid
              AND fDocType = p_strdoctype
              AND fDocNo = p_strdocno
              AND (
                    (p_strmode = 'P' AND fPost = false)  -- was: fPost = 0
                    OR
                    (p_strmode <> 'P' AND fPost = true)  -- was: fPost = 1
                  )
            -- ORDER BY fIntDocNo, fSlNo
            ORDER BY fSlNo
        LOOP
            -- v_intdocno := v_row.fIntDocNo;
            v_dtpdate := v_row.fDate;
            v_intslno := v_row.fSlNo;
            v_stritemid := v_row.fItemID;
            v_numqtyinout := v_row.qtyinout;
            v_numqtyin := v_row.qtyin;
            v_numqtyout := v_row.qtyout;
            v_numunitcost := v_row.unitcost;

            v_numstock := 0;
            v_numoldunitcost := 0;
            v_numnewunitcost := 0;

            -- STOCK CONTROL ROW: create it when the item has none for this
            -- company / year / branch (stock 0, unit cost 0), so the UPDATEs
            -- below have a row to work on
            INSERT INTO dbo.tblStockControl
                (fCoID, fItemID, fYear, fBrID, fPreviousStock, fStock,
                 fPreviousUnitCost, fUnitCost, fCUserID, fCUserDate)
            SELECT p_pstrcoid, v_stritemid, p_pstryear, p_strbrid, 0, 0,
                   0, 0, p_gstruserid, now()
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.tblStockControl
                WHERE fCoID = p_pstrcoid
                  AND fYear = p_pstryear
                  AND fBrID = p_strbrid
                  AND fItemID = v_stritemid
            );

            SELECT
                COALESCE(fStock, 0),
                COALESCE(fUnitCost, 0)
            INTO
                v_numstock,
                v_numoldunitcost
            FROM dbo.tblStockControl
            WHERE fCoID = p_pstrcoid
              AND fYear = p_pstryear          -- was: fYear = p_pstryear
              AND fBrID = p_strbrid
              AND fItemID = v_stritemid;

            -- Save previous stock and unit cost
            UPDATE dbo.tblStockControl
            SET
                fPreviousStock = COALESCE(fStock, 0),
                fPreviousUnitCost = COALESCE(fUnitCost, 0)
            WHERE fCoID = p_pstrcoid
              AND fYear = p_pstryear          -- was: fYear = p_pstryear
              AND fBrID = p_strbrid
              AND fItemID = v_stritemid;

            IF v_numstock < 0 THEN
                v_numstock := 0;
            END IF;

            v_numcostofstock :=
                v_numcostofstock
                + (v_numqtyinout * v_numunitcost);

            -- Calculate weighted average unit cost
            IF v_numqtyinout <> 0 THEN
                IF (v_numstock + v_numqtyinout) = 0 THEN
                    v_numnewunitcost := 0;
                ELSE
                    v_numnewunitcost :=
                        (
                            (v_numstock * v_numoldunitcost)
                            + (v_numqtyinout * v_numunitcost)
                        )
                        / (v_numstock + v_numqtyinout);
                END IF;
            END IF;

            -- Update transaction unit cost and total cost
            UPDATE dbo.tblStockTrans
            SET
                fUnitCost = v_numnewunitcost,
                fTotalCost = v_numqtyin * v_numnewunitcost
            WHERE fCoID = p_pstrcoid
              AND fYear = p_pstryear::smallint          -- was: fYear = p_pstryear
              AND fBrID = p_strbrid
              AND fDocType = p_strdoctype
              AND fDocNo = p_strdocno
              AND fSlNo = v_intslno;

            -- Update current stock and unit cost
            UPDATE dbo.tblStockControl
            SET
                fUnitCost = v_numnewunitcost,
                fStock = COALESCE(fStock, 0) + v_numqtyinout
            WHERE fCoID = p_pstrcoid
              AND fYear = p_pstryear          -- was: fYear = p_pstryear
              AND fBrID = p_strbrid
              AND fItemID = v_stritemid;

        END LOOP;

        -- Posting
        IF p_strmode = 'P' THEN

            -- SELECT COALESCE(MAX(fPostOrder), 0)
            -- INTO v_intpostorder
            -- FROM dbo.tblStockTrans
            -- WHERE fCoID = p_pstrcoid
            --   AND fYear = p_pstryear::smallint
            --   AND fBrID = p_strbrid
            --   AND fDocType = p_strdoctype
            --   AND fDocNo = p_strdocno;

            -- IF COALESCE(v_intpostorder, 0) = 0 THEN
            --     v_intpostorder :=
            --         dbo.getnextpostorder(p_pstrcoid);
            -- END IF;

            -- the posting transaction number: one for the whole document
            v_strpostingtransno :=
                dbo.getnexttransno(p_pstrcoid, p_pstryear, p_strbrid, 'P');

            UPDATE dbo.tblStockTrans
            SET
                fPost = true,                            -- was: fPost = 1
                fPostingTransNo = COALESCE(fPostingTransNo, v_strpostingtransno)
                -- fPostOrder = v_intpostorder,
                -- fPostOrderC = v_intpostorder
                -- (when switching these on, put a comma after the line above)
            WHERE fCoID = p_pstrcoid
              AND fYear = p_pstryear::smallint          -- was: fYear = p_pstryear
              AND fBrID = p_strbrid
              AND fDocType = p_strdoctype
              AND fDocNo = p_strdocno;

            UPDATE dbo.tblFinTrans
            SET
                fPost = true                             -- was: fPost = 1
                -- fPostOrder = v_intpostorder
                -- (when switching this on, put a comma after "fPost = true")
            WHERE fCoID = p_pstrcoid
              AND fYear = p_pstryear
              AND fBrID = p_strbrid
              AND fDocType = p_strdoctype
              AND fDocNo = p_strdocno;

        ELSE
            -- Reposting
            -- SELECT fPostOrder
            -- INTO v_intpostorder
            -- FROM dbo.tblStockTrans
            -- WHERE fCoID = p_pstrcoid
            --   AND fYear = p_pstryear::smallint
            --   AND fBrID = p_strbrid
            --   AND fDocType = p_strdoctype
            --   AND fDocNo = p_strdocno
            -- LIMIT 1;

            UPDATE dbo.tblFinTrans
            SET
                fPost = true                             -- was: fPost = 1
                -- fPostOrder = v_intpostorder
                -- (when switching this on, put a comma after "fPost = true")
            WHERE fCoID = p_pstrcoid
              AND fYear = p_pstryear
              AND fBrID = p_strbrid
              AND fDocType = p_strdoctype
              AND fDocNo = p_strdocno;

        END IF;

    END IF;
END;
$$;
