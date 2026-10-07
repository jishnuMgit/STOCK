-- FUNCTION: dbo.userbranches(pstrcoid character varying, pstruserid character varying, strbrid character varying)

-- DROP FUNCTION IF EXISTS dbo.userbranches(pstrcoid character varying, pstruserid character varying, strbrid character varying);

CREATE OR REPLACE FUNCTION dbo.userbranches(pstrcoid character varying, pstruserid character varying, strbrid character varying)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    blnResult BOOLEAN;
    strUserType VARCHAR(2);
    strTemp VARCHAR(3);
BEGIN
    blnResult := FALSE;

    strUserType :=
        dbo.GetUserType(pstrCoID, pstrUserID);

    strTemp := '';

    IF strUserType = 'AU' THEN

        blnResult := TRUE;

    ELSE

        SELECT fBrID
        INTO strTemp
        FROM dbo.tblUserPermissionBranch
        WHERE fCoID = pstrCoID
          AND fBrID = strBrID
          AND fUserID = pstrUserID;

        IF dbo.IsNullorEmpty(strTemp) = FALSE THEN
            blnResult := TRUE;
        END IF;

    END IF;

    RETURN blnResult;
END;
$function$;
