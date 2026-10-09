-- ============================================================
-- "Is this item already used?" (dbo.sp_havetrans, key 'fItemID')
--
-- The rule row for fItemID in dbo.tblstocksetupdeletion still carries the old
-- SQL Server names (tblStockTrans / fItemID). Postgres keeps quoted names
-- exactly as written, so it cannot find them. This points the row at the real
-- table and column, in lowercase:
--
--   fItemID  ->  tblstocktrans.fitemid
--   an item is "used" when a stock transaction line carries it
--
-- Only this one row changes.
-- ============================================================

UPDATE dbo.tblstocksetupdeletion
SET ftblname = 'tblstocktrans', ffldname = 'fitemid'
WHERE fsearchkey = 'fItemID';

-- check
SELECT fsearchkey, ftblname, ffldname
FROM dbo.tblstocksetupdeletion
WHERE fsearchkey = 'fItemID';

-- and:  SELECT dbo.sp_havetrans('01', 'fItemID', 'SERVICES-INS-TUBE');   -- 1 = used
--       SELECT dbo.sp_havetrans('01', 'fItemID', 'NO-SUCH-ITEM');        -- 0 = not used
