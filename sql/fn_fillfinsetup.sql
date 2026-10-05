-- Parameter Name dropdown for Settings/FinanceSetting
-- (old SP_GetFinSetup). Master list from tblfinsetup for the
-- logged-in company, one row per parameter, in position order.
-- Columns are cast so the function works whatever the exact
-- column types of tblfinsetup are.
-- (GROUP BY instead of DISTINCT: with DISTINCT, ORDER BY may only
-- use expressions that appear exactly in the select list, and the
-- casts below make fpositionno not match.)
CREATE OR REPLACE FUNCTION dbo.fillfinsetup(p_pstrcoid varchar)
RETURNS TABLE (
    fname        varchar(100),
    ftype        varchar(10),
    fpositionno  integer
)
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN QUERY
        SELECT
            t.fname::varchar(100),
            t.ftype::varchar(10),
            t.fpositionno::integer
        FROM dbo.tblfinsetup t
        WHERE t.fcoid = p_pstrcoid
        GROUP BY t.fname, t.ftype, t.fpositionno
        ORDER BY t.fpositionno;

END;
$$;

-- test:  SELECT * FROM dbo.fillfinsetup('01');
