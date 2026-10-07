-- Account ID / Account Name dropdowns for Settings/SetChartOfAccount
-- (old FillCombos: tblAccount WHERE fAccountLevel >= 3).
-- Level 3 = group accounts (fgph 'G'), level 4 = ledger accounts
-- (fgph 'H' / 'P') - so the user can map a parameter either to a
-- whole group or to one account. fgph is returned so the G/P/H
-- column can be filled when an account is picked.
CREATE OR REPLACE FUNCTION dbo.fillfinaccount(p_pstrcoid varchar)
RETURNS TABLE (
    faccountid   varchar(12),
    faccountname varchar(100),
    fgph         varchar(1)
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT
            a.faccountid,
            a.faccountname,
            a.fgph
        FROM dbo.tblaccount a
        WHERE a.fcoid = p_pstrcoid
          AND a.faccountlevel >= 3
        ORDER BY a.faccountid;

END;
$$;

-- test:  SELECT * FROM dbo.fillfinaccount('01');
