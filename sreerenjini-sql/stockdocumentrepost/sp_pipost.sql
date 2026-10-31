-- =====================================================================
-- dbo.sp_pipost   (Purchase Invoice - Post AND Re-Post)
--
-- The same procedure as today, with the RE-POST mode R of the SQL Server SP_PIPostNew added. Post mode P is NOT changed.
--
-- WHAT THE OLD SP_PIPostNew DOES IN MODE R (re-post), and so what this does:
--   * it takes the lines of the document that are already POSTED (fPost = 1); P takes the lines not posted yet;
--   * for each line, exactly as in P: the stock row of the branch is made when missing, the previous stock and cost are kept,
--     the moving-average cost is worked out from the line's unit cost, and the stock and the cost are updated;
--   * the posting number, the posted flag of the lines, the finance rows and the AR / AP rows stay as they are (the old R
--     only sets fPostOrder on the finance rows - a column these tables do not have).
--
-- THE 3 CHANGES (look for "RE-POST CHANGE 1/2/3"; the lines marked "SYNC" are not part of the re-post):
--   RE-POST CHANGE 1  the mode check accepts 'R' as well as 'P';
--   RE-POST CHANGE 2  the lines it reads: fpost = (mode = 'R');
--   RE-POST CHANGE 3  a re-post returns after the loop, before the posting number and the posted flags are written
--                     (and the "not found" message says "not posted" for a re-post).
--   SYNC              the posting number is written to fpostingno (the database already does; this file still wrote ftransno).
--
-- NOTE for the team: the old SP_PIPostNew also sets fLastPurchaseCost = the line's unit cost. tblstockcontrol has a
-- flastpurchasecost column now, but neither this procedure (P) nor this re-post writes it - left as it is.
--
-- Used by:  dbo.sp_pagestockdocumentrepost (the Stock Document Re-Post screen)
-- Example:  CALL dbo.sp_pipost('R', '01', '2026', 'JD', 'PI', 'JD-2600013', 'ADMIN');
-- =====================================================================

CREATE OR REPLACE PROCEDURE dbo.sp_pipost(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_pstryear character varying,
	IN p_strbrid character varying,
	IN p_strdoctype character varying,
	IN p_strdocno character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_numqtyinout numeric(18,2);
    v_numunitcost numeric(18,4);
    v_numstock numeric(18,2);
    v_numoldunitcost numeric(18,4);
    v_numnewunitcost numeric(18,4);

    v_strpostingno varchar(9);          -- the posting number   (SYNC: was v_strpostingtransno)
    v_cnt integer := 0;
    v_row record;

BEGIN
    IF p_strdoctype <> 'PI' THEN
        RETURN;
    END IF;

    -- RE-POST CHANGE 1: 'R' (re-post) is accepted as well as 'P' (post)
    IF upper(p_strmode) NOT IN ('P', 'R') THEN
        RAISE EXCEPTION
            'sp_pipost: only mode P (post) and R (re-post) are supported, got %',
            p_strmode;
    END IF;

    -- Update stock and moving average cost for every unposted line
    FOR v_row IN
        SELECT
            fslno,
            fitemid,
            COALESCE(fqtyin, 0) - COALESCE(fqtyout, 0) AS qty_in_out,
            COALESCE(funitcost, 0) AS unit_cost
        FROM dbo.tblstocktrans
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          -- RE-POST CHANGE 2: P takes the lines not posted yet, R the lines already posted
          AND COALESCE(fpost, false) = (upper(p_strmode) = 'R')
        ORDER BY fslno
    LOOP
        v_cnt := v_cnt + 1;
        v_numqtyinout := v_row.qty_in_out;
        v_numunitcost := v_row.unit_cost;

        -- Create stock control row if missing
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tblstockcontrol
            WHERE fcoid = p_pstrcoid
              AND fyear = p_pstryear
              AND fbrid = p_strbrid
              AND fitemid = v_row.fitemid
        ) THEN
            INSERT INTO dbo.tblstockcontrol (
                fcoid,
                fyear,
                fbrid,
                fitemid
            )
            VALUES (
                p_pstrcoid,
                p_pstryear,
                p_strbrid,
                v_row.fitemid
            );
        END IF;

        v_numstock := 0;
        v_numoldunitcost := 0;

        SELECT
            COALESCE(fstock, 0),
            COALESCE(funitcost, 0)
        INTO
            v_numstock,
            v_numoldunitcost
        FROM dbo.tblstockcontrol
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fitemid = v_row.fitemid;

        UPDATE dbo.tblstockcontrol
        SET
            fpreviousstock = COALESCE(fstock, 0),
            fpreviousunitcost = COALESCE(funitcost, 0)
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fitemid = v_row.fitemid;

        IF v_numstock < 0 THEN
            v_numstock := 0;
        END IF;

        -- Moving average cost
        IF v_numqtyinout <> 0
           AND (v_numstock + v_numqtyinout) <> 0 THEN

            v_numnewunitcost :=
                (
                    (v_numstock * v_numoldunitcost)
                    + (v_numqtyinout * v_numunitcost)
                ) / (v_numstock + v_numqtyinout);
        ELSE
            v_numnewunitcost := 0;
        END IF;

        -- tblstockcontrol has no flastpurchasecost column
        UPDATE dbo.tblstockcontrol
        SET
            funitcost = v_numnewunitcost,
            fstock = COALESCE(fstock, 0) + v_numqtyinout
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fitemid = v_row.fitemid;

    END LOOP;

    IF v_cnt = 0 THEN
        RAISE EXCEPTION
            'Purchase Invoice % not found or %',
            p_strdocno,
            CASE WHEN upper(p_strmode) = 'R' THEN 'not posted' ELSE 'already posted' END;
    END IF;

    -- RE-POST CHANGE 3: a re-post (R) only builds the stock and the cost again (the loop above). The posting number, the
    -- posted flag of the lines, the finance rows and the AR / AP rows are already there and stay as they are. (The old
    -- SP_PIPostNew only sets fPostOrder here, a column these tables do not have.)
    IF upper(p_strmode) = 'R' THEN
        RETURN;
    END IF;

    -- Mark the document as posted
    v_strpostingno := dbo.getnexttransno(p_pstrcoid, p_pstryear, p_strbrid, 'P');

    -- SYNC: the posting number is stored in tblstocktrans.fpostingno (all lines of the document share the same
    -- number); the database already does this, the file still wrote ftransno
    UPDATE dbo.tblstocktrans
    SET
        fpost = true,
        fpostingno = COALESCE(fpostingno, v_strpostingno)
    WHERE fcoid = p_pstrcoid
      AND fyear = p_pstryear
      AND fbrid = p_strbrid
      AND fdoctype = p_strdoctype
      AND fdocno = p_strdocno;

    -- tblfintrans has no fpostorder column
    UPDATE dbo.tblfintrans
    SET fpost = true
    WHERE fcoid = p_pstrcoid
      AND fyear = p_pstryear
      AND fbrid = p_strbrid
      AND fdoctype = p_strdoctype
      AND fdocno = p_strdocno;

    UPDATE dbo.tblarap
    SET fpost = true
    WHERE fcoid = p_pstrcoid
      AND fyear = p_pstryear
      AND fbrid = p_strbrid
      AND fdoctype = p_strdoctype
      AND fdocno = p_strdocno;

END;
$BODY$;