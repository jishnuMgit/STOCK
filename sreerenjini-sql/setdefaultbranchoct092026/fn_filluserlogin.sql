-- FUNCTION: dbo.filluserlogin(character varying)

-- DROP FUNCTION IF EXISTS dbo.filluserlogin(character varying);

-- All the users of a company, ADMIN included, A to Z. Fills the User ID
-- dropdown of the Set Default Branch screen.
-- (dbo.filluserid leaves ADMIN out - it was made for the permission screens -
--  and ADMIN has a default branch of its own, so it cannot be reused here.)
--
--   Select * from dbo.filluserlogin('01')

CREATE OR REPLACE FUNCTION dbo.filluserlogin(p_strcoid character varying)
 RETURNS TABLE(fuserid character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fuserid
        FROM dbo.tbluserlogin t
        WHERE t.fcoid = p_strcoid
        ORDER BY t.fuserid;

END;
$function$;
