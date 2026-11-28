-- REMOVE the Position No. from the Set Document No. screen: the field fpositionno of dbo.tbldocumentno goes. NOT run by Claude - you run it.
--
-- ORDER OF THE STEPS (run them in this order, all in pgAdmin):
--   1. Run sreerenjini-sql/setdocumentno/sp_pagesetdocumentno.sql  (the new procedure: no p_intpositionno; the list of a branch comes
--      ordered by fdoctype). The page and the backend (setdocumentnoService.ts) already call it without the position.
--   2. Run this file (the two steps below).
--   3. Restart the backend.
--
-- Only dbo.tbldocumentno loses the column. dbo.tblbranch, dbo.tblfinsetup and the other tables have their own fpositionno: they are not touched.
--
-- Before dropping, you may look at what is in the column (3 rows have a value other than 0, e.g. CR = 1):
--   SELECT fdoctype, fbrid, fpositionno FROM dbo.tbldocumentno WHERE fpositionno <> 0;

-- Step A: the old procedure sp_setdocumentno (the SQL Server port that the screen no longer uses) reads fpositionno ("ORDER BY fpositionno").
-- Nothing in the backend calls it - only dbo.sp_pagesetdocumentno is called. It is dropped here, or it would fail the day someone runs it.
DROP PROCEDURE IF EXISTS dbo.sp_setdocumentno(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, boolean, character varying, character varying, smallint, smallint, character varying, character varying, refcursor);

-- Step B: the field itself
ALTER TABLE dbo.tbldocumentno DROP COLUMN IF EXISTS fpositionno;

-- Check (the column must not be listed):
-- SELECT column_name FROM information_schema.columns WHERE table_schema = 'dbo' AND table_name = 'tbldocumentno' ORDER BY ordinal_position;
