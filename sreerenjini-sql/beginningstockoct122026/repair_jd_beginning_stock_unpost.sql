-- =====================================================================
-- One-time repair: Beginning Stock of branch JD (company 01, year 2026).
--
-- It was posted at 14-Oct-2026 09:29 with the OLD copy of the post procedure (dbo.sp_bgpost, now sp_pagebeginningstockpost) (the
-- one whose stock-row INSERT was still commented). tblstockcontrol had no
-- row for the items, so the lines were marked posted (fpost = true) but their
-- Unit Cost / Total Cost became NULL and no stock was added.
--
-- This puts the lines back as they were before the post (unposted, cost 21):
--   Sl.# 1  dfdfd     qty  1.000  cost 21.0000  total  21.0000
--   Sl.# 2  itiditem  qty 23.000  cost 21.0000  total 483.0000
--
-- Order:  1) run this   2) run sp_pagebeginningstockpost.sql   3) press Post again
-- =====================================================================

BEGIN;

UPDATE dbo.tblstocktrans
   SET fpost      = false,
       funitcost  = 21,
       ftotalcost = fqtyin * 21
 WHERE fcoid    = '01'
   AND fyear    = 2026
   AND fbrid    = 'JD'
   AND fdoctype = 'BG'
   AND fdocno   = 'BG'
   AND fslno IN (1, 2);

-- check: 2 rows, fpost = false, costs 21 / 21, totals 21 / 483
SELECT fslno, fitemid, fqtyin, funitcost, ftotalcost, fpost
  FROM dbo.tblstocktrans
 WHERE fcoid = '01' AND fbrid = 'JD' AND fdoctype = 'BG'
 ORDER BY fslno;

COMMIT;
