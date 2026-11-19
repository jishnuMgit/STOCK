-- =====================================================================
-- dbo.sp_pagebeginningstockprint   (Beginning Stock - Print)
--
-- The old SP_rptStDocPrint, in the same shape, named sp_page<form>:
--   * p_strdoc     the document type (only 'BS' is active here; the other
--                  document types of the old list are kept as a comment)
--   * p_pstrcoid   the company
--   * p_lkpbranch  the branch
--   * the lines of the branch's document are read with a plain query (the old
--     one built the query as text and ran it with sp_executesql), ordered by the
--     document number and Sl.#
--
-- What is commented out (not used for the Beginning Stock print - switch it on
-- when it is needed):
--   1. the other document types in the IN list ('PI','PR','SIC' ... 'IC')
--   2. the account / customer / from-branch / to-branch joins and columns:
--      tblstocktrans has no faccountid, fcustomerid, faddress1, ffrombrid,
--      ftobrid, fintdocno here (for BG they were always empty)
--   3. the DLN and DLR parts (tbldo, tbldeliverynotefooter do not exist here)
--
-- The company name is NOT returned: the old report got it from the application
-- (CoName); the backend reads it from tblcompany.
--
-- The document is found with real parameters - there is no filter text joined into
-- the query (the old p_strfilter was), so nothing has to be quoted and nothing a
-- user types can change the query.
--
-- The signature changed (the filter text became these arguments), so the old
-- procedure is dropped first.
--
-- Test:
--   BEGIN;
--   CALL dbo.sp_pagebeginningstockprint('BS', '01', 'JD', p_result_cursor => 'c1');
--   FETCH ALL IN c1;
--   COMMIT;
-- =====================================================================

DROP PROCEDURE IF EXISTS dbo.sp_pagebeginningstockprint(character varying, text, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagebeginningstockprint(
    IN    p_strdoc           character varying,
    IN    p_pstrcoid         character varying,
    IN    p_lkpbranch        character varying,
    INOUT p_result_cursor    refcursor DEFAULT 'cur_pagebeginningstockprint'::refcursor)
LANGUAGE plpgsql
AS $procedure$
BEGIN

    -- IF p_strdoc IN ('PI','PR','SIC','SIR','SRC','SRR','ST','STI','ADJ','BS','DM','ASM','IC') THEN
    IF p_strdoc = 'BS' THEN

        OPEN p_result_cursor FOR
            SELECT a.*, b.fitemname, b.fpacking,
                    -- c.fAccountName,
                    d.fbrname,
                    -- e.fBrName AS fFromBrName,
                    -- f.fBrName AS fToBrName,
                    g.fstaffname,
                    -- h.fBrName AS fStBrName,
                    -- a.fCustomerID, c.fAccountName AS fCustomerName,
                    -- c.fAccountName AS fSupplierName,
                    b.fsupplieritemid
                    -- c.fContact1 AS fContact, a.fAddress1 AS fAddress
             FROM dbo.tblstocktrans a
             LEFT OUTER JOIN dbo.tblitemhd b
                    ON a.fitemid = b.fitemid AND a.fcoid = b.fcoid
             -- LEFT OUTER JOIN dbo.tblaccount c
             --        ON a.fAccountID = c.fAccountID AND a.fCoID = c.fCoID
             LEFT OUTER JOIN dbo.tblbranch d
                    ON a.fcoid = d.fcoid AND a.fbrid = d.fbrid
             -- LEFT OUTER JOIN dbo.tblbranch e
             --        ON a.fCoID = e.fCoID AND a.fFromBrID = e.fBrID
             -- LEFT OUTER JOIN dbo.tblbranch f
             --        ON a.fCoID = f.fCoID AND a.fToBrID = f.fBrID
             LEFT OUTER JOIN dbo.tblstaff g
                    ON a.fcoid = g.fcoid AND a.fstaffid = g.fstaffid
             -- LEFT OUTER JOIN dbo.tblbranch h
             --        ON a.fCoID = h.fCoID AND a.fFromBrID = h.fBrID
             WHERE a.fcoid    = p_pstrcoid
               AND a.fbrid    = p_lkpbranch
               AND a.fdoctype = p_strdoc
             -- ORDER BY fintdocno, fslno
             ORDER BY a.fdocno, a.fslno;

    END IF;

    -- IF p_strdoc = 'DLN' THEN
    --     (tbldo - not ported: SELECT a.fDNNo AS fDocNo, a.fInvoiceType, fSlNo, a.fIntDNNo, fDate, ...
    --      FROM tblDO a LEFT OUTER JOIN tblItemHD b ... tblBranch d ... tblDeliveryNoteFooter e ...
    --      tblAccount f ... WHERE <the filter> ORDER BY fIntDNNo, fSlNo)
    -- END IF;

    -- IF p_strdoc = 'DLR' THEN
    --     (same as DLN, with fQtyIn instead of fQtyOut)
    -- END IF;

END;
$procedure$;
