-- Adds the Item Group ID column to dbo.tblitemgroup, only when the table does not have it yet.
-- Run it yourself. If the column is already there (the Item Group screen, sp_pageitemgroup and
-- the reports all read dbo.tblitemgroup.fitemgroupid), it does nothing and gives a notice.
--
-- Note: a new column starts EMPTY (NULL) in every existing row. If the table really had no
-- fitemgroupid, the groups already saved still need their IDs filled in.

ALTER TABLE dbo.tblitemgroup
    ADD COLUMN IF NOT EXISTS fitemgroupid character varying(12);

-- To check what the table has now:
--   SELECT column_name, data_type, character_maximum_length
--     FROM information_schema.columns
--    WHERE table_schema = 'dbo' AND table_name = 'tblitemgroup'
--    ORDER BY ordinal_position;
