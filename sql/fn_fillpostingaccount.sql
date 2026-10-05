-- Account dropdown for Settings/SetPostingAccount (the ID and Name
-- boxes of all 11 rows). tblaccount has no branch column, so the
-- list depends on the company only.
-- fgcs = 'G' (general) and fgph = 'H'.
CREATE OR REPLACE FUNCTION dbo.fillpostingaccount(p_pstrcoid varchar)
RETURNS TABLE (
    faccountid   varchar(12),
    faccountname varchar(100)
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT
            a.faccountid,
            a.faccountname
        FROM dbo.tblaccount a
        WHERE a.fcoid = p_pstrcoid
          AND a.fgcs = 'G'
          AND a.fgph = 'H'
        ORDER BY a.faccountid;

END;
$$;
