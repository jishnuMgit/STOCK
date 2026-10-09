-- FUNCTION: dbo.fillbranchofuser(character varying, character varying)

-- DROP FUNCTION IF EXISTS dbo.fillbranchofuser(character varying, character varying);

-- The branches a user has a RIGHT to, in position order. Fills the Default
-- Branch dropdown of the Set Default Branch screen: a user can only get a
-- default branch that they may use (the old IsUserBrRight check).
-- The right itself is decided by dbo.userbranches, the same function every
-- other screen uses (the user ID ADMIN has every branch; anyone else needs a
-- row in tbluserpermissionbranch).
--
--   Select * from dbo.fillbranchofuser('01', 'ajith')

CREATE OR REPLACE FUNCTION dbo.fillbranchofuser(
    p_strcoid   character varying,
    p_struserid character varying)
 RETURNS TABLE(fbrname character varying, fbrid character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            b.fbrname,
            b.fbrid
        FROM dbo.tblbranch b
        WHERE b.fcoid = p_strcoid
          AND dbo.userbranches(p_strcoid, p_struserid, b.fbrid)
        ORDER BY b.fpositionno, b.fbrid;

END;
$function$;
