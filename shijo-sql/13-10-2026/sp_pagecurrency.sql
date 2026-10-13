-- PROCEDURE: dbo.sp_pagecurrency(character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagecurrency(character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagecurrency(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_gstryear smallint DEFAULT 0,
	IN p_original_fcurrency character varying DEFAULT NULL::character varying,
	IN p_strcurrency character varying DEFAULT NULL::character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	IN p_strmenuname character varying DEFAULT NULL::character varying,
	IN p_strscreenname character varying DEFAULT NULL::character varying,
	IN p_strmoduleid character varying DEFAULT NULL::character varying,
	INOUT p_result refcursor DEFAULT 'currency_cursor'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
declare
    v_auditnote varchar(50);
    v_userdate varchar(10);
begin
    v_userdate := to_char(current_date, 'dd/mm/yyyy');

    v_auditnote := 'Currency : ' || coalesce(p_original_fcurrency, '');

    if p_strmode = 'G' then

        open p_result for
            select fcurrency
            from dbo.tblcurrency
            where fcoid = p_pstrcoid
            order by fcurrency;

    elsif p_strmode = 'S' then

        insert into dbo.tblcurrency
        (
            fcoid,
            fcurrency,
            fcuserid,
            fcuserdate
        )
        values
        (
            p_pstrcoid,
            p_strcurrency,
            p_pstruserid,
            current_timestamp
        );

    elsif p_strmode = 'M' then

        update dbo.tblcurrency
        set
            fcurrency = p_strcurrency,
            fmuserid = p_pstruserid,
            fmuserdate = current_timestamp
        where fcoid = p_pstrcoid
          and fcurrency = p_original_fcurrency;

    elsif p_strmode = 'D' then

        delete from dbo.tblcurrency
        where fcoid = p_pstrcoid
          and fcurrency = p_original_fcurrency;

         CALL dbo.sp_useraudit(
		     p_pstrcoid,
		     '',
			 '',
			 '',
			 p_strcurrency,            
             p_strscreenname,
			 'D',            
             v_auditnote,
             p_pstruserid
        );

    else
        raise exception 'invalid mode: %', p_strmode;
    end if;
end;
$BODY$;
ALTER PROCEDURE dbo.sp_pagecurrency(character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

