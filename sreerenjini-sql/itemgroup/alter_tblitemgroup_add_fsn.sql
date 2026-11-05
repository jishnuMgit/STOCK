-- =====================================================================
-- dbo.tblitemgroup: the new column fsn  varchar(1)
-- Nullable, no default: the existing item groups keep NULL until a value is set.
-- Safe to run twice.
-- =====================================================================

ALTER TABLE dbo.tblitemgroup ADD COLUMN IF NOT EXISTS fsn varchar(1);

-- the check
SELECT column_name, data_type, character_maximum_length, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'dbo' AND table_name = 'tblitemgroup'
 ORDER BY ordinal_position;
