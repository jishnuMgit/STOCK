-- FUNCTION: dbo.userbranches(character varying, character varying, character varying)

-- DROP FUNCTION IF EXISTS dbo.userbranches(character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION dbo.userbranches(
	pstrcoid character varying,
	pstruserid character varying,
	strbrid character varying)
    RETURNS boolean
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
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
$BODY$;

ALTER FUNCTION dbo.userbranches(character varying, character varying, character varying)
    OWNER TO postgres;

