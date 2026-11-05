-- =====================================================================
-- dbo.havecustomerdivisiontrans(p_pstrcoid, p_lkpcsaccountid, p_txtdivisionid)
--
-- The old objCommon.HaveTrans("fDivID", id) of the Customer Division screen: do transactions already use this
-- division OF THIS CUSTOMER? (true = used)
--
-- dbo.havetrans('fDivID') cannot do it: it reads the tables listed in tblfinsetupdeletion / tblstocksetupdeletion and
-- no row is set for the key fDivID, so it never found anything. And it ignores the customer, so division "01" of one
-- customer would block division "01" of another.
--
-- The division is used by:
--   tblfintrans   fdivid                                    (the customer is the account of the line)
--   tblarap       fdivid / fcreditdivid / fdebitdivid       (the customer is fcsaccountid)
-- =====================================================================

-- the first install named the company parameter p_coid: CREATE OR REPLACE cannot rename a parameter, so it is dropped first
DROP FUNCTION IF EXISTS dbo.havecustomerdivisiontrans(varchar, varchar, varchar);

CREATE OR REPLACE FUNCTION dbo.havecustomerdivisiontrans(
    p_pstrcoid        varchar,
    p_lkpcsaccountid  varchar,
    p_txtdivisionid   varchar
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN EXISTS (
               SELECT 1
                 FROM dbo.tblfintrans t
                WHERE t.fcoid = p_pstrcoid
                  AND t.fdivid = p_txtdivisionid
                  AND (t.fcsaccountid = p_lkpcsaccountid OR t.faccountid = p_lkpcsaccountid)
           )
        OR EXISTS (
               SELECT 1
                 FROM dbo.tblarap a
                WHERE a.fcoid = p_pstrcoid
                  AND a.fcsaccountid = p_lkpcsaccountid
                  AND p_txtdivisionid IN (a.fdivid, a.fcreditdivid, a.fdebitdivid)
           );
END;
$$;
