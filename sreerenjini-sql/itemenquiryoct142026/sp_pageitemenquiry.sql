-- =====================================================================
-- dbo.sp_pageitemenquiry   (Item Enquiry)
--
-- Port of the old SP_frmItemDetail. A view-only screen: nothing is changed.
--
-- Modes (p_strmode)
--   G    the items (Item ID | Item Name), for the two Item boxes
--   GHD  the item's details: unit, packing, CBM, item group, supplier,
--        supplier item ID, reorder level and quantity
--   GTL  one row per branch that has the item: stock, previous unit cost,
--        unit price, unit cost, total cost (= stock x unit cost)
--   -- GTLC (commented out below) the old stock-by-branch sum of the stock
--   --      transactions; the form never used it
--
-- Differences from the old procedure (each is kept as a comment):
--   1. GTL: the old procedure read fStock, fUnitCost and fPrevUnitCost from
--      tblItemTL. Here the stock lives in tblstockcontrol (the table Post
--      fills), so GTL joins it for the login year (p_pstryear). A branch that
--      has the item but no stock row shows 0.
--   2. GTL: tblitemtl has ONE price (funitprice) instead of Retail, Wholesale
--      and Special price, so one Unit Price column is returned.
--   3. GHD: the old one was "select *"; the item group name and the supplier
--      name are joined here instead of being looked up by the form.
--      fAvoidFixedExp does not exist in tblitemhd -> not returned.
--      The supplier name comes from dbo.tblaccountcs (the customer / supplier
--      accounts, fcs = 'S' for a supplier) - the same table dbo.fillsupplier reads
--      for the Supplier box of the Item page - NOT from dbo.tblaccount.
--
-- Test:
--   BEGIN;
--   CALL dbo.sp_pageitemenquiry('GTL', '01', '2026', 'light', p_result_cursor => 'c1');
--   FETCH ALL IN c1;
--   COMMIT;
-- =====================================================================

-- The year is now TEXT (p_pstryear, like tblstockcontrol.fyear which is varchar(4)).
-- It was a smallint (p_pintyear); the DROP below removes that version.
DROP PROCEDURE IF EXISTS dbo.sp_pageitemenquiry(character varying, character varying, smallint, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageitemenquiry(
    IN    p_strmode          character varying,
    IN    p_pstrcoid         character varying,
    IN    p_pstryear         character varying DEFAULT NULL::character varying,
    IN    p_stritemid        character varying DEFAULT NULL::character varying,
    INOUT p_result_cursor    refcursor         DEFAULT 'cur_pageitemenquiry'::refcursor)
LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                a.fitemid,
                a.fitemname
            FROM dbo.tblitemhd a
            WHERE a.fcoid = p_pstrcoid
            ORDER BY a.fitemid;

    ELSIF p_strmode = 'GHD' THEN

        OPEN p_result_cursor FOR
            SELECT
                a.fitemid,
                a.fitemname,
                a.funit,
                a.fpacking,
                a.fcbm,
                a.fitemgroupid,
                g.fitemgroupname,
                a.fsupplierid,
                s.fcsaccountname    AS fsuppliername,
                a.fsupplieritemid,
                a.freorderlevel,
                a.freorderqty
                -- a.fAvoidFixedExp        (the column does not exist in tblitemhd)
            FROM dbo.tblitemhd a
            LEFT OUTER JOIN dbo.tblitemgroup g
                   ON g.fcoid = a.fcoid AND g.fitemgroupid = a.fitemgroupid
            LEFT OUTER JOIN dbo.tblaccountcs s
                   ON s.fcoid = a.fcoid AND s.fcsaccountid = a.fsupplierid AND s.fcs = 'S'
            WHERE a.fcoid   = p_pstrcoid
              AND a.fitemid = p_stritemid;

    ELSIF p_strmode = 'GTL' THEN

        OPEN p_result_cursor FOR
            SELECT
                c.fbrid,
                c.fbrname,
                COALESCE(sc.fstock, 0)                          AS fstock,
                COALESCE(sc.fpreviousunitcost, 0)               AS fpreviousunitcost,
                a.funitprice                                    AS funitprice,
                COALESCE(sc.funitcost, 0)                       AS funitcost,
                COALESCE(sc.fstock, 0) * COALESCE(sc.funitcost, 0) AS ftotalcost
                -- the old: a.fRetailPrice, a.fWholesalePrice, a.fSpecialPrice
            FROM dbo.tblitemtl a
            INNER JOIN dbo.tblbranch c
                   ON c.fcoid = a.fcoid AND c.fbrid = a.fbrid
            LEFT OUTER JOIN dbo.tblstockcontrol sc
                   ON sc.fcoid   = a.fcoid
                  AND sc.fitemid = a.fitemid
                  AND sc.fbrid   = a.fbrid
                  AND sc.fyear   = p_pstryear              -- tblstockcontrol.fyear is varchar(4)
            WHERE a.fcoid   = p_pstrcoid
              AND a.fitemid = p_stritemid
            ORDER BY c.fbrid;

    -- ELSIF p_strmode = 'GTLC' THEN
    --     the old stock by branch, summed from the stock transactions:
    --     SELECT SUM(COALESCE(fqtyin, 0)) - SUM(COALESCE(fqtyout, 0)) AS fstock,
    --            fbrid AS fbranchname
    --       FROM dbo.tblstocktrans
    --      WHERE fcoid = p_pstrcoid AND fitemid = p_stritemid
    --      GROUP BY fcoid, fbrid, fitemid;

    END IF;

END;
$procedure$;
