-- FUNCTION: dbo.filluserid(p_strcoid character varying)

-- DROP FUNCTION IF EXISTS dbo.filluserid(p_strcoid character varying);

-- The User ID list of the two User Permission screens (Menu and Branch).
-- An Admin User (fusertype = 'AU') has every right already, so there is nothing to grant:
-- the Admin Users (ADMIN and any other AU) are not in the list, only the Regular Users.

CREATE OR REPLACE FUNCTION dbo.filluserid(p_strcoid character varying)
 RETURNS TABLE(fuserid character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
        SELECT
            t.fuserid
        FROM dbo.tbluserlogin t
        WHERE t.fcoid = p_strcoid
          AND t.fusertype <> 'AU'
        ORDER BY t.fuserid;

END;
$function$;
