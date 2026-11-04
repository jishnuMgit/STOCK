-- =====================================================================
-- Beginning Stock is document type BS (it was BG)
--
-- 'BG' is ALSO the type of the Finance Beginning Balance (tblfintrans). It stays BG - this file does not touch it.
-- From now on the Beginning Stock (the Purchase > Transaction > Beginning Stock screen) is stored as BS.
--
-- RUN ORDER
--   1. take a backup of the database first
--   2. run the changed procedures (they handle BS now, no longer BG):
--        sreerenjini-sql/beginningstockoct122026/sp_pagebeginningstock.sql
--        sreerenjini-sql/beginningstockoct122026/sp_pagebeginningstockpost.sql
--        sreerenjini-sql/beginningstockoct122026/sp_pagebeginningstockprint.sql
--        sreerenjini-sql/stockdocumentpost/sp_pagegetstockdocumentpost.sql
--        sreerenjini-sql/stockdocumentrepost/sp_pagestockdocumentrepost.sql
--        sreerenjini-sql/stocktransferoct152026/sp_pagestockprint.sql
--   3. restart the backend (beginningStockService.ts now saves BS)
--   4. run THIS file (it moves what is already saved from BG to BS)
--
-- WHAT IT CHANGES
--   1. tbldocument     a document type BS "Beginning Stock" (module STK), a copy of the BG row of the stock module
--   2. tblstocktrans   the saved Beginning Stock documents: fdoctype BG -> BS, fdocno BG -> BS
--   3. tbldocumentno   the numbering rows of the stock module: fdoctype BG -> BS (prefix BG -> BS)
--   4. tbluseraudit    the audit rows of the screen "Beginning Stock": fdoctype BG -> BS
-- The stock itself (tblstockcontrol) and the posting numbers are not changed.
-- It runs in one transaction: if one statement fails, nothing is changed.
-- =====================================================================

BEGIN;

-- 1. the document type BS in the document master (only when it is not there yet)
INSERT INTO dbo.tbldocument
    (fcoid, fdoctype, fmoduleid, fdocname, fdocname_ar, ftobepost, fpositionno, fcuserid, fcuserdate)
SELECT d.fcoid, 'BS', d.fmoduleid, 'Beginning Stock', d.fdocname_ar, d.ftobepost, d.fpositionno, 'ADMIN', now()
  FROM dbo.tbldocument d
 WHERE d.fdoctype = 'BG'
   AND d.fmoduleid = 'STK'
   AND NOT EXISTS (SELECT 1 FROM dbo.tbldocument x WHERE x.fcoid = d.fcoid AND x.fdoctype = 'BS');

-- 2. the saved Beginning Stock documents
UPDATE dbo.tblstocktrans
   SET fdoctype = 'BS',
       fdocno   = 'BS'
 WHERE fdoctype = 'BG'
   AND fdocno   = 'BG';

-- 3. the numbering rows of the stock module (only where there is no BS row yet)
UPDATE dbo.tbldocumentno n
   SET fdoctype     = 'BS',
       fdocnoprefix = CASE WHEN n.fdocnoprefix = 'BG' THEN 'BS' ELSE n.fdocnoprefix END
 WHERE n.fdoctype  = 'BG'
   AND n.fmoduleid = 'STK'
   AND NOT EXISTS (SELECT 1 FROM dbo.tbldocumentno x
                    WHERE x.fcoid = n.fcoid AND x.fyear = n.fyear AND x.fbrid = n.fbrid AND x.fdoctype = 'BS');

-- 4. the audit rows of the Beginning Stock screen
UPDATE dbo.tbluseraudit
   SET fdoctype = 'BS'
 WHERE fscreenname = 'Beginning Stock'
   AND fdoctype    = 'BG';

-- the check: no stock document is BG any more, the Finance Beginning Balance is still BG
SELECT 'tblstocktrans BG (should be 0)'  AS what, count(*) AS n FROM dbo.tblstocktrans WHERE fdoctype = 'BG'
UNION ALL
SELECT 'tblstocktrans BS',                        count(*)      FROM dbo.tblstocktrans WHERE fdoctype = 'BS'
UNION ALL
SELECT 'tblfintrans BG (Beginning Balance, unchanged)', count(*) FROM dbo.tblfintrans   WHERE fdoctype = 'BG'
UNION ALL
SELECT 'tbldocument BS',                          count(*)      FROM dbo.tbldocument   WHERE fdoctype = 'BS';

COMMIT;
