-- =========================================================
-- dbo.filluserid
-- User ID dropdown for any screen that picks a target user
-- (Security/UserLogin's User Permission - Menu and
-- User Permission - Co Branch today). ADMIN is excluded,
-- matching the original VB FillCombos
-- ("...Where fUserID<>'ADMIN'").
-- =========================================================

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
          AND t.fuserid <> 'ADMIN'
        ORDER BY t.fuserid;

END;
$function$
