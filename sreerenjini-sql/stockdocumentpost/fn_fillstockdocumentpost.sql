-- =====================================================================
-- dbo.fillstockdocumentpost(p_pstrcoid)   (Stock Document Post - the Document box)
--
-- The old clsStDocPost.FillCombos row filter:
--     fModuleID = <stock module> AND fToBePost = 1 AND fDocType <> 'QTN' AND fDocType <> 'ST'
-- The stock module is 'STK'. QTN is left out as in the old form. PO (Purchase Order) is left out too: it
-- moves no stock and has nothing to post. ST (Stock Transfer) is shown here, though the old form hides it:
-- it posts through dbo.sp_pagestocktransferpost.
-- =====================================================================

CREATE OR REPLACE FUNCTION dbo.fillstockdocumentpost(p_pstrcoid character varying)
 RETURNS TABLE(fdoctype character varying, fdocname character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fdoctype,
            t.fdocname
        FROM dbo.tbldocument t
        WHERE t.fcoid = p_pstrcoid
          AND t.fmoduleid = 'STK'
          AND t.ftobepost = true
          AND t.fdoctype NOT IN ('QTN', 'PO')
        ORDER BY t.fpositionno, t.fdocname;

END;
$function$;
