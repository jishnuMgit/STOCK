-- PROCEDURE: dbo.sp_pagecurrency
--
-- ADDED: p_dtpserverdate - the time written on the row (fcuserdate on a new currency, fmuserdate on a rename). The page gets it
--   from the database server's clock (GET /datetime/server-date) and the backend (CurrencyService.ts) checks it and passes it, so
--   every row of one save carries the same time. NULL = the procedure's own current_timestamp (a caller that sends none works as
--   before). It is placed before the cursor, as on the other pages.
--   The signature changed (a new argument), so the earlier version is dropped first.
--
-- The error "procedure dbo.sp_pagecurrency(... p_dtpserverdate => timestamp without time zone) does not exist" on the Currency
-- page means this file has not been run yet.

DROP PROCEDURE IF EXISTS dbo.sp_pagecurrency(character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, refcursor);

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
	IN p_dtpserverdate timestamp without time zone DEFAULT NULL::timestamp without time zone,
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
            coalesce(p_dtpserverdate, current_timestamp)
        );

    elsif p_strmode = 'M' then

        update dbo.tblcurrency
        set
            fcurrency = p_strcurrency,
            fmuserid = p_pstruserid,
            fmuserdate = coalesce(p_dtpserverdate, current_timestamp)
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

ALTER PROCEDURE dbo.sp_pagecurrency(character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, timestamp without time zone, refcursor)
    OWNER TO postgres;
