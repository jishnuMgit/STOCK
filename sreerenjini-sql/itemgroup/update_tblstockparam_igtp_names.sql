-- =====================================================================
-- The names shown in the Stock / Non-stock list of the Item Group page (tblstockparam, fptype 'IGTP'):
--     S   Stock Item  ->  Stock
--     N   Non Stock   ->  Non-Stock
-- The ids (S / N) stay as they are - they are what tblitemgroup.fsn keeps. Only dbo.fillitemgrouptype reads these rows.
-- Safe to run twice.
-- =====================================================================

UPDATE dbo.tblstockparam SET fpname = 'Stock'     WHERE fptype = 'IGTP' AND fpid = 'S';
UPDATE dbo.tblstockparam SET fpname = 'Non-Stock' WHERE fptype = 'IGTP' AND fpid = 'N';

-- the check
SELECT fcoid, fptype, fpid, fpname FROM dbo.tblstockparam WHERE fptype = 'IGTP' ORDER BY fcoid, fpid DESC;
