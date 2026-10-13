
DROP PROCEDURE dbo.sp_pagecustsupcountry;

CREATE OR REPLACE PROCEDURE dbo.sp_pagecustsupcountry
(
    IN p_strmode varchar(1),
    IN p_pstrcoid varchar(3),
    IN p_strcountryid varchar(4) DEFAULT NULL,
    IN p_strcountryname varchar(50) DEFAULT NULL,
    IN p_strcountryname_a varchar(50) DEFAULT NULL,
    IN p_intposition smallint DEFAULT 0,
    IN p_orginal_countryid varchar(4) DEFAULT NULL,
    IN p_orginal_countryname varchar(50) DEFAULT NULL,
    IN p_orginal_countryname_a varchar(50) DEFAULT NULL,
    IN p_pstruserid varchar(20) DEFAULT NULL,
    IN p_strmenuname varchar(50) DEFAULT NULL,
    IN p_strscreenname varchar(50) DEFAULT NULL,
    IN p_strmoduleid varchar(4) DEFAULT NULL,
    INOUT p_result refcursor DEFAULT 'country_cursor'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_auditnote varchar(2000);
    v_keyid varchar(50);
BEGIN
    v_auditnote :=
        'Country ID : ' || COALESCE(p_strcountryid, '');

    IF p_strmode = 'G' THEN

        OPEN p_result FOR
        SELECT
            fcountryid,
            fcountryname,
            fcountryname_a,
            fpositionno
        FROM dbo.tblcustsupcountry
        WHERE fcoid = p_pstrcoid
        ORDER BY fpositionno, fcountryid;

    ELSIF p_strmode = 'S' THEN

        INSERT INTO dbo.tblcustsupcountry
        (
            fcoid,
            fcountryid,
            fcountryname,
            fcountryname_a,
            fpositionno,
            fuserid,
            fuserdate
        )
        VALUES
        (
            p_pstrcoid,
            p_strcountryid,
            p_strcountryname,
            p_strcountryname_a,
            COALESCE(p_intposition, 0),
            p_pstruserid,
            CURRENT_TIMESTAMP
        );

        v_auditnote :=
            'Customer/Supplier Country ID : '
            || COALESCE(p_strcountryid, '')
            || CHR(13) || CHR(10)
            || 'Customer/Supplier Country Name : '
            || COALESCE(p_strcountryname, '')
            || 'Customer/Supplier Country Name(Arabic) : '
            || COALESCE(p_strcountryname_a, '');

        

		 CALL dbo.sp_useraudit(
		     p_pstrcoid,
		     '',
			 '',
			 '',
			 p_strcountryid,            
             p_strscreenname,
			 'S',            
              v_auditnote,
             p_pstruserid
        );

    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tblcustsupcountry
        SET
            fcountryid = p_strcountryid,
            fcountryname = p_strcountryname,
            fcountryname_a = p_strcountryname_a,
            fpositionno = COALESCE(p_intposition, 0),
            fuserid = p_pstruserid,
            fuserdate = CURRENT_TIMESTAMP
        WHERE fcoid = p_pstrcoid
          AND fcountryid = p_orginal_countryid;

        v_auditnote := '';

        IF p_strcountryid IS DISTINCT FROM p_orginal_countryid THEN
            v_auditnote :=
                'Country ID : Changed from '
                || COALESCE(p_orginal_countryid, '')
                || ' to '
                || COALESCE(p_strcountryid, '')
                || CHR(13) || CHR(10);
        END IF;

        IF p_strcountryname IS DISTINCT FROM p_orginal_countryname THEN
            v_auditnote := v_auditnote
                || 'Country Name : Changed from '
                || COALESCE(p_orginal_countryname, '')
                || ' to '
                || COALESCE(p_strcountryname, '')
                || CHR(13) || CHR(10);
        END IF;

         CALL dbo.sp_useraudit(
		     p_pstrcoid,
		     '',
			 '',
			 '',
			 p_strcountryid,            
             p_strscreenname,
			 'M',            
              v_auditnote,
             p_pstruserid
        );

    ELSIF p_strmode = 'D' THEN

        v_keyid := p_orginal_countryid;

        DELETE FROM dbo.tblcustsupcountry
        WHERE fcoid = p_pstrcoid
          AND fcountryid = p_orginal_countryid;

        v_auditnote :=
            'Country ID : '
            || COALESCE(p_orginal_countryid, '')
            || CHR(13) || CHR(10)
            || 'Country Name : '
            || COALESCE(p_orginal_countryname, '')
            || 'Customer/Supplier Country Name : '
            || COALESCE(p_orginal_countryname_a, '');

        CALL dbo.sp_useraudit(
		     p_pstrcoid,
		     '',
			 '',
			 '',
			 p_strcountryid,            
             p_strscreenname,
			 'D',            
             v_auditnote,
             p_pstruserid
        );

    ELSE
        RAISE EXCEPTION 'invalid mode: %', p_strmode;
    END IF;
END;
$$;