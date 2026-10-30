-- =====================================================================
-- dbo.sp_pagegetstockdocumentpost   (Stock Document Post)
--
-- The Postgres port of the two old procedures of the form frmStDocPost, in ONE procedure
-- with a mode (as the other sp_page<form> procedures):
--
--   mode 'G'   SP_GetStockPost  - the documents that are not posted yet, one row per document
--                                 (Doc. No., Date, Account ID, Doc. Amt.), in the cursor
--   mode 'P'   SP_StockPost     - posts ONE document: the dispatcher calls the post procedure of
--                                 its document type; p_intpostedcount comes back 1
--
-- 'G'   Doc. Amt. is MAX(fnetdocamt) for SI / SR and SUM(ftotalcost) for PI / PR / ST / ADJ (as the
--       old procedure) - and for BG (Beginning Stock), which the old list did not have: one document per
--       branch, doc no 'BG'. Account ID is the customer / supplier account (fcsaccountid). The old
--       order was Date, Int Doc. No.; tblstocktrans has no fintdocno, so it is Date, Doc. No.
--
-- 'P'   BG   dbo.sp_pagebeginningstockpost
--       PI   dbo.sp_pipost
--       ADJ  dbo.sp_pagestockadjustmentpost
--       ST   dbo.sp_pagestocktransferpost
--       PR / SI / SR  the post procedures of these are not built yet: the post stops with a
--                     message and nothing changes. Add the CALL here when they exist.
--
-- Called from the backend:  Backend/services/Sales/Transaction/stockDocumentPostService.ts
--   CALL dbo.sp_pagegetstockdocumentpost('G', '01', '2026', 'JD', 'PI', NULL, 10, 'ADMIN', 0, 'cur_x');
--   FETCH ALL FROM cur_x;
-- =====================================================================

-- the first name of this procedure (dropped when it was installed under it)
DROP PROCEDURE IF EXISTS dbo.sp_pagestockdocumentpost(character varying, character varying, character varying, character varying, character varying, character varying, smallint, character varying, integer, refcursor);

DROP PROCEDURE IF EXISTS dbo.sp_pagegetstockdocumentpost(character varying, character varying, character varying, character varying, character varying, character varying, smallint, character varying, integer, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagegetstockdocumentpost(
    IN    p_strmode          character varying,
    IN    p_pstrcoid         character varying,
    IN    p_pstryear         character varying,
    IN    p_strbrid          character varying,
    IN    p_strdoctype       character varying,
    IN    p_strdocno         character varying DEFAULT NULL::character varying,
    IN    p_intmonth         smallint          DEFAULT NULL::smallint,
    IN    p_pstruserid       character varying DEFAULT NULL::character varying,
    INOUT p_intpostedcount   integer           DEFAULT 0,
    INOUT p_result_cursor    refcursor         DEFAULT 'cur_stockdocumentpost'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    /* ---------------------------------------------------------
       G - the documents that are not posted yet (SP_GetStockPost)
    --------------------------------------------------------- */
    IF p_strmode = 'G' THEN

        IF p_strdoctype IN ('SI', 'SR') THEN

            OPEN p_result_cursor FOR
                SELECT
                    t.fdocno                            AS fdocno,
                    to_char(MAX(t.fdate), 'YYYY-MM-DD') AS fdate,
                    MAX(t.fcsaccountid)                 AS fcsaccountid,
                    MAX(t.fnetdocamt)                   AS fdocamt
                FROM dbo.tblstocktrans t
                WHERE t.fcoid    = p_pstrcoid
                  AND t.fbrid    = p_strbrid
                  AND t.fdoctype = p_strdoctype
                  AND t.fyear    = p_pstryear
                  AND EXTRACT(MONTH FROM t.fdate) = p_intmonth
                  AND t.fpost    = false
                GROUP BY t.fdocno
                ORDER BY MAX(t.fdate), t.fdocno;

        ELSIF p_strdoctype IN ('PI', 'PR', 'ST', 'ADJ', 'BG') THEN

            OPEN p_result_cursor FOR
                SELECT
                    t.fdocno                            AS fdocno,
                    to_char(MAX(t.fdate), 'YYYY-MM-DD') AS fdate,
                    MAX(t.fcsaccountid)                 AS fcsaccountid,
                    SUM(t.ftotalcost)                   AS fdocamt
                FROM dbo.tblstocktrans t
                WHERE t.fcoid    = p_pstrcoid
                  AND t.fbrid    = p_strbrid
                  AND t.fdoctype = p_strdoctype
                  AND t.fyear    = p_pstryear
                  AND EXTRACT(MONTH FROM t.fdate) = p_intmonth
                  AND t.fpost    = false
                GROUP BY t.fdocno
                ORDER BY MAX(t.fdate), t.fdocno;

        ELSE

            -- any other document type has nothing to post: an empty list
            OPEN p_result_cursor FOR
                SELECT
                    NULL::character varying AS fdocno,
                    NULL::character varying AS fdate,
                    NULL::character varying AS fcsaccountid,
                    NULL::numeric           AS fdocamt
                WHERE false;

        END IF;

    /* ---------------------------------------------------------
       P - post ONE document (SP_StockPost)
    --------------------------------------------------------- */
    ELSIF p_strmode = 'P' THEN

        p_intpostedcount := 1;

        IF p_strdoctype = 'BG' THEN

            CALL dbo.sp_pagebeginningstockpost('P', p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, p_pstruserid);

        ELSIF p_strdoctype = 'PI' THEN

            CALL dbo.sp_pipost('P', p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, p_pstruserid);

        ELSIF p_strdoctype = 'ADJ' THEN

            CALL dbo.sp_pagestockadjustmentpost('P', p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, p_pstruserid);

        ELSIF p_strdoctype = 'ST' THEN

            CALL dbo.sp_pagestocktransferpost('P', p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno, p_pstruserid);

        ELSIF p_strdoctype IN ('PR', 'SI', 'SR') THEN

            -- SP_PRPost / SP_SIPost / SP_SRPost are not built yet
            RAISE EXCEPTION 'The post of the document type % is not available yet', p_strdoctype;

        ELSE

            RAISE EXCEPTION 'The document type % cannot be posted here', p_strdoctype;

        END IF;

    ELSE

        RAISE EXCEPTION 'Unknown mode %', p_strmode;

    END IF;

END;
$procedure$;
