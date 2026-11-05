-- =====================================================================
-- dbo.sp_rptrvpvsum   (Receipt / Payment Summary report)
--
-- Postgres port of the SQL Server SP_rptRVPVSum. It lists the VOUCHERS of one document type (Bank Receipt, Cash
-- Receipt, Bank Payment, Cash Payment, ...) between two dates - one line per voucher:
--     fdocno                 the entry number
--     fdate                  the date
--     fcbaccountname         the Cash / Bank account of the voucher (name of fcbaccountid)
--     freceivedfrompaidto    Received From / Paid To
--     famt                   the amount of the voucher
--
-- WHAT IT DOES
--   1. takes the tblfintrans rows of the company, the YEAR of the From Date and the chosen document type;
--   2. leaves out the GENERATED lines of a voucher (see the note below) so a voucher is counted once;
--   3. applies the filters of the screen: post status, branch (one / selected / all), account (one / all), the dates;
--   4. adds the lines of each voucher up (one row per branch + entry number): the amount is  sum(debit + credit);
--   5. adds the name of the Cash / Bank account and returns the rows ordered by branch and entry number.
--
-- THE GENERATED LINE (important):
--   A voucher is saved as two kinds of lines in tblfintrans:
--       forigin 'UI'    the line(s) the user typed: the account(s) of the voucher
--       forigin 'UIG'   the line the system generates for the Cash / Bank account (the other side)
--   The SQL Server procedure left out forigin = 'G' (its generated line). In our table the generated line is 'UIG', so
--   a test of  forigin <> 'G'  would keep BOTH lines and every amount would be doubled (a 1,000.00 receipt would show
--   2,000.00). So the generated lines 'G' and 'UIG' are both left out here.
--
-- THE ARGUMENTS (the names are the element ids of the screen; the radios are 0 / 1 / 2 or booleans, the first choice first)
--   p_pstrcoid        company
--   p_rdgbranch       0 One Branch (p_lkpbranch), 1 Selected Branch (p_chkbranch), 2 All Branch
--   p_lkpbranch       the branch (One Branch)
--   p_chkbranch       the ticked branches (Selected Branch)
--   p_lkpdocument     the document type: 'BR', 'CR', 'BP', 'CP', ...
--   p_rdgaccount      false One Account (p_lkpaccountid), true All Account
--   p_lkpaccountid    the account (One Account). It is the account of the voucher's own line (not the Cash / Bank
--                     account), so with One Account the amount is only that account's part of the voucher
--   p_dtpfromdate     From Date
--   p_dtptodate       To Date
--   p_lkppoststatus   0 All, 1 Posted, 2 Non Posted (the same as the other reports; the old SP: 0 Non Posted, 1 Posted,
--                     else all)
--   p_cursor          INOUT refcursor: the rows - fbrid, fdocno, fdate, freceivedfrompaidto, fcbaccountid,
--                     fcbaccountname, famt
--
-- Differences from the SQL Server procedure - forced by our tables, or for safety:
--   * no temporary table and no dynamic SQL: one query. The selected branches come in as an array (p_chkbranch), not as
--     an SQL text, so nothing typed on the screen is ever put into the SQL;
--   * tblfintrans has no fintdocno: the lines are ordered by the entry number text (the numbers have a fixed width);
--   * the generated line is 'UIG' as well as 'G' (see above);
--   * the tblaccount join is by company too (the table has the same account id in more than one company).
--
-- Called from the backend:  Backend/services/Finance/Report/rptRVPVSumService.ts  (CALL and FETCH in one transaction)
--   CALL dbo.sp_rptrvpvsum('01', 0, 'JD', NULL, 'BR', true, NULL, '2026-10-01', '2026-10-31', 1, 'cur_rptrvpvsum');
-- =====================================================================

