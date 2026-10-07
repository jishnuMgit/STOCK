-- FUNCTION: dbo.getusertype(pstrcoid character varying, pstruserid character varying)

-- DROP FUNCTION IF EXISTS dbo.getusertype(pstrcoid character varying, pstruserid character varying);

CREATE OR REPLACE FUNCTION dbo.getusertype(pstrcoid character varying, pstruserid character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    strResult VARCHAR(2);
BEGIN
    strResult := 'RU';

    SELECT COALESCE(fUserType, 'RU')
    INTO strResult
    FROM dbo.tblUserLogin
    WHERE fCoID = pstrCoID
      AND fUserID = pstrUserID;

    RETURN strResult;
END;
$function$;
