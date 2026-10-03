-- Company dropdown for Settings/SetCompanyInfo, limited to the
-- logged-in company (PstrCoID) and active companies only.
CREATE OR REPLACE FUNCTION dbo.filllookupcompanyname(p_pstrcoid varchar)
RETURNS TABLE (
    fcoid   varchar(3),
    fconame varchar(100)
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT
            t.fcoid,
            t.fconame
        FROM dbo.tblcompany t
        WHERE t.fcostatus = 'A'
          AND t.fcoid = p_pstrcoid
        ORDER BY t.fpositionno;

END;
$$;
