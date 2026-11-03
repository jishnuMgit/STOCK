-- =====================================================================
-- dbo.sp_rptexpensesum_m   (Expense Summary report - month by month, the "Up to Month" report)
--
-- Postgres port of the SQL Server SP_rptExpenseSum_M. For every EXPENSE account (dbo.isexpense) it gives the expense
-- of each month, January to December, between the From Date and the To Date:
--     fjan_drcr ... fdec_drcr   the expense of the month: debit - credit (the old  sum(debit - credit), no sign change)
--     fjantojun                 January + ... + June
--     fjantodec                 January to December (the whole year)
-- (the old procedure added July to December first and then added January to June to it, so its fJanToDec is the
--  whole year; the Jul-Dec page of the report prints it as the Total.)
--
-- WHAT IT DOES
--   1. takes the HEAD accounts (tblaccount.fgph = 'H') that are expense accounts, so an account with no transaction
--      is there too (shown when Print 0 Balance is on);
--   2. adds up their tblfintrans rows per month, with the filters of the screen: branch, cost center, post status;
--   3. rolls the months up to the account groups: level 3, 2 and 1 (dbo.getaccountgroupid);
--   4. leaves out the accounts whose fjantojun and fjantodec are both 0 (unless Print 0 Balance);
--   5. returns the accounts of the chosen Account Level - or, with Print A/c Group, every level up to it, the names
--      indented by level (the old 4 / 8 / 12 spaces for level 2 / 3 / 4).
--
-- THE ARGUMENTS: the same as dbo.sp_rptexpensesum (see it); p_cursor is an INOUT refcursor.
--
-- Differences from the SQL Server procedure - forced by our tables, or for safety:
--   * no temporary tables and no dynamic SQL: one query;
--   * the From Date is INCLUDED (fdate >= From Date). The old one used  fDate > From Date, which left out the
--     transactions of the first day of the period (and the screen sends 1 January, so every 1 January cost was lost) -
--     the old Expense Summary (Opening / Current) includes it, and so does the Income Summary, so this does;
--   * every tblaccount join is by company too;
--   * a group row that has no account id is left out (the old one made a row with no id and no name);
--   * the amounts are rounded to 2 decimals per account and month, as the old numeric(18,2) columns did.
--
-- Called from the backend:  Backend/services/Finance/Report/rptExpenseSumService.ts  (CALL and FETCH in one transaction)
--   CALL dbo.sp_rptexpensesum_m('01', false, 'JD', true, NULL, '2026-01-01', '2026-10-31', 4, 1, false, true, 'cur_rptexpensesum_m');
--
-- HOW THE QUERY IS BUILT (read the comments inside the procedure in this order):
--   STEP 1  heads     the expense accounts that carry transactions, each with its three parent groups (g1, g2, g3)
--   STEP 2  moved     the money of each account from tblfintrans, one column per month (m1 = January ... m12 = December)
--   STEP 3  h         heads + moved joined: every expense account, with 0 where it has no transactions
--   STEP 4  leveled   the same rows written once for each level (4, 3, 2, 1), under the id of that level
--   STEP 5  rolled    the months added up for each id of each level
--   STEP 6  totals    + fjantojun (Jan..Jun) and fjantodec (the whole year)
--   STEP 7  the final SELECT: the name, the level, the 12 months, the two totals - and the filters of the screen
-- =====================================================================

