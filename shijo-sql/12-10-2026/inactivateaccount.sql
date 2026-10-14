DROP PROCEDURE dbo.sp_pageinactivateaccount;

CREATE OR REPLACE PROCEDURE dbo.sp_pageinactivateaccount
(
    IN p_strmode varchar(1),
    IN p_pstrcoid varchar(3),
    IN p_straccountid varchar(12),
    IN p_blnstatus boolean DEFAULT FALSE,
    IN p_gstruserid varchar(20) DEFAULT NULL,
    IN p_strmenuname varchar(50) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_strmode = 'M' THEN

        UPDATE dbo.tblaccount
        SET
            fStatus = p_blnstatus,
            fmuserid = p_gstruserid,
            fmuserdate = CURRENT_TIMESTAMP
        WHERE fcoid = p_pstrcoid
          AND faccountid = p_straccountid;

        UPDATE dbo.tblaccountcs
        SET
            fStatus = p_blnstatus,
            fmuserid = p_gstruserid,
            fmuserdate = CURRENT_TIMESTAMP
        WHERE fcoid = p_pstrcoid
          AND fcsaccountid = p_straccountid;

    END IF;
END;
$$;