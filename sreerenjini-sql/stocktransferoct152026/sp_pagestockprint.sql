-- =====================================================================
-- dbo.sp_pagestockprint   (the generic stock document print)
--
-- -- addition for the Stock Transfer print: the From and To branch names are joined
-- (the old e and f joins), written for our columns:
--     e  ->  the From branch  (a.fstbrid;  old a.fFromBrID)   as ffrombrname
--     f  ->  the To branch    (a.fsttobrid; old a.fToBrID)     as ftobrname
-- The h join (fStBrName) and the account / customer parts stay commented out.
--
--   p_strdoc     the document type (ST, STI, BG, PI ...)
--   p_pstrcoid   the company
--   p_pstryear   the year (tblstocktrans.fyear is varchar(4))
--   p_lkpbranch  the branch of the document
--   p_txtdocno   the Entry No.
--
-- The document is found with real parameters - there is no filter text joined into the
-- query (the old p_strfilter was), so nothing has to be quoted and nothing a user types
-- can change the query.
--
-- The signature changed (the filter text became these arguments), so the old procedure
-- is dropped first.
--
-- Test:
--   BEGIN;
--   CALL dbo.sp_pagestockprint('ST', '01', '2026', 'JD', 'ST0001', p_result_cursor => 'c1');
--   FETCH ALL IN c1;
--   COMMIT;
-- =====================================================================

DROP PROCEDURE IF EXISTS dbo.sp_pagestockprint(character varying, text, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagestockprint(
    IN    p_strdoc           character varying,
    IN    p_pstrcoid         character varying,
    IN    p_pstryear         character varying,
    IN    p_lkpbranch        character varying,
    IN    p_txtdocno         character varying,
    INOUT p_result_cursor    refcursor DEFAULT 'cur_pagestockprint'::refcursor)
LANGUAGE plpgsql
AS $procedure$
BEGIN

     IF p_strdoc IN ('PI','PR','SIC','SIR','SRC','SRR','ST','STI','ADJ','BS','DM','ASM','IC') THEN

        OPEN p_result_cursor FOR
            SELECT a.*, b.fitemname, b.fpacking,
                    -- c.fAccountName,
                    d.fbrname,
                    e.fbrname AS ffrombrname,
                    f.fbrname AS ftobrname,
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
             LEFT OUTER JOIN dbo.tblbranch e
                    ON a.fcoid = e.fcoid AND a.fstbrid = e.fbrid
             LEFT OUTER JOIN dbo.tblbranch f
                    ON a.fcoid = f.fcoid AND a.fsttobrid = f.fbrid
             LEFT OUTER JOIN dbo.tblstaff g
                    ON a.fcoid = g.fcoid AND a.fstaffid = g.fstaffid
             -- LEFT OUTER JOIN dbo.tblbranch h
             --        ON a.fCoID = h.fCoID AND a.fFromBrID = h.fBrID
             WHERE a.fcoid    = p_pstrcoid
               AND a.fyear    = p_pstryear
               AND a.fbrid    = p_lkpbranch
               AND a.fdoctype = p_strdoc
               AND a.fdocno   = p_txtdocno
             -- ORDER BY fintdocno, fslno
             ORDER BY a.fdocno, a.fslno;

    END IF;

END;
$procedure$;