-- the older version with the same arguments is removed first, so running this file again never fails
DROP PROCEDURE IF EXISTS dbo.sp_rptexpensesum_m(character varying, boolean, character varying, boolean, character varying, date, date, integer, integer, boolean, boolean, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptexpensesum_m(
    IN    p_pstrcoid          character varying,   -- the company, e.g. '01'
    IN    p_rdgbranch         boolean,             -- false = One Branch (p_strbrid), true = All Branch
    IN    p_strbrid           character varying,   -- the branch, e.g. 'JD' (NULL when All Branch)
    IN    p_rdgcc             boolean,             -- false = One Cost Center (p_strccid), true = All Cost Center
    IN    p_strccid           character varying,   -- the cost center, e.g. 'JD' (NULL when All Cost Center)
    IN    p_dtpfromdate       date,                -- From Date: the 1st of January of the year (the screen sends it)
    IN    p_dtptodate         date,                -- To Date: the last day of the chosen month
    IN    p_intaccountlevel   integer,             -- the Account Level to show, 1 to 4
    IN    p_lkppoststatus     integer,             -- 0 = All, 1 = Posted, 2 = Non Posted
    IN    p_lkpprint0balance  boolean,             -- true = also the accounts that have no amounts
    IN    p_lkpprintacgroup   boolean,             -- true = also the group levels above, indented
    INOUT p_cursor            refcursor)           -- the name of the result cursor; the rows are read from it
 LANGUAGE plpgsql
AS $procedure$
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
               dbo.getaccountgroupid(p_pstrcoid, a.faccountid, 2)   AS g2,   -- its level 2 group
               dbo.getaccountgroupid(p_pstrcoid, a.faccountid, 3)   AS g3    -- its level 3 group
          FROM dbo.tblaccount a
         WHERE a.fcoid = p_pstrcoid                                 -- this company only (ids repeat across companies)
           AND a.fgph  = 'H'                                        -- H = head account (carries transactions); G = group
           AND dbo.isexpense(p_pstrcoid, a.faccountid)               -- expense accounts only
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 2  moved: the expense of each month of each account (expense = debit - credit)
    --         Every column m1 .. m12 is the same formula for one month: add (debit - credit) of the rows of that month,
    --         keep it as it is (no sign change), no rows = 0, 2 decimals.
    --           m1 = January   m2 = February  m3 = March      m4 = April
    --           m5 = May       m6 = June      m7 = July       m8 = August
    --           m9 = September m10 = October  m11 = November  m12 = December
    -- ---------------------------------------------------------------------------------------------------------------
    moved AS (
        SELECT t.faccountid,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  1 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m1,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  2 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m2,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  3 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m3,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  4 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m4,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  5 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m5,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  6 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m6,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  7 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m7,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  8 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m8,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) =  9 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m9,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) = 10 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m10,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) = 11 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m11,
               round(COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM t.fdate) = 12 THEN COALESCE(t.fdebit, 0) - COALESCE(t.fcredit, 0) END), 0), 2) AS m12
          FROM dbo.tblfintrans t                                    -- the finance transactions
         WHERE t.fcoid = p_pstrcoid                                 -- this company
           AND t.fdate::date >= p_dtpfromdate                       -- from the From Date (included)
           AND t.fdate::date <= p_dtptodate                         -- to the To Date (included)
           AND dbo.isexpense(p_pstrcoid, t.faccountid)               -- expense accounts only
           AND (p_rdgbranch OR t.fbrid = p_strbrid)                 -- All Branch, or only this branch
           AND (p_rdgcc     OR t.fccid = p_strccid)                 -- All Cost Center, or only this cost center
           AND (   p_lkppoststatus = 0                                                  -- All
                OR (p_lkppoststatus = 1 AND COALESCE(t.fpost, false) = true)            -- Posted
                OR (p_lkppoststatus = 2 AND COALESCE(t.fpost, false) = false))          -- Non Posted
         GROUP BY t.faccountid                                      -- one row per account
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 3  h: every expense account with its 12 months - 0 for an account that has no transactions
    -- ---------------------------------------------------------------------------------------------------------------
    h AS (
        SELECT hd.a4, hd.g1, hd.g2, hd.g3,
               COALESCE(m.m1, 0) AS m1,   COALESCE(m.m2, 0) AS m2,   COALESCE(m.m3, 0) AS m3,
               COALESCE(m.m4, 0) AS m4,   COALESCE(m.m5, 0) AS m5,   COALESCE(m.m6, 0) AS m6,
               COALESCE(m.m7, 0) AS m7,   COALESCE(m.m8, 0) AS m8,   COALESCE(m.m9, 0) AS m9,
               COALESCE(m.m10, 0) AS m10, COALESCE(m.m11, 0) AS m11, COALESCE(m.m12, 0) AS m12
          FROM heads hd
          LEFT JOIN moved m ON m.faccountid = hd.a4                 -- LEFT JOIN: keeps the accounts that have no rows
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 4  leveled: the rows of h written four times, each time under the id of one level:
    --           lv 4 = the account itself, lv 3 = its level-3 group, lv 2 = its level-2 group, lv 1 = its level-1 group
    --         (so the next step can add up each level on its own)
    -- ---------------------------------------------------------------------------------------------------------------
    leveled AS (
                  SELECT 4 AS lv, a4 AS id, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12 FROM h WHERE a4 IS NOT NULL
        UNION ALL SELECT 3,       g3,       m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12 FROM h WHERE g3 IS NOT NULL
        UNION ALL SELECT 2,       g2,       m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12 FROM h WHERE g2 IS NOT NULL
        UNION ALL SELECT 1,       g1,       m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12 FROM h WHERE g1 IS NOT NULL
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 5  rolled: each month added up for each id of each level
    --         (a group shows the sum of all the accounts under it)
    -- ---------------------------------------------------------------------------------------------------------------
    rolled AS (
        SELECT l.id AS faccountid,
               SUM(m1) AS m1, SUM(m2) AS m2, SUM(m3) AS m3, SUM(m4) AS m4, SUM(m5) AS m5, SUM(m6) AS m6,
               SUM(m7) AS m7, SUM(m8) AS m8, SUM(m9) AS m9, SUM(m10) AS m10, SUM(m11) AS m11, SUM(m12) AS m12
          FROM leveled l
         GROUP BY l.lv, l.id
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 6  totals: January to June, and the whole year
    -- ---------------------------------------------------------------------------------------------------------------
    totals AS (
        SELECT r.*,
               (r.m1 + r.m2 + r.m3 + r.m4 + r.m5 + r.m6)                                                  AS jantojun,   -- Jan..Jun
               (r.m1 + r.m2 + r.m3 + r.m4 + r.m5 + r.m6 + r.m7 + r.m8 + r.m9 + r.m10 + r.m11 + r.m12)     AS jantodec    -- the year
          FROM rolled r
    )

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 7  the rows that are returned
    -- ---------------------------------------------------------------------------------------------------------------
    SELECT r.faccountid::varchar                                    AS faccountid,     -- the account id
           -- the name; with Print A/c Group on, 4 / 8 / 12 spaces in front for level 2 / 3 / 4 (the indent)
           (CASE WHEN p_lkpprintacgroup
                 THEN repeat(' ', CASE a.faccountlevel WHEN 2 THEN 4 WHEN 3 THEN 8 WHEN 4 THEN 12 ELSE 0 END)
                 ELSE '' END || a.faccountname)::varchar            AS faccountname,
           a.faccountlevel::integer                                 AS faccountlevel,  -- 1 to 4 (the report colours by it)
           -- the twelve months, January to December
           r.m1::numeric(18,2)  AS fjan_drcr, r.m2::numeric(18,2)  AS ffeb_drcr, r.m3::numeric(18,2)  AS fmar_drcr,
           r.m4::numeric(18,2)  AS fapr_drcr, r.m5::numeric(18,2)  AS fmay_drcr, r.m6::numeric(18,2)  AS fjun_drcr,
           r.m7::numeric(18,2)  AS fjul_drcr, r.m8::numeric(18,2)  AS faug_drcr, r.m9::numeric(18,2)  AS fsep_drcr,
           r.m10::numeric(18,2) AS foct_drcr, r.m11::numeric(18,2) AS fnov_drcr, r.m12::numeric(18,2) AS fdec_drcr,
           r.jantojun::numeric(18,2)                                AS fjantojun,      -- January to June
           r.jantodec::numeric(18,2)                                AS fjantodec       -- January to December
      FROM totals r
      JOIN dbo.tblaccount a                                         -- for the name and the level
        ON a.fcoid = p_pstrcoid
       AND a.faccountid = r.faccountid
     -- Print 0 Balance: leave out the rows whose Jan..Jun and whole-year totals are both 0, unless it is on
     WHERE (p_lkpprint0balance OR NOT (r.jantojun = 0 AND r.jantodec = 0))
       -- Account Level: only the chosen level, or (Print A/c Group) every level up to it
       AND (   (NOT p_lkpprintacgroup AND a.faccountlevel =  p_intaccountlevel)
            OR (    p_lkpprintacgroup AND a.faccountlevel <= p_intaccountlevel))
     ORDER BY r.faccountid;                                         -- a group comes before the accounts under it

END;
$procedure$;
