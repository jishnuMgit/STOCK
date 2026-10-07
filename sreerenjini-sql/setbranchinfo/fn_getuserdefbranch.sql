-- FUNCTION: dbo.getuserdefbranch(character varying, character varying)

-- DROP FUNCTION IF EXISTS dbo.getuserdefbranch(character varying, character varying);

CREATE OR REPLACE FUNCTION dbo.getuserdefbranch(
	p_pstrcoid character varying,
	p_pstruserid character varying)
    RETURNS character varying
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    v_strbrid varchar(3);
BEGIN

    -- Select dbo.getuserdefbranch('01','ADMIN')
    -- Select dbo.getuserdefbranch('01','JACOB')

    SELECT COALESCE(fdefbrid, '')
      INTO v_strbrid
    FROM dbo.tbldefaultbranch
    WHERE fcoid = p_pstrcoid
      AND fuserid = p_pstruserid;

    RETURN v_strbrid;

END;
$BODY$;

ALTER FUNCTION dbo.getuserdefbranch(character varying, character varying)
    OWNER TO postgres;

