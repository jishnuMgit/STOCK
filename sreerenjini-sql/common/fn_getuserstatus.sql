-- FUNCTION: dbo.getuserstatus(pstrcoid character varying, pstruserid character varying)

-- DROP FUNCTION IF EXISTS dbo.getuserstatus(pstrcoid character varying, pstruserid character varying);

CREATE OR REPLACE FUNCTION dbo.getuserstatus(pstrcoid character varying, pstruserid character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    strResult VARCHAR(1);
BEGIN
    strResult := 'I';

    SELECT COALESCE(fUserStatus, 'I')
    INTO strResult
    FROM dbo.tblUserLogin
    WHERE fCoID = pstrCoID
      AND fUserID = pstrUserID;

    RETURN strResult;
END;
$function$;
