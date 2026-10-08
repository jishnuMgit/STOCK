-- FUNCTION: dbo.fillvatslab(character varying)

-- DROP FUNCTION IF EXISTS dbo.fillvatslab(character varying);

-- The VAT slabs of a company (tblvatslab) in position order, with the
-- percentage each one carries. Fills the VAT Slab dropdown on the Item
-- Group page (the VAT % box follows the chosen slab).
--
-- Select * from dbo.fillvatslab('01')

CREATE OR REPLACE FUNCTION dbo.fillvatslab(p_strcoid character varying)
 RETURNS TABLE(fvatslab character varying, fvatper numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fvatslab,
            t.fvatper
        FROM dbo.tblvatslab t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.fpositionno, t.fvatslab;

END;
$function$;