-- the older version with the same arguments is removed first, so running this file again never fails
DROP PROCEDURE IF EXISTS dbo.sp_rptrvpvsum(character varying, integer, character varying, character varying[], character varying, boolean, character varying, date, date, integer, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptrvpvsum(
    IN    p_pstrcoid        character varying,     -- the company, e.g. '01'
    IN    p_rdgbranch       integer,               -- 0 = One Branch, 1 = Selected Branch, 2 = All Branch
    IN    p_lkpbranch       character varying,     -- the branch, e.g. 'JD' (One Branch; NULL otherwise)
    IN    p_chkbranch       character varying[],   -- the ticked branches, e.g. '{JD,MC}' (Selected Branch; NULL otherwise)
    IN    p_lkpdocument     character varying,     -- the document type, e.g. 'BR'
    IN    p_rdgaccount      boolean,               -- false = One Account (p_lkpaccountid), true = All Account
    IN    p_lkpaccountid    character varying,     -- the account, e.g. '1102003' (One Account; NULL when All Account)
    IN    p_dtpfromdate     date,                  -- From Date
    IN    p_dtptodate       date,                  -- To Date
    IN    p_lkppoststatus   integer,               -- 0 = All, 1 = Posted, 2 = Non Posted
    INOUT p_cursor          refcursor)             -- the name of the result cursor; the rows are read from it
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    -- the year of the From Date as text, e.g. '2026' (the old @@strFromYear): only the rows of this year are listed
    v_stryear varchar(4) := to_char(p_dtpfromdate, 'YYYY');
BEGIN

    -- the procedure does not return rows itself: it OPENs the cursor named in p_cursor on the query below and the
    -- backend reads it with  FETCH ALL FROM "<name>"
    OPEN p_cursor FOR

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 1  docs: one row per voucher (branch + entry number) with its amount
    -- ---------------------------------------------------------------------------------------------------------------
    WITH docs AS (
        SELECT t.fbrid,                                                            -- the branch
               t.fdocno,                                                           -- the entry number
               MAX(t.fdate)::date                       AS fdate,                  -- the date of the voucher
               MAX(t.freceivedfrompaidto)               AS freceivedfrompaidto,    -- Received From / Paid To
               MAX(t.fcbaccountid)                      AS fcbaccountid,           -- the Cash / Bank account
               -- the amount: debit + credit of the lines kept (the old Sum(fDebit + fCredit)); 2 decimals as numeric(18,2)
               ROUND(SUM(COALESCE(t.fdebit, 0) + COALESCE(t.fcredit, 0)), 2) AS famt
          FROM dbo.tblfintrans t
         WHERE t.fcoid    = p_pstrcoid                                             -- this company
           AND t.fyear    = v_stryear                                              -- the year of the From Date
           AND t.fdoctype = p_lkpdocument                                          -- the chosen document type
           -- the generated line of a voucher is left out ('G' as the old procedure, and our 'UIG'): see the header
           AND COALESCE(t.forigin, '') NOT IN ('G', 'UIG')
           -- Post Status: 0 All, 1 Posted, 2 Non Posted
           AND (   p_lkppoststatus = 0
                OR (p_lkppoststatus = 1 AND COALESCE(t.fpost, false) = true)
                OR (p_lkppoststatus = 2 AND COALESCE(t.fpost, false) = false))
           -- Branch: One Branch, the Selected Branches, or All Branch (no filter)
           AND (   p_rdgbranch = 2
                OR (p_rdgbranch = 0 AND t.fbrid = p_lkpbranch)
                OR (p_rdgbranch = 1 AND t.fbrid = ANY (p_chkbranch)))
           -- Account: All Account, or only the lines of this account
           AND (p_rdgaccount OR t.faccountid = p_lkpaccountid)
           AND t.fdate::date >= p_dtpfromdate                                      -- from the From Date (included)
           AND t.fdate::date <= p_dtptodate                                        -- to the To Date (included)
         GROUP BY t.fbrid, t.fdocno                                                -- one row per voucher
    )

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 2  the rows that are returned: the vouchers with the name of their Cash / Bank account
    -- ---------------------------------------------------------------------------------------------------------------
    SELECT d.fbrid::varchar                 AS fbrid,
           d.fdocno::varchar                AS fdocno,
           d.fdate                          AS fdate,
           d.freceivedfrompaidto::varchar   AS freceivedfrompaidto,
           d.fcbaccountid::varchar          AS fcbaccountid,
           a.faccountname::varchar          AS fcbaccountname,                     -- NULL when the voucher has no Cash / Bank account
           d.famt::numeric(18,2)            AS famt
      FROM docs d
      LEFT JOIN dbo.tblaccount a                                                   -- LEFT JOIN: a voucher without a Cash / Bank account is still listed
        ON a.fcoid = p_pstrcoid
       AND a.faccountid = d.fcbaccountid
     ORDER BY d.fbrid, d.fdocno;                                                   -- by branch, then by entry number

END;
$procedure$;
