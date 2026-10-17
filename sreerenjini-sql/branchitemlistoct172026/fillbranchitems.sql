-- =====================================================================
-- dbo.fillbranchitems(company, branch)
--
-- The items of ONE branch that can be used on a stock document: the items attached
-- to the branch (tblitemtl) that are not inactive there, with their name, unit and
-- packing from the item master (tblitemhd), in Item ID order.
--
-- Used by the Item ID / Item Name boxes of
--   Beginning Stock, Stock Transfer (From branch) and Stock Adjustment.
-- It takes the place of the query each of those three backends had of its own.
-- (The old forms read the same thing from the cached master data: the items of the
--  branch with IsNull(fHide, 0) <> 1.)
--
-- Test:  SELECT * FROM dbo.fillbranchitems('01', 'JD');
-- =====================================================================

CREATE OR REPLACE FUNCTION dbo.fillbranchitems(
    p_pstrcoid character varying,
    p_strbrid  character varying)
    RETURNS TABLE(
        fitemid   character varying,
        fitemname character varying,
        funit     character varying,
        fpacking  numeric)
    LANGUAGE plpgsql
AS $BODY$
BEGIN

    RETURN QUERY
        SELECT
            h.fitemid,
            h.fitemname,
            h.funit,
            h.fpacking
        FROM dbo.tblitemtl t
        JOIN dbo.tblitemhd h
          ON h.fcoid   = t.fcoid
         AND h.fitemid = t.fitemid
        WHERE t.fcoid = p_pstrcoid
          AND t.fbrid = p_strbrid
          AND COALESCE(t.finactive, false) = false
        ORDER BY h.fitemid;

END;
$BODY$;

ALTER FUNCTION dbo.fillbranchitems(character varying, character varying)
    OWNER TO postgres;
