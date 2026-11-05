-- PROCEDURE: dbo.sp_pagematchenquirydocuments(character varying, character varying, character varying, character varying, character varying, refcursor)

-- The older version (p_pstruserid was the 3rd argument) is dropped first: CREATE OR REPLACE cannot rename or move the
-- arguments of a procedure that is already installed. Running this file again never fails.
DROP PROCEDURE IF EXISTS dbo.sp_pagematchenquirydocuments(character varying, character varying, character varying, character varying, character varying, refcursor);

-- =====================================================================
-- dbo.sp_pagematchenquirydocuments   (Match Enquiry: the Document No. list)
--
-- The documents of one customer (and division) that are posted and have matched lines, for the Document No. box of the
-- Match Enquiry screen - one row for each document (branch + document type + document no.), of any document type, of the
-- branches the logged-in user has a right to, the oldest first:
--     fbrid         the branch of the document
--     fdoctype      the document type, e.g. 'BR'
--     fdocno        the document number, e.g. 'JD-26000002'
--     fdoctypeno    the type and the number as one text, e.g. 'BR JD-26000002' (tblarap.fdoctypeno; some documents,
--                   e.g. the sales invoices, have none: the backend shows the type and the number then)
--     fdate         the date, dd/mm/yyyy
--     fdescription  the description
--     fdebit        the debit of the matched lines of the document
--     fcredit       the credit of the matched lines of the document
--
-- It replaces the old Search button (dbo.sp_getmatchfindocuments, mode GM, one document type at a time): the screen has
-- no Document Type box now, so every type is listed and each row carries its own type.
--
-- THE ARGUMENTS (the names are the element ids of the screen)
--   p_pstrcoid        company
--   p_pstryear        the logged-in financial year, e.g. '2026' (the documents of this year)
--   p_lkpcsaccountid   the customer account (Customer ID: lkpCsAccountID)
--   p_lkpdivision     the division (Division); NULL or '' = every division of the customer
--   p_pstruserid      the logged-in user: only the documents of the branches this user has a right to are listed
--   p_result_cursor   INOUT refcursor: the rows are read from it
--
-- Called from the backend:  Backend/controller/Finance/Transaction/MatchEnquiryController.ts  (CALL and FETCH in one transaction)
--   CALL dbo.sp_pagematchenquirydocuments('01', '2026', '60006', '01', 'ADMIN', 'cur_matchenquirydocuments');
-- =====================================================================

CREATE OR REPLACE PROCEDURE dbo.sp_pagematchenquirydocuments(
	IN p_pstrcoid character varying,
	IN p_pstryear character varying DEFAULT '0'::character varying,
	IN p_lkpcsaccountid character varying DEFAULT NULL::character varying,
	IN p_lkpdivision character varying DEFAULT NULL::character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	INOUT p_result_cursor refcursor DEFAULT 'cur_matchenquirydocuments'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$

BEGIN

    /* the procedure does not return rows itself: it OPENs the cursor named in p_result_cursor and the backend reads it
       with  FETCH ALL FROM "<name>" */
    OPEN p_result_cursor FOR

    SELECT
        a.fbrid,
        a.fdoctype,
        a.fdocno,
        MAX(a.fdoctypeno)                              AS fdoctypeno,     -- 'BR JD-26000002'
        TO_CHAR(MIN(a.fdate), 'DD/MM/YYYY')            AS fdate,
        MAX(a.fdescription)                            AS fdescription,
        SUM(COALESCE(a.fdebit, 0))                     AS fdebit,
        SUM(COALESCE(a.fcredit, 0))                    AS fcredit

    FROM dbo.tblarap a

    WHERE a.fcoid = p_pstrcoid
      AND a.fyear = p_pstryear                                          -- the logged-in year
      AND a.fcsaccountid = p_lkpcsaccountid                              -- this customer
      AND a.fpost = TRUE                                                -- posted documents only
      AND a.fmatch = TRUE                                               -- the lines that are matched
      AND dbo.userbranches(p_pstrcoid, p_pstruserid, a.fbrid)           -- only the branches the user has a right to
      AND (
            p_lkpdivision IS NULL
            OR TRIM(p_lkpdivision) = ''
            OR COALESCE(a.fdivid, '') = p_lkpdivision                   -- this division, or every division
          )

    GROUP BY a.fbrid, a.fdoctype, a.fdocno                              -- one row for each document

    ORDER BY MIN(a.fdate), a.fdocno;                                    -- by date (the real date, oldest first), then by document no.

END;

$BODY$;
ALTER PROCEDURE dbo.sp_pagematchenquirydocuments(character varying, character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;
