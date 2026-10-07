-- FUNCTION: dbo.getuserdefbranch(p_pstrcoid character varying, p_pstruserid character varying)

-- DROP FUNCTION IF EXISTS dbo.getuserdefbranch(p_pstrcoid character varying, p_pstruserid character varying);

CREATE OR REPLACE FUNCTION dbo.getuserdefbranch(p_pstrcoid character varying, p_pstruserid character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_strbrid varchar(3);
BEGIN

    -- Select dbo.getuserdefbranch('01','ADMIN')
    -- Select dbo.getuserdefbranch('01','JACOB')

    SELECT COALESCE(fdefbrid, '')
      INTO v_strbrid
    FROM dbo.tbldefaultbranch
    WHERE fcoid = p_pstrcoid
      AND fuserid = p_pstruserid;

    RETURN v_strbrid;

END;
$function$;
