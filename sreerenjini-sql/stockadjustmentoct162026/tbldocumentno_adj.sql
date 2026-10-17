-- =====================================================================
-- Entry No. settings for the Stock Adjustment (doc type ADJ), 2026
--
-- dbo.getnextdocno raises "Document configuration not found or incomplete.
-- Company: 01, Year: 2026, Branch: 11, Type: ADJ" when a branch has no ADJ row
-- in tbldocumentno. Jeddah (JD) and Riyadh (RH) have one; Dammam (11) did not.
--
-- One row for each branch that is missing it (same layout as the RH row):
--
--   prefix   ADJ                         first Entry No. = ADJ00001
--   start    00001   (5 digits)
--   Auto increment, never reset, strictly serial
--   fdocnolen = prefix length + 5
--
-- The same row can be made on the Document No. setting screen; this adds only
-- the ones that are missing, so it can be run twice.
-- =====================================================================

INSERT INTO dbo.tbldocumentno
    (fcoid, fbrid, fdoctype, fmoduleid, fdocnoprefix, fstartseqno, fseqnolen,
     fdocnolen, fstrictserialseqno, fseqnoincrementmode, fseqnoresetmode,
     fprintaftersave, fpositionno, fcuserid, fcuserdate, fyear)
SELECT b.fcoid, b.fbrid, 'ADJ', 'STK',
       'ADJ', '00001', 5,
       length('ADJ') + 5, true, 'Auto', 'Never',
       0, 0, 'ADMIN', now(), '2026'
FROM dbo.tblbranch b
WHERE b.fcoid = '01'
  AND NOT EXISTS (
        SELECT 1 FROM dbo.tbldocumentno d
        WHERE d.fcoid = b.fcoid AND d.fbrid = b.fbrid
          AND d.fdoctype = 'ADJ' AND d.fyear = '2026');

-- check:
-- SELECT fbrid, fdoctype, fdocnoprefix, fstartseqno, fseqnolen FROM dbo.tbldocumentno WHERE fdoctype = 'ADJ';
-- SELECT * FROM dbo.getnextdocno('01', '2026', '11', 'ADJ');      -- ADJ00001
