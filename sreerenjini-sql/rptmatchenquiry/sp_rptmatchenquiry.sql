-- =====================================================================
-- dbo.sp_rptmatchenquiry   (Match Enquiry print: a document and the documents matched to it)
--
-- Postgres port of the SQL Server SP_rptMatchEnquiry, made to give what the printed report (the old
-- rptMatchEnquiryPrint) needs. For ONE document (branch + document type + document no.) it lists:
--     P rows   the document itself: its lines in tblarap that are matched (fmatch = true)
--     C rows   the documents matched to it: tblmatchrecords, with the description of the matched line from tblarap
-- Every row has the customer / supplier account (fcsaccountid) it belongs to: the report prints one block per account,
-- with a total of the debit and the credit.
--
-- WHAT IT DOES
--   1. P rows: the document's own matched lines (tblarap, fmatch = true);
--   2. C rows: the matched documents of tblmatchrecords. The debit and the credit are SWAPPED (the old
--      ISNULL(fCredit) into the debit and ISNULL(fDebit) into the credit): a matched document is shown from the point of
--      view of the document it is matched to - a receipt's credit is matched by an invoice's debit - so the debit and the
--      credit of a block add up to the same amount when everything is matched;
--   3. adds the name of the account (tblaccount) to every row;
--   4. returns the rows by account, then P before C, then year, branch, document type and number.
--
-- THE ARGUMENTS (the names are the element ids of the screen)
--   p_pstrcoid       company
--   p_pstryear       the financial year of the document, e.g. '2026'
--   p_lkpbranch      the branch of the document
--   p_lkpdoctype    the document type: 'BR', 'CR', ...
--   p_lkpdocno      the document number
--   p_cursor         INOUT refcursor: the rows - fpc, fbrid, fdoctype, fdocno, fdate, fcsaccountid, fcsaccountname,
--                    fdescription, fdebit, fcredit, fmatchapplydate
--
-- Differences from the SQL Server procedure - forced by our tables, or for safety:
--   * the SQL Server procedure and its report did not agree (the report reads the account, its name, the branch name and
--     the document; the procedure returned none of them): this one returns what the report reads;
--   * no temporary table: one query;
--   * the description of a matched line is the first line (by fslnosub) of the tblarap row, so a line that has sub lines
--     is not listed more than once;
--   * every tblaccount join is by company too (the table has the same account id in more than one company).
--
-- Called from the backend:  Backend/services/Finance/Transaction/rptMatchEnquiryService.ts  (CALL and FETCH in one transaction)
--   CALL dbo.sp_rptmatchenquiry('01', '2026', 'JD', 'BR', 'JD-26000010', 'cur_rptmatchenquiry');
-- =====================================================================

