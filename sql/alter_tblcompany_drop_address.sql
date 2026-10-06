-- Removes the company ADDRESS from tblcompany (the Set Company Info
-- screen no longer has an address section).
--
-- PERMANENT: the 8 columns and everything in them are deleted.
-- Take a backup first, e.g.
--     CREATE TABLE dbo.tblcompany_bak_20261006 AS SELECT * FROM dbo.tblcompany;
--
-- Run in this order:
--   1. this script (drops the old procedure, then the columns)
--   2. sql/sp_pagesetcompanyinfo.sql (creates the new procedure)
-- The login page's company list (CompanyController) no longer reads the
-- address either, so nothing else needs the columns.

-- 1. the old procedure has 8 address parameters - a different signature,
--    so CREATE OR REPLACE cannot replace it; drop it explicitly
DROP PROCEDURE IF EXISTS dbo.sp_pagesetcompanyinfo(
    varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar,
    varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar,
    varchar, varchar, refcursor
);

-- 2. the columns
ALTER TABLE dbo.tblcompany
    DROP COLUMN IF EXISTS fcoaddress1,
    DROP COLUMN IF EXISTS fcoaddress2,
    DROP COLUMN IF EXISTS fcoaddress3,
    DROP COLUMN IF EXISTS fcoaddress4,
    DROP COLUMN IF EXISTS fcoaddress1_ar,
    DROP COLUMN IF EXISTS fcoaddress2_ar,
    DROP COLUMN IF EXISTS fcoaddress3_ar,
    DROP COLUMN IF EXISTS fcoaddress4_ar;
