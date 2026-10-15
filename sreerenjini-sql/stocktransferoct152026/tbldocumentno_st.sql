-- =====================================================================
-- Entry No. settings for the Stock Transfer (doc type ST), 2026
--
-- dbo.getnextdocno raises "Document configuration not found" when a branch has
-- no ST row in tbldocumentno. One row for each branch (same layout as the PI
-- rows):
--
--   prefix   ST + branch + - + yy        e.g. STJD-26
--   start    00001   (5 digits)          first Entry No. = STJD-2600001
--   Auto increment, never reset, strictly serial
--   fdocnolen = prefix length + 5  (the Entry No. is at most 14 characters)
--
-- The same rows can be made on the Document No. setting screen; this adds only
-- the ones that are missing, so it can be run twice.
-- =====================================================================

INSERT INTO dbo.tbldocumentno
    (fcoid, fbrid, fdoctype, fmoduleid, fdocnoprefix, fstartseqno, fseqnolen,
     fdocnolen, fstrictserialseqno, fseqnoincrementmode, fseqnoresetmode,
     fprintaftersave, fpositionno, fcuserid, fcuserdate, fyear)
SELECT b.fcoid, b.fbrid, 'ST', 'STK',
       'ST' || b.fbrid || '-26', '00001', 5,
       length('ST' || b.fbrid || '-26') + 5, true, 'Auto', 'Never',
       0, 0, 'ADMIN', now(), '2026'
FROM dbo.tblbranch b
WHERE b.fcoid = '01'
  AND NOT EXISTS (
        SELECT 1 FROM dbo.tbldocumentno d
        WHERE d.fcoid = b.fcoid AND d.fbrid = b.fbrid
          AND d.fdoctype = 'ST' AND d.fyear = '2026');

-- check:
-- SELECT fbrid, fdoctype, fdocnoprefix, fstartseqno, fseqnolen FROM dbo.tbldocumentno WHERE fdoctype = 'ST';
-- SELECT * FROM dbo.getnextdocno('01', '2026', 'JD', 'ST');      -- STJD-2600001
