-- =====================================================================
-- dbo.getitemgroupsn(p_pstrcoid, p_stritemid)
--
-- The Stock / Non-stock flag (S / N) of an item: the fsn of the item's group (tblitemhd.fitemgroupid -> tblitemgroup.fsn).
-- The twin of dbo.getitemgroupid(p_pstrcoid, p_stritemid), which gives the group id.
-- NULL when the item is unknown, has no group, or its group has no fsn yet.
-- =====================================================================

CREATE OR REPLACE FUNCTION dbo.getitemgroupsn(
    p_pstrcoid   varchar,
    p_stritemid  varchar
)
RETURNS varchar
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_strresult varchar(1);
BEGIN
    SELECT g.fsn
      INTO v_strresult
      FROM dbo.tblitemhd h
      JOIN dbo.tblitemgroup g
        ON g.fcoid = h.fcoid
       AND g.fitemgroupid = h.fitemgroupid
     WHERE h.fcoid = p_pstrcoid
       AND h.fitemid = p_stritemid;

    RETURN v_strresult;
END;
$$;
