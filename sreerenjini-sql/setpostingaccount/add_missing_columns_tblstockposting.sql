-- Set Posting Account (dbo.sp_pagesetpostingaccount) reads and writes these columns of
-- dbo.tblstockposting. Each line adds one only when the table does not have it yet
-- (IF NOT EXISTS), so it is safe to run on a table that already has some or all of them.
-- Run it once, then try the page again.
--
-- The round-off column is spelled frounfoffaccountid in this table (the procedure maps it
-- back to froundoffaccountid for the page).

ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fcashsupplieraccountid character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fcashcustomeraccountid character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fstockaccountid        character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fsalesaccountid        character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fsalesretaccountid     character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fsalescostaccountid    character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fsalesretcostaccountid character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fstockadjaccountid     character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS frounfoffaccountid     character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS finputvataccountid     character varying(12);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS foutputvataccountid    character varying(12);

-- who saved / modified the row, and when
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fcuserid   character varying(30);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fcuserdate timestamp without time zone;
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fmuserid   character varying(30);
ALTER TABLE dbo.tblstockposting ADD COLUMN IF NOT EXISTS fmuserdate timestamp without time zone;
