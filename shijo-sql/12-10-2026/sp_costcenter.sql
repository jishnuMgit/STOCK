-- PROCEDURE: dbo.sp_pagecostcenter(character varying, character varying, character varying, character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagecostcenter(character varying, character varying, character varying, character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_pagecostcenter(
	IN strmode character varying,
	IN pstrcoid character varying,
	IN pstryear character varying DEFAULT 0,
	IN strccid character varying DEFAULT NULL::character varying,
	IN strccname character varying DEFAULT NULL::character varying,
	IN intpositionno smallint DEFAULT 0,
	IN stroriginal_ccid character varying DEFAULT NULL::character varying,
	IN stroriginal_ccname character varying DEFAULT NULL::character varying,
	IN pstruserid character varying DEFAULT NULL::character varying,
	IN strmenuname character varying DEFAULT NULL::character varying,
	IN strscreenname character varying DEFAULT NULL::character varying,
	IN strmoduleid character varying DEFAULT NULL::character varying)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_auditnote VARCHAR(50);
    v_userdate  VARCHAR(10);
BEGIN
    v_userdate := TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY');

    v_auditnote := 'Cost Center : ' || stroriginal_ccid;

    IF strmode = 'G' THEN
        RAISE EXCEPTION
            'Mode G cannot return rows from a PostgreSQL procedure. Use SELECT directly.';
            
    ELSIF strmode = 'S' THEN
        INSERT INTO dbo.tblcostcenter (
            fcoid,
            fccid,
            fccname,
            fpositionno,
            fcuserid,
            fcuserdate
        )
        VALUES (
            pstrcoid,
            strccid,
            strccname,
            COALESCE(intpositionno, 0),
            pstruserid,
            NOW()
        );

    ELSIF strmode = 'M' THEN
        UPDATE dbo.tblcostcenter
        SET fccid = strccid,
            fccname = strccname,
            fpositionno = COALESCE(intpositionno, 0),
            fmuserid = pstruserid,
            fmuserdate = NOW()
        WHERE fcoid = pstrcoid
          AND fccid = stroriginal_ccid;

    ELSIF strmode = 'D' THEN
        DELETE FROM dbo.tblcostcenter
        WHERE fcoid = pstrcoid
          AND fccid = stroriginal_ccid;

        CALL dbo.sp_useraudit(
		     pstrcoid,
		     pstryear,
			 '',
			 '',
			 stroriginal_ccid,            
             strscreenname,
			 'D',            
              v_auditnote,
              pstruserid
        );

    ELSE
        RAISE EXCEPTION 'Invalid mode: %', strmode;
    END IF;
END;
$BODY$;
ALTER PROCEDURE dbo.sp_pagecostcenter(character varying, character varying, character varying, character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying)
    OWNER TO postgres;

