-- =====================================================================
-- dbo.sp_rptexpensesum   (Expense Summary report - Opening / Current / Closing)
--
-- Postgres port of the SQL Server SP_rptExpenseSum. For every EXPENSE account (dbo.isexpense) it gives
--     Opening  the expense before the From Date (the same year, the year of the From Date)
--     Current  the expense from the From Date to the To Date
--     Closing  Opening + Current
-- where expense = debit - credit (the old  sum(debit - credit), no sign change): a cost shows positive, a reversal
-- (a credit) shows negative. This is the one difference from Income Summary, which turns the sign with -1.
--
-- WHAT IT DOES
--   1. takes the HEAD accounts (tblaccount.fgph = 'H', the accounts that carry transactions) that are expense accounts,
--      so an account with no transaction is there too (shown when Print 0 Balance is on);
--   2. adds up their tblfintrans rows - the Opening and the Current - with the filters of the screen:
--        branch (One Branch, or all), cost center (One Cost Center, or all), post status;
--   3. rolls the amounts up to the account groups: level 3, 2 and 1 (dbo.getaccountgroupid), so a group shows the sum
--      of the accounts under it;
--   4. leaves out the accounts whose Opening and Current are both 0 (unless Print 0 Balance);
--   5. returns the accounts of the chosen Account Level - or, with Print A/c Group, every level up to it, the names
--      indented by level (the old 4 / 8 / 12 spaces for level 2 / 3 / 4).
--
-- THE ARGUMENTS (as the other report procedures: the radios are booleans, false = the first choice)
--   p_pstrcoid        company
--   p_rdgbranch       false One Branch (p_strbrid), true All Branch
--   p_strbrid         the branch (One Branch)
--   p_rdgcc           false One Cost Center (p_strccid), true All Cost Center
--   p_strccid         the cost center (One Cost Center)
--   p_dtpfromdate     From Date
--   p_dtptodate       To Date
--   p_intaccountlevel the Account Level (1 to 4)
--   p_lkppoststatus   0 All, 1 Posted, 2 Non Posted (the same as the other reports; the old SP: 0 Non Posted, 1 Posted,
--                     else all)
--   p_lkpprint0balance  Print 0 Balance
--   p_lkpprintacgroup   Print A/c Group
--   p_cursor          INOUT refcursor: the rows - faccountid, faccountname, faccountlevel, fop_drcr, fcu_drcr, fcl_drcr
--
-- Differences from the SQL Server procedure - forced by our tables, or for safety:
--   * no temporary tables and no dynamic SQL: one query;
--   * every tblaccount join is by company too (the table has the same account id in more than one company);
--   * a group row that has no account id (an account that has no group at that level) is left out; the old one made a
--     row with no id and no name;
--   * the amounts are rounded to 2 decimals per account, as the old numeric(18,2) columns did.
--
-- Called from the backend:  Backend/services/Finance/Report/rptExpenseSumService.ts  (CALL and FETCH in one transaction)
--   CALL dbo.sp_rptexpensesum('01', false, 'JD', true, NULL, '2026-10-01', '2026-10-31', 4, 1, false, true, 'cur_rptexpensesum');
--
-- HOW THE QUERY IS BUILT (read the comments inside the procedure in this order):
--   STEP 1  heads    the expense accounts that carry transactions, each with its three parent groups (g1, g2, g3)
--   STEP 2  moved    the money of each account from tblfintrans: Opening (op) and Current (cu)
--   STEP 3  h        heads + moved joined: every expense account, with 0 where it has no transactions
--   STEP 4  rolled   the amounts added up for the account and for each of its groups (level 4, 3, 2, 1)
--   STEP 5  the final SELECT: the name, the level, Opening, Current, Closing - and the filters of the screen
-- =====================================================================

