-- PROCEDURE: dbo.sp_rptaccount(character varying, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_rptaccount(character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptaccount(
	IN p_strmode character varying,
	IN p_pstruserid character varying,
	IN p_pstrcoid character varying DEFAULT NULL::character varying,
	IN p_straccountid character varying DEFAULT NULL::character varying,
	INOUT p_result refcursor DEFAULT 'rptaccount_cursor'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
begin
    if p_strmode = 'D' then

        delete from dbo.tblrptaccount
        where fuserid = p_pstruserid;

    elsif p_strmode = 'I' then

        insert into dbo.tblrptaccount
        (
            fuserid,
            faccountid,
            faccountname,
            fhavecc,
            faccountlevel
        )
        select
            p_pstruserid,
            faccountid,
            faccountname,
            fhavecc,
            faccountlevel
        from dbo.tblaccount
        where fcoid = p_pstrcoid
          and faccountid = p_straccountid;

    elsif p_strmode = 'G' then

        update dbo.tblrptaccount
        set faccountname = '    ' || faccountname
        where fuserid = p_pstruserid
          and faccountlevel = 2;

        update dbo.tblrptaccount
        set faccountname = '        ' || faccountname
        where fuserid = p_pstruserid
          and faccountlevel = 3;

        update dbo.tblrptaccount
        set faccountname = '             ' || faccountname
        where fuserid = p_pstruserid
          and faccountlevel = 4;

        open p_result for
            select
                faccountid,
                faccountname,
                fhavecc,
                faccountlevel
            from dbo.tblrptaccount
            where fuserid = p_pstruserid
            order by faccountid;

    else
        raise exception 'invalid mode: %', p_strmode;
    end if;
end;
$BODY$;
ALTER PROCEDURE dbo.sp_rptaccount(character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

