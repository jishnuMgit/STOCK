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

    v_strpostingtransno varchar(9);          -- the posting transaction number
    v_cnt integer := 0;
    v_row record;

BEGIN
    IF p_strdoctype <> 'PI' THEN
        RETURN;
    END IF;

    IF p_strmode <> 'P' THEN
        RAISE EXCEPTION
            'sp_pipost: only mode P (post) is supported, got %',
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
          AND NOT COALESCE(fpost, false)
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
            'Purchase Invoice % not found or already posted',
            p_strdocno;
    END IF;

    -- Mark the document as posted
    v_strpostingtransno := dbo.getnexttransno(p_pstrcoid, p_pstryear, p_strbrid, 'P');

    -- tblstocktrans has no fpostingtransno column: the transaction number
    -- column is ftransno
    UPDATE dbo.tblstocktrans
    SET
        fpost = true,
        ftransno = COALESCE(ftransno, v_strpostingtransno)
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