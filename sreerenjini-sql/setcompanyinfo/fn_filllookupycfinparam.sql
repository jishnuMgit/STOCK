CREATE OR REPLACE FUNCTION dbo.filllookupycfinparam(
    p_pstrcoid varchar(3)
)
RETURNS TABLE
(
    fpid varchar,
    fpname varchar
)
LANGUAGE plpgsql
AS $body$
BEGIN
    RETURN QUERY
    SELECT
        f.fpid,
        f.fpname
    FROM dbo.tblfinparam f
    WHERE f.fcoid = p_pstrcoid
      AND f.fptype = 'YC'
    ORDER BY f.fpid;
END;
$body$;