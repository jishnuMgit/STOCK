-- =====================================================================
-- TEST DATA for the Stock Document Re-Post screen (Sales > Transaction > Stock Document Re-Post)
--
-- It uses TWO TEST BRANCHES that are not real branches - ZZ (the sending branch) and YY (the receiving branch) - and the
-- item 'wire', so your real branches are not touched. Run the parts in order, in your own SQL tool:
--
--   PART 1  adds the test documents, posted, with posting numbers 999000001 and 999000002, and puts WRONG stock on
--           purpose (ZZ 5555, YY 7777)
--   PART 2  shows the stock BEFORE
--   (then the screen)  Stock Document Re-Post:  From Txn No. 999000001   To Txn No. 999000002   -> Post
--   PART 3  shows the stock AFTER - the Re-Post has rebuilt it from the documents:  ZZ 700, YY 500
--           (look at the fstock column; fpreviousstock is filled in by the replay itself)
--   PART 4  (optional) a document of ZZ OUTSIDE the range - the Re-Post must be REFUSED
--   PART 5  CLEANUP - removes everything the test added. Run it when you have finished.
--
-- The documents:
--   Beginning Stock  ZZ  wire  +1000 @ 2.00     (posting no. 999000001)
--   Beginning Stock  YY  wire  +200  @ 2.00     (posting no. 999000001)
--   Stock Transfer   ZZ -> YY  wire  300 @ 2.00 (posting no. 999000002)
--   so the stock must be  ZZ = 1000 - 300 = 700   and   YY = 200 + 300 = 500
--
-- Needs: dbo.sp_pagestockdocumentrepost installed, the menu update (menu_stockdocumentrepost.sql) done.
-- =====================================================================


-- ## PART 1 - the test data -------------------------------------------------------------------------------------------

INSERT INTO dbo.tblstocktrans
    (fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fdate, fitemid, fqtyin, fqtyout, funitcost, ftotalcost,
     fpost, fpostingno, fstbrid, fsttobrid)
VALUES
    ('01', '2026', 'ZZ', 'BG',  'BG',   1, '2026-10-30', 'wire', 1000,   0, 2, 2000, true, '999000001', NULL, NULL),
    ('01', '2026', 'YY', 'BG',  'BG',   1, '2026-10-30', 'wire',  200,   0, 2,  400, true, '999000001', NULL, NULL),
    ('01', '2026', 'ZZ', 'ST',  'STX1', 1, '2026-10-30', 'wire',    0, 300, 2, -600, true, '999000002', 'ZZ', 'YY'),
    ('01', '2026', 'YY', 'STI', 'STX1', 1, '2026-10-30', 'wire',  300,   0, 2,  600, true, '999000002', 'ZZ', 'YY');

-- the Stock Transfer procedure looks for the stock account of the branches, even when it re-posts
INSERT INTO dbo.tblstockposting (fcoid, fbrid, fstockaccountid, fstockadjaccountid)
VALUES ('01', 'ZZ', '1110001', '1101001'),
       ('01', 'YY', '1110001', '1101001');

-- WRONG stock on purpose: the Re-Post has to put it right
INSERT INTO dbo.tblstockcontrol (fcoid, fitemid, fyear, fbrid, fpreviousstock, fstock, fpreviousunitcost, funitcost)
VALUES ('01', 'wire', '2026', 'ZZ', 0, 5555, 0, 2),
       ('01', 'wire', '2026', 'YY', 0, 7777, 0, 2);


-- ## PART 2 - BEFORE (expected: ZZ 5555, YY 7777) ----------------------------------------------------------------------

SELECT fbrid, fitemid, fstock, fpreviousstock
FROM dbo.tblstockcontrol
WHERE fbrid IN ('ZZ', 'YY') AND fitemid = 'wire'
ORDER BY fbrid;


-- ## THE SCREEN: Stock Document Re-Post -> From Txn No. 999000001, To Txn No. 999000002, Post ------------------------
--    The message: "Stock Document Re-Post posted successfully / 3 document(s) re-posted"


-- ## PART 3 - AFTER (expected: fstock ZZ 700, YY 500 - fpreviousstock is set by the replay itself, ignore it) ---------

SELECT fbrid, fitemid, fstock, fpreviousstock
FROM dbo.tblstockcontrol
WHERE fbrid IN ('ZZ', 'YY') AND fitemid = 'wire'
ORDER BY fbrid;

-- the audit row of the Re-Post
SELECT fscreenname, faction, fscreenkey, fnote, fuserid, fuserdate
FROM dbo.tbluseraudit
WHERE fscreenname = 'Stock Document Re-Post'
ORDER BY id DESC
LIMIT 3;


-- ## PART 4 (optional) - the Re-Post must REFUSE when a branch has a posted document outside the range ------------------
--    Add one more posted document of ZZ, with a posting number outside the range, then Post the same range again:
--    expected message: "The stock of the branch(es) ZZ cannot be rebuilt: they have posted documents outside Txn. No. ..."

INSERT INTO dbo.tblstocktrans
    (fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fdate, fitemid, fqtyin, fqtyout, funitcost, ftotalcost,
     fpost, fpostingno)
VALUES ('01', '2026', 'ZZ', 'BG', 'BG2', 1, '2026-10-30', 'wire', 1, 0, 2, 2, true, '999000009');

--    (and on your real data: From 260000001, To 260000017 is refused with "The re-post of the document type(s) ADJ, PI
--     is not available yet")


-- ## PART 5 - CLEANUP: removes everything this test added ---------------------------------------------------------------

DELETE FROM dbo.tblstocktrans   WHERE fbrid IN ('ZZ', 'YY');
DELETE FROM dbo.tblstockcontrol WHERE fbrid IN ('ZZ', 'YY');
DELETE FROM dbo.tblstockposting WHERE fbrid IN ('ZZ', 'YY');
DELETE FROM dbo.tbluseraudit    WHERE fscreenname = 'Stock Document Re-Post' AND fscreenkey = '999000001-999000002';
