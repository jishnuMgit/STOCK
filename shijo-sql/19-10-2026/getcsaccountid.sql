-- FUNCTION: dbo.getcsaccountid(character varying, character varying)

-- DROP FUNCTION IF EXISTS dbo.getcsaccountid(character varying, character varying);

CREATE OR REPLACE FUNCTION dbo.getcsaccountid(
	p_pstrcoid character varying,
	p_straccountid character varying)
    RETURNS character varying
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
declare
    v_accountid varchar(12);
begin
    select a.faccountid
    into v_accountid
    from dbo.tblaccount a
    where a.fcoid = p_pstrcoid
      and a.faccountid = p_straccountid
      and a.fgcs in ('C', 'S');

    return v_accountid;
end;
$BODY$;

ALTER FUNCTION dbo.getcsaccountid(character varying, character varying)
    OWNER TO postgres;

