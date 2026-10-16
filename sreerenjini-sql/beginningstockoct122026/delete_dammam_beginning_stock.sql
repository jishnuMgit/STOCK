-- =====================================================================
-- Delete the Beginning Stock (doc type BG) of ONE branch - here Dammam, branch id 11.
--
-- Only an UNPOSTED Beginning Stock may be deleted this way: a posted one has
-- already put its quantities into tblstockcontrol, which this script does not undo
-- (the script stops with an error when any line is posted).
--
-- It
--   1. checks that there is something to delete and that nothing is posted,
--   2. copies the lines to a backup table first,
--   3. deletes the lines from tblstocktrans (and any tblfintrans rows of it),
--   4. shows what is left.
-- Run it in pgAdmin; to change the branch, change v_brid below (and the
-- backup table name). It is one transaction: if anything fails, nothing changes.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_coid  varchar := '01';
    v_brid  varchar := '11';      -- Dammam
    v_lines integer;
    v_posted integer;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE fpost)
      INTO v_lines, v_posted
      FROM dbo.tblstocktrans
     WHERE fcoid = v_coid AND fbrid = v_brid AND fdoctype = 'BG';

    IF v_lines = 0 THEN
        RAISE EXCEPTION 'There is no Beginning Stock for branch % to delete', v_brid;
    END IF;

    IF v_posted > 0 THEN
        RAISE EXCEPTION 'The Beginning Stock of branch % is POSTED (% lines) - the stock would have to be reversed first', v_brid, v_posted;
    END IF;
END $$;

-- 2. the backup (the same columns as the table, plus the day)
CREATE TABLE dbo.tblstocktrans_bak_bg11_20261016 AS
SELECT * FROM dbo.tblstocktrans
 WHERE fcoid = '01' AND fbrid = '11' AND fdoctype = 'BG';

-- 3. the delete
DELETE FROM dbo.tblfintrans
 WHERE fcoid = '01' AND fbrid = '11' AND fdoctype = 'BG';

DELETE FROM dbo.tblstocktrans
 WHERE fcoid = '01' AND fbrid = '11' AND fdoctype = 'BG';

-- 4. check: the backup holds the lines, the table has none left for the branch
SELECT 'backup'  AS what, count(*) AS lines FROM dbo.tblstocktrans_bak_bg11_20261016
UNION ALL
SELECT 'left in tblstocktrans', count(*)
  FROM dbo.tblstocktrans WHERE fcoid = '01' AND fbrid = '11' AND fdoctype = 'BG';

COMMIT;   -- (or ROLLBACK; to undo everything above)

-- To bring the lines back:
--   INSERT INTO dbo.tblstocktrans SELECT * FROM dbo.tblstocktrans_bak_bg11_20261016;
-- When you no longer need the backup:
--   DROP TABLE dbo.tblstocktrans_bak_bg11_20261016;
