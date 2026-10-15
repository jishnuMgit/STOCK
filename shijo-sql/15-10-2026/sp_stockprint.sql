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
             WHERE ' || p_strfilter || '
             -- ORDER BY fintdocno, fslno
             ORDER BY a.fdocno, a.fslno';

        OPEN p_result_cursor FOR EXECUTE v_strsql;

    END IF;

END;
$procedure$;
