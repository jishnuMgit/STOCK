-- PROCEDURE: dbo.sp_rptcustomerlist(character varying, character varying, character varying, character varying, refcursor)

DROP PROCEDURE IF EXISTS dbo.sp_rptcustomerlist(character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptcustomerlist(
	IN p_strmode character varying,
	IN p_pstruserid character varying,
	IN p_pstrcoid character varying DEFAULT NULL::character varying,
	IN p_straccountid character varying DEFAULT NULL::character varying,
	INOUT p_result refcursor DEFAULT 'rptcustomerlist_cursor'::refcursor)
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
            faccountlevel,
            faddress,
            fcontact,
            fphone,
            fcreditlimit,
            fcreditdays,
            fvatno
        )
        select
            p_pstruserid,
            a.faccountid,
            a.faccountname,
            a.faccountlevel,
            b.fstreetname,
            b.fcontact,
            b.fphone,
            b.fcreditlimit,
            b.fcreditdays,
            b.fvatno
        from dbo.tblaccount a left join dbo.tblaccountcs b on a.faccountid=b.fcsaccountid
        where a.fcoid = p_pstrcoid
          and a.faccountid = p_straccountid;

    elsif p_strmode = 'G' then

        update dbo.tblrptaccount
        set faccountname = '     ' || faccountname
        where fuserid = p_pstruserid
          and faccountlevel = 4;

        open p_result for
            select
                faccountid,
                faccountname,
                faddress,
                fcontact,
                fphone,
                fcreditlimit,
                fcreditdays,
                faccountlevel,
                fvatno
            from dbo.tblrptaccount
            where fuserid = p_pstruserid
            order by faccountid;

    else
        raise exception 'invalid mode: %', p_strmode;
    end if;
end;
$BODY$;
ALTER PROCEDURE dbo.sp_rptcustomerlist(character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

