-- =====================================================================
-- dbo.sp_pagestockdocumentrepost   (Stock Document Re-Post)
--
-- The Postgres port of the old stock re-post (the pasted sp_stockrepost): the stock is built again from the posted
-- documents, replayed in POSTING NUMBER order between a From and a To posting number.
--
--   1. the branches (year + branch) that have a document in the range get their stock saved
--      (fpreviousstock = fstock) and set to 0 - ONCE, before any document is replayed;
--   2. every posted document of the range is replayed, in the order of its posting number, by the post procedure of
--      its document type in mode 'R' (re-post).
--
-- Every document type is replayed by its own post procedure, called in mode 'R' (re-post):
--      BG   dbo.sp_pagebeginningstockpost
--      PI   dbo.sp_pipost
--      ST   dbo.sp_pagestocktransferpost    (the STI lines of the To branch belong to the ST)
--      ADJ  dbo.sp_pagestockadjustmentpost
--   Added LATER (their blocks are commented out below, in the check of step 2 and in the replay of step 5 - switch the
--   three places on together, never one of them alone):
--      PR   dbo.sp_pageprpost
--      SI   dbo.sp_pagesipost
--      SR   dbo.sp_pagesrpost
--   Of these the Beginning Stock, Stock Transfer, Stock Adjustment and Purchase Invoice procedures can re-post (the last two once
--   their re-post versions - sp_pagestockadjustmentpost and sp_pipost with mode 'R' - are installed; a procedure that only
--   knows mode P stops the re-post with its own message and everything is undone). A procedure that does
--   not exist (yet) is NOT an error of this procedure: it checks, before anything is changed, that the procedure of every
--   document type of the range exists, and if one does not it STOPS with "not available yet" - replaying only some of the
--   documents after the stock is set to 0 would leave the stock wrong. The day the procedure is created (and re-posts in
--   mode 'R'), its document type works here with no change. A document type that is not in the list above (PR, SI, SR
--   until they are switched on, Damage, Assembly, Item Conversion, the legacy types) is always "not available yet".
--
-- Differences from the pasted sp_stockrepost - all forced by our tables, or for safety:
--   * "update dbo.tblitemtl set fstock = 0" is left out: tblitemtl has no fstock column here (an item's total stock is
--     added up from tblstockcontrol);
--   * the pasted version set the branch stock to 0 INSIDE the loop, for every document: each document would have wiped
--     the ones before it. The stock is set to 0 once per year + branch, before the loop;
--   * three checks run before anything changes (each raises a message and nothing is changed):
--       - the range holds a posted document;
--       - every document of the range can be re-posted (see above);
--       - for every year + branch that is rebuilt, ALL its posted documents are in the range - a branch with a posted
--         document that is outside the range, or that has no posting number (old documents have none), would lose it.
--   * the post procedures are called by the names the team uses (sp_page<document>post); the check of step 2 stops the
--     re-post, before anything is changed, when one of them does not exist yet.
--
-- The whole procedure runs in the caller's transaction: if one document fails, everything is undone.
--
-- Called from the backend:  Backend/services/Sales/Transaction/stockDocumentRePostService.ts
--   CALL dbo.sp_pagestockdocumentrepost('01', 'ADMIN', '260000001', '260000017', 0, NULL);
-- =====================================================================

DROP PROCEDURE IF EXISTS dbo.sp_pagestockdocumentrepost(character varying, character varying, character varying, character varying, integer, character varying);