-- the older version with the same arguments is removed first, so running this file again never fails
DROP PROCEDURE IF EXISTS dbo.sp_rptmatchenquiry(character varying, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_rptmatchenquiry(
    IN    p_pstrcoid      character varying,   -- the company, e.g. '01'
    IN    p_pstryear      character varying,   -- the financial year of the document, e.g. '2026'
    IN    p_lkpbranch     character varying,   -- the branch of the document, e.g. 'JD'
    IN    p_lkpdoctype   character varying,   -- the document type, e.g. 'BR'
    IN    p_lkpdocno     character varying,   -- the document number, e.g. 'JD-26000010'
    INOUT p_cursor        refcursor)           -- the name of the result cursor; the rows are read from it
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    -- the procedure does not return rows itself: it OPENs the cursor named in p_cursor on the query below and the
    -- backend reads it with  FETCH ALL FROM "<name>"
    OPEN p_cursor FOR

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 1  parent: the document itself - its matched lines (P)
    -- ---------------------------------------------------------------------------------------------------------------
    WITH parent AS (
        SELECT 'P'::varchar                  AS fpc,
               a.fyear::varchar              AS fyear,
               a.fbrid                       AS fbrid,
               a.fdoctype                    AS fdoctype,
               a.fdocno                      AS fdocno,
               a.fdate                       AS fdate,
               a.fcsaccountid                AS fcsaccountid,
               a.fdescription                AS fdescription,
               COALESCE(a.fdebit, 0)         AS fdebit,
               COALESCE(a.fcredit, 0)        AS fcredit,
               a.fmatchapplydate             AS fmatchapplydate
          FROM dbo.tblarap a
         WHERE a.fcoid    = p_pstrcoid
           AND a.fyear    = p_pstryear
           AND a.fbrid    = p_lkpbranch
           AND a.fdoctype = p_lkpdoctype
           AND a.fdocno   = p_lkpdocno
           AND a.fmatch   = true                                 -- only the lines that are matched
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 2  child: the documents matched to it (C), debit and credit swapped
    -- ---------------------------------------------------------------------------------------------------------------
    child AS (
        SELECT 'C'::varchar                  AS fpc,
               m.fcyear::varchar             AS fyear,
               m.fcbrid                      AS fbrid,
               m.fcdoctype                   AS fdoctype,
               m.fcdocno                     AS fdocno,
               m.fdate                       AS fdate,
               m.fcsaccountid                AS fcsaccountid,
               b.fdescription                AS fdescription,    -- the description of the matched line
               COALESCE(m.fcredit, 0)        AS fdebit,          -- SWAPPED: the matched document's credit is shown as debit
               COALESCE(m.fdebit, 0)         AS fcredit,         -- and its debit as credit
               m.fmatchapplydate             AS fmatchapplydate
          FROM dbo.tblmatchrecords m
          LEFT JOIN LATERAL (
                SELECT x.fdescription
                  FROM dbo.tblarap x
                 WHERE x.fcoid    = m.fcoid
                   AND x.fyear    = m.fcyear
                   AND x.fbrid    = m.fcbrid
                   AND x.fdoctype = m.fcdoctype
                   AND x.fdocno   = m.fcdocno
                   AND x.fslno    = m.fcslno
                 ORDER BY x.fslnosub
                 LIMIT 1                                          -- one description per matched line
          ) b ON true
         WHERE m.fcoid     = p_pstrcoid
           AND m.fpyear    = p_pstryear
           AND m.fpbrid    = p_lkpbranch
           AND m.fpdoctype = p_lkpdoctype
           AND m.fpdocno   = p_lkpdocno
    ),

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 3  both together
    -- ---------------------------------------------------------------------------------------------------------------
    allrows AS (
        SELECT * FROM parent
        UNION ALL
        SELECT * FROM child
    )

    -- ---------------------------------------------------------------------------------------------------------------
    -- STEP 4  the rows that are returned: with the name of the account, by account, P before C, then year / branch / type / no.
    -- ---------------------------------------------------------------------------------------------------------------
    SELECT r.fpc::varchar                    AS fpc,
           r.fbrid::varchar                  AS fbrid,
           r.fdoctype::varchar               AS fdoctype,
           r.fdocno::varchar                 AS fdocno,
           r.fdate::date                     AS fdate,
           r.fcsaccountid::varchar           AS fcsaccountid,
           a.faccountname::varchar           AS fcsaccountname,  -- NULL when the account is not in tblaccount
           r.fdescription::varchar           AS fdescription,
           r.fdebit::numeric(18,2)           AS fdebit,
           r.fcredit::numeric(18,2)          AS fcredit,
           r.fmatchapplydate::date           AS fmatchapplydate
      FROM allrows r
      LEFT JOIN dbo.tblaccount a
        ON a.fcoid = p_pstrcoid
       AND a.faccountid = r.fcsaccountid
     ORDER BY r.fcsaccountid, r.fpc DESC, r.fyear, r.fbrid, r.fdoctype, r.fdocno;
     -- fpc DESC: 'P' (the document) comes before 'C' (the matched documents), as the old report

END;
$procedure$;