-- the older version with the same arguments is removed first, so running this file again never fails
DROP PROCEDURE IF EXISTS dbo.sp_rptexpensesum(character varying, boolean, character varying, boolean, character varying, date, date, integer, integer, boolean, boolean, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptexpensesum(
    IN    p_pstrcoid          character varying,   -- the company, e.g. '01'
    IN    p_rdgbranch         boolean,             -- false = One Branch (p_strbrid), true = All Branch
    IN    p_strbrid           character varying,   -- the branch, e.g. 'JD' (NULL when All Branch)
    IN    p_rdgcc             boolean,             -- false = One Cost Center (p_strccid), true = All Cost Center
    IN    p_strccid           character varying,   -- the cost center, e.g. 'JD' (NULL when All Cost Center)
    IN    p_dtpfromdate       date,                -- From Date: Opening is before it, Current starts on it
    IN    p_dtptodate         date,                -- To Date: Current ends on it
    IN    p_intaccountlevel   integer,             -- the Account Level to show, 1 to 4
    IN    p_lkppoststatus     integer,             -- 0 = All, 1 = Posted, 2 = Non Posted
    IN    p_lkpprint0balance  boolean,             -- true = also the accounts that have no amounts
    IN    p_lkpprintacgroup   boolean,             -- true = also the group levels above, indented
    INOUT p_cursor            refcursor)           -- the name of the result cursor; the rows are read from it
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    -- the year of the From Date as text, e.g. '2026' (the old @@strYear): only the rows of this year are counted
    v_stryear varchar(4) := to_char(p_dtpfromdate, 'YYYY');
BEGIN

    -- the procedure does not return rows itself: it OPENs the cursor named in p_cursor on the query below and the
    -- backend reads it with  FETCH ALL FROM "<name>"
    OPEN p_cursor FOR

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 1  heads: the expense accounts that carry transactions, and the family of each
    -- ---------------------------------------------------------------------------------------------------------------
    WITH heads AS (
        SELECT a.faccountid                                         AS a4,   -- the account itself (level 4)
               dbo.getaccountgroupid(p_pstrcoid, a.faccountid, 1)   AS g1,   -- its level 1 group, e.g. 4000000 EXPENSES
               dbo.getaccountgroupid(p_pstrcoid, a.faccountid, 2)   AS g2,   -- its level 2 group, e.g. 3100000
               dbo.getaccountgroupid(p_pstrcoid, a.faccountid, 3)   AS g3    -- its level 3 group, e.g. 3101000
          FROM dbo.tblaccount a
         WHERE a.fcoid = p_pstrcoid                                 -- this company only (ids repeat across companies)
           AND a.fgph  = 'H'                                        -- H = head account (carries transactions); G = group
           AND dbo.isexpense(p_pstrcoid, a.faccountid)               -- expense accounts only
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 2  moved: the money of each account, Opening and Current (expense = debit - credit, no sign change)
    -- ---------------------------------------------------------------------------------------------------------------
    moved AS (
        SELECT t.faccountid,
               -- op = OPENING: the rows dated BEFORE the From Date.  debit - credit is summed and kept as it is (an expense
               -- is a debit balance).  COALESCE(.., 0): no rows = 0, and an empty debit / credit counts as 0
               round(COALESCE(SUM(CASE WHEN t.fdate::date < p_dtpfromdate
                                            THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS op,
               -- cu = CURRENT: the rows dated from the From Date to the To Date (both included)
               round(COALESCE(SUM(CASE WHEN t.fdate::date >= p_dtpfromdate AND t.fdate::date <= p_dtptodate
                                            THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS cu
          FROM dbo.tblfintrans t                                    -- the finance transactions
         WHERE t.fcoid = p_pstrcoid                                 -- this company
           AND t.fyear = v_stryear                                  -- the year of the From Date (Opening is inside it)
           AND t.fdate::date <= p_dtptodate                         -- nothing after the To Date
           AND dbo.isexpense(p_pstrcoid, t.faccountid)               -- expense accounts only
           AND (p_rdgbranch OR t.fbrid = p_strbrid)                 -- All Branch, or only this branch
           AND (p_rdgcc     OR t.fccid = p_strccid)                 -- All Cost Center, or only this cost center
           AND (   p_lkppoststatus = 0                                                  -- All
                OR (p_lkppoststatus = 1 AND COALESCE(t.fpost, false) = true)            -- Posted
                OR (p_lkppoststatus = 2 AND COALESCE(t.fpost, false) = false))          -- Non Posted
         GROUP BY t.faccountid                                      -- one row per account
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 3  h: every expense account with its amounts - 0 and 0 for an account that has no transactions
    -- ---------------------------------------------------------------------------------------------------------------
    h AS (
        SELECT hd.a4, hd.g1, hd.g2, hd.g3,
               COALESCE(m.op, 0) AS op,                             -- Opening of the account
               COALESCE(m.cu, 0) AS cu                              -- Current of the account
          FROM heads hd
          LEFT JOIN moved m ON m.faccountid = hd.a4                 -- LEFT JOIN: keeps the accounts that have no rows
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 4  rolled: the amounts added up for the account itself and for each of its groups
    --         (four small queries stacked with UNION ALL; each adds up by its own column)
    -- ---------------------------------------------------------------------------------------------------------------
    rolled AS (
        -- level 4: the accounts themselves
                  SELECT a4 AS faccountid, SUM(op) AS op, SUM(cu) AS cu FROM h WHERE a4 IS NOT NULL GROUP BY a4
        -- level 3: the sum of the accounts under each level-3 group
        UNION ALL SELECT g3,               SUM(op),       SUM(cu)       FROM h WHERE g3 IS NOT NULL GROUP BY g3
        -- level 2: the sum of the accounts under each level-2 group
        UNION ALL SELECT g2,               SUM(op),       SUM(cu)       FROM h WHERE g2 IS NOT NULL GROUP BY g2
        -- level 1: the sum of the accounts under each level-1 group
        UNION ALL SELECT g1,               SUM(op),       SUM(cu)       FROM h WHERE g1 IS NOT NULL GROUP BY g1
    )

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 5  the rows that are returned
    -- ---------------------------------------------------------------------------------------------------------------
    SELECT r.faccountid::varchar                                    AS faccountid,     -- the account id
           -- the name; with Print A/c Group on, 4 / 8 / 12 spaces in front for level 2 / 3 / 4 (the indent)
           (CASE WHEN p_lkpprintacgroup
                 THEN repeat(' ', CASE a.faccountlevel WHEN 2 THEN 4 WHEN 3 THEN 8 WHEN 4 THEN 12 ELSE 0 END)
                 ELSE '' END || a.faccountname)::varchar            AS faccountname,
           a.faccountlevel::integer                                 AS faccountlevel,  -- 1 to 4 (the report colours by it)
           r.op::numeric(18,2)                                      AS fop_drcr,       -- Opening
           r.cu::numeric(18,2)                                      AS fcu_drcr,       -- Current
           (r.op + r.cu)::numeric(18,2)                             AS fcl_drcr        -- Closing = Opening + Current
      FROM rolled r
      JOIN dbo.tblaccount a                                         -- for the name and the level
        ON a.fcoid = p_pstrcoid
       AND a.faccountid = r.faccountid
     -- Print 0 Balance: leave out the rows whose Opening and Current are both 0, unless it is on
     WHERE (p_lkpprint0balance OR NOT (r.op = 0 AND r.cu = 0))
       -- Account Level: only the chosen level, or (Print A/c Group) every level up to it
       AND (   (NOT p_lkpprintacgroup AND a.faccountlevel =  p_intaccountlevel)
            OR (    p_lkpprintacgroup AND a.faccountlevel <= p_intaccountlevel))
     ORDER BY r.faccountid;                                         -- a group comes before the accounts under it

END;
$procedure$;
