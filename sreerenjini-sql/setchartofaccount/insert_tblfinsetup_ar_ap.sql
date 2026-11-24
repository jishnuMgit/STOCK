-- dbo.tblfinsetup: the Parameter list of Set Chart Of Account (read by dbo.fillfinsetup).
-- Company 01 has no A/R and no A/P in it, although its chart (dbo.tblcoasetting) already uses them, so the Parameter box
-- could not offer them. Positions 3 and 4 are free (the list now has 1, 2, 7 to 11, 91 and 92).
--
-- The column is fpositionno (not fposition). The insert skips a row that is already there, so it can be run twice.

INSERT INTO dbo.tblfinsetup (fcoid, ftype, fname, fpositionno)
SELECT v.fcoid, v.ftype, v.fname, v.fpositionno
FROM (VALUES
    ('01', 'A/R', 'Accounts Receivable', 3),
    ('01', 'A/P', 'Account Payable',     4)
) AS v (fcoid, ftype, fname, fpositionno)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.tblfinsetup t
    WHERE t.fcoid = v.fcoid
      AND t.ftype = v.ftype
);

-- Check:
-- SELECT * FROM dbo.fillfinsetup('01');
