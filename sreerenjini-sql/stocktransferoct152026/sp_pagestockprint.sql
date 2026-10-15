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
--   p_strfilter  the WHERE text, e.g.
--                a.fcoid = '01' and a.fyear = 2026 and a.fbrid = 'JD'
--                and a.fdoctype = 'ST' and a.fdocno = 'ST0001'
--
-- The filter is joined into the query as text, exactly like the old one, so it must
-- NEVER come from the browser: the backend builds it from values it has already
-- validated, every one quoted.
--
-- Test:
--   BEGIN;
--   CALL dbo.sp_pagestockprint('ST',
--        'a.fcoid = ''01'' and a.fbrid = ''JD'' and a.fdoctype = ''ST'' and a.fdocno = ''ST0001''',
--        p_result_cursor => 'c1');
--   FETCH ALL IN c1;
--   COMMIT;
-- =====================================================================

CREATE OR REPLACE PROCEDURE dbo.sp_pagestockprint(
    IN    p_strdoc           character varying,
    IN    p_strfilter        text,
    INOUT p_result_cursor    refcursor DEFAULT 'cur_pagestockprint'::refcursor)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_strsql text;
BEGIN

     IF p_strdoc IN ('PI','PR','SIC','SIR','SRC','SRR','ST','STI','ADJ','BG','DM','ASM','IC') THEN


        v_strsql :=
            'SELECT a.*, b.fitemname, b.fpacking,
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
             WHERE ' || p_strfilter || '
             -- ORDER BY fintdocno, fslno
             ORDER BY a.fdocno, a.fslno';

        OPEN p_result_cursor FOR EXECUTE v_strsql;

    END IF;

END;
$procedure$;