CREATE OR REPLACE PROCEDURE dbo.sp_pagestockdocumentrepost(
    IN    p_pstrcoid          character varying,
    IN    p_pstruserid        character varying,
    IN    p_strstartpostingno character varying,
    IN    p_strendpostingno   character varying,
    INOUT p_intrepostedcount  integer           DEFAULT 0,
    INOUT p_strmsg            character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_doc       record;
    v_mode      varchar(1) := 'R';
    v_unsupport text;
    v_uncovered text;
BEGIN

    p_intrepostedcount := 0;
    p_strmsg := NULL;

    /* ---------------------------------------------------------
       1. there is something to re-post
    --------------------------------------------------------- */
    IF NOT EXISTS (
        SELECT 1
          FROM dbo.tblstocktrans t
         WHERE t.fcoid = p_pstrcoid
           AND t.fpost = true
           AND t.fpostingno BETWEEN p_strstartpostingno AND p_strendpostingno
    ) THEN
        RAISE EXCEPTION 'No posted document found from Txn. No. % to %', p_strstartpostingno, p_strendpostingno;
    END IF;

    /* ---------------------------------------------------------
       2. the post procedure of every document type of the range exists (STI belongs to its ST); a type that has no
          procedure here (the legacy types, for one) is listed too
    --------------------------------------------------------- */
    SELECT string_agg(DISTINCT t.fdoctype, ', ' ORDER BY t.fdoctype)
      INTO v_unsupport
      FROM dbo.tblstocktrans t
     WHERE t.fcoid = p_pstrcoid
       AND t.fpost = true
       AND t.fpostingno BETWEEN p_strstartpostingno AND p_strendpostingno
       AND t.fdoctype <> 'STI'
       AND NOT EXISTS (
            SELECT 1
              FROM pg_proc p
              JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'dbo'
               AND p.proname = CASE t.fdoctype
                                 WHEN 'BG'  THEN 'sp_pagebeginningstockpost'
                                 WHEN 'PI'  THEN 'sp_pipost'
                                 -- to be added later (with their blocks in step 5):
                                 -- WHEN 'PR'  THEN 'sp_pageprpost'
                                 -- WHEN 'SI'  THEN 'sp_pagesipost'
                                 -- WHEN 'SR'  THEN 'sp_pagesrpost'
                                 WHEN 'ST'  THEN 'sp_pagestocktransferpost'
                                 WHEN 'ADJ' THEN 'sp_pagestockadjustmentpost'
                               END);

    IF v_unsupport IS NOT NULL THEN
        RAISE EXCEPTION 'The re-post of the document type(s) % is not available yet', v_unsupport;
    END IF;

    /* ---------------------------------------------------------
       3. a year + branch is rebuilt from ITS WHOLE posted history: every posted document of it must be in the range
    --------------------------------------------------------- */
    SELECT string_agg(DISTINCT o.fbrid, ', ' ORDER BY o.fbrid)
      INTO v_uncovered
      FROM (SELECT DISTINCT t.fyear, t.fbrid
              FROM dbo.tblstocktrans t
             WHERE t.fcoid = p_pstrcoid
               AND t.fpost = true
               AND t.fpostingno BETWEEN p_strstartpostingno AND p_strendpostingno) r
      JOIN dbo.tblstocktrans o
        ON o.fcoid  = p_pstrcoid
       AND o.fyear  = r.fyear
       AND o.fbrid  = r.fbrid
       AND o.fpost  = true
       AND (o.fpostingno IS NULL OR o.fpostingno NOT BETWEEN p_strstartpostingno AND p_strendpostingno);

    IF v_uncovered IS NOT NULL THEN
        RAISE EXCEPTION 'The stock of the branch(es) % cannot be rebuilt: they have posted documents outside Txn. No. % to % or without a Txn. No.',
            v_uncovered, p_strstartpostingno, p_strendpostingno;
    END IF;

    /* ---------------------------------------------------------
       4. save the stock of every year + branch of the range and set it to 0 - once
    --------------------------------------------------------- */
    UPDATE dbo.tblstockcontrol c
       SET fpreviousstock = COALESCE(c.fstock, 0),
           fstock         = 0
     WHERE c.fcoid = p_pstrcoid
       AND EXISTS (
            SELECT 1
              FROM dbo.tblstocktrans t
             WHERE t.fcoid = c.fcoid
               AND t.fyear = c.fyear
               AND t.fbrid = c.fbrid
               AND t.fpost = true
               AND t.fpostingno BETWEEN p_strstartpostingno AND p_strendpostingno);

    /* ---------------------------------------------------------
       5. replay the documents in the order of their posting number
    --------------------------------------------------------- */
    FOR v_doc IN
        SELECT DISTINCT t.fyear, t.fbrid, t.fdoctype, t.fdocno, t.fpostingno
          FROM dbo.tblstocktrans t
         WHERE t.fcoid = p_pstrcoid
           AND t.fpost = true
           AND t.fpostingno BETWEEN p_strstartpostingno AND p_strendpostingno
           AND t.fdoctype IN ('BG', 'PI', 'ST', 'ADJ')  -- add 'PR', 'SI', 'SR' here when their blocks are switched on
         ORDER BY t.fpostingno, t.fdoctype, t.fdocno
    LOOP

        -- Beginning Stock
        IF v_doc.fdoctype = 'BG' THEN
            CALL dbo.sp_pagebeginningstockpost(v_mode, p_pstrcoid, v_doc.fyear, v_doc.fbrid, v_doc.fdoctype, v_doc.fdocno, p_pstruserid);
        END IF;

        -- Purchase Invoice
        IF v_doc.fdoctype = 'PI' THEN
            CALL dbo.sp_pipost(v_mode, p_pstrcoid, v_doc.fyear, v_doc.fbrid, v_doc.fdoctype, v_doc.fdocno, p_pstruserid);
        END IF;

        -- Purchase Return - to be added later
        -- IF v_doc.fdoctype = 'PR' THEN
        --     CALL dbo.sp_pageprpost(v_mode, p_pstrcoid, v_doc.fyear, v_doc.fbrid, v_doc.fdoctype, v_doc.fdocno, p_pstruserid);
        -- END IF;

        -- Sales Invoice - to be added later
        -- IF v_doc.fdoctype = 'SI' THEN
        --     CALL dbo.sp_pagesipost(v_mode, p_pstrcoid, v_doc.fyear, v_doc.fbrid, v_doc.fdoctype, v_doc.fdocno, p_pstruserid);
        -- END IF;

        -- Sales Return - to be added later
        -- IF v_doc.fdoctype = 'SR' THEN
        --     CALL dbo.sp_pagesrpost(v_mode, p_pstrcoid, v_doc.fyear, v_doc.fbrid, v_doc.fdoctype, v_doc.fdocno, p_pstruserid);
        -- END IF;

        -- Stock Transfer
        IF v_doc.fdoctype = 'ST' THEN
            CALL dbo.sp_pagestocktransferpost(v_mode, p_pstrcoid, v_doc.fyear, v_doc.fbrid, v_doc.fdoctype, v_doc.fdocno, p_pstruserid);
        END IF;

        -- Stock Adjustment
        IF v_doc.fdoctype = 'ADJ' THEN
            CALL dbo.sp_pagestockadjustmentpost(v_mode, p_pstrcoid, v_doc.fyear, v_doc.fbrid, v_doc.fdoctype, v_doc.fdocno, p_pstruserid);
        END IF;

        p_intrepostedcount := p_intrepostedcount + 1;

    END LOOP;

    p_strmsg := p_intrepostedcount || ' document(s) re-posted';

END;
$procedure$;
