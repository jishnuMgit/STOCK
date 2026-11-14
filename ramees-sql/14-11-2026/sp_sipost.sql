CREATE OR REPLACE PROCEDURE dbo.sp_sipost(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_pstryear character varying,
	IN p_strbrid character varying,
	IN p_strdoctype character varying,
	IN p_strdocno character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	IN p_dtpuserdate timestamp without time zone DEFAULT NULL::timestamp without time zone)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_intSlNo SMALLINT;
    v_strYear VARCHAR(4);
    v_dtpDate TIMESTAMP;
    v_strItemID VARCHAR(40);

    v_numQtyInOut NUMERIC(18,2);
    v_numQtyIn NUMERIC(18,2);
    v_numQtyOut NUMERIC(18,2);
    v_numUnitCost NUMERIC(18,4);
    v_numStock NUMERIC(18,2);

    v_strDescription VARCHAR(100);
    v_numOldUnitCost NUMERIC(18,4);
    v_numNewUnitCost NUMERIC(18,4);
    v_numCostOfStock NUMERIC(18,4) := 0;

    v_strOrigin VARCHAR(3) := 'GP';

    v_strCostAccountID VARCHAR(12);
    v_strStockAccountID VARCHAR(12);
    v_strCCID VARCHAR(8);
    v_strpostingno VARCHAR(9);

    v_strDivID VARCHAR(10);                                         -- NEW (division)

    v_userDate TIMESTAMP;

    rec RECORD;

BEGIN

    -- client system time; server time only as a fallback
    v_userDate := COALESCE(p_dtpUserDate, CURRENT_TIMESTAMP);

    RAISE NOTICE 'Posting Filter: fCoID=%, fYear=%, fBrID=%, fDocType=%, fDocNo=%',
        p_pstrCoID,
        p_pstrYear,
        p_strBrID,
        p_strDocType,
        p_strDocNo;

    IF p_strDocType IN ('SI') THEN

        -- NEW (division): the division saved on this invoice
        SELECT NULLIF(TRIM(st.fDivID), '')
          INTO v_strDivID
          FROM dbo.tblStockTrans st
         WHERE st.fCoID = p_pstrCoID
           AND st.fYear = p_pstrYear
           AND st.fBrID = p_strBrID
           AND st.fDocType = p_strDocType
           AND st.fDocNo = p_strDocNo
         LIMIT 1;

        FOR rec IN
            SELECT
                fDate,
                fSlNo,
                fItemID,
                COALESCE(fQtyIn - fQtyOut, 0) AS QtyInOut,
                COALESCE(fQtyIn, 0) AS QtyIn,
                COALESCE(fQtyOut, 0) AS QtyOut,
                COALESCE(fUnitCost, 0) AS UnitCost
            FROM dbo.tblStockTrans
            WHERE fCoID = p_pstrCoID
              AND fYear = p_pstrYear
              AND fBrID = p_strBrID
              AND fDocType = p_strDocType
              AND fDocNo = p_strDocNo
              AND (
                    (p_strMode = 'P' AND fPost IS FALSE)
                    OR
                    (p_strMode <> 'P' AND fPost IS TRUE)
                  )
            ORDER BY fSlNo
        LOOP

            v_dtpDate := rec.fDate;
            v_intSlNo := rec.fSlNo;
            v_strItemID := rec.fItemID;

            v_numQtyInOut := rec.QtyInOut;
            v_numQtyIn := rec.QtyIn;
            v_numQtyOut := rec.QtyOut;
            v_numUnitCost := rec.UnitCost;

            SELECT fUnitCost
            INTO v_numUnitCost
            FROM dbo.tblstockcontrol
            WHERE fCoID = p_pstrCoID
              AND fyear = p_pstryear
              AND fBrID = p_strBrID
              AND fItemID = v_strItemID;

            RAISE NOTICE 'Unit Cost: %', v_numUnitCost;

            UPDATE dbo.tblStockTrans
            SET
                fUnitCost = v_numUnitCost,
                fTotalCost = (v_numQtyOut * v_numUnitCost)
            WHERE fCoID = p_pstrCoID
              AND fYear = p_pstrYear
              AND fBrID = p_strBrID
              AND fDocType = p_strDocType
              AND fDocNo = p_strDocNo
              AND fSlNo = v_intSlNo;

            v_numCostOfStock :=
                v_numCostOfStock + (v_numQtyOut * v_numUnitCost);

            IF dbo.IsStockItemExist(
                p_pstrCoID,
                p_pstrYear,
                p_strBrID,
                v_strItemID
            ) = false THEN

                INSERT INTO dbo.tblStockControl
                    (fCoID, fYear, fBrID, fItemID)
                VALUES
                    (p_pstrCoID, p_pstrYear, p_strBrID, v_strItemID);

            END IF;

            v_numStock := 0;

            SELECT COALESCE(fStock, 0)
            INTO v_numStock
            FROM dbo.tblStockControl
            WHERE fCoID = p_pstrCoID
              AND fYear = p_pstrYear
              AND fBrID = p_strBrID
              AND fItemID = v_strItemID;

            UPDATE dbo.tblStockControl
            SET fPreviousStock = COALESCE(fStock, 0)
            WHERE fCoID = p_pstrCoID
              AND fYear = p_pstrYear
              AND fBrID = p_strBrID
              AND fItemID = v_strItemID;

            UPDATE dbo.tblStockControl
            SET fStock = COALESCE(fStock, 0) + v_numQtyInOut
            WHERE fCoID = p_pstrCoID
              AND fYear = p_pstrYear
              AND fBrID = p_strBrID
              AND fItemID = v_strItemID;

        END LOOP;

        -- =============================================
        -- POSTING TO tblFinTrans
        -- =============================================

        SELECT dbo.GetSalesCostAccountID(
            p_pstrCoID,
            p_strBrID,
            RIGHT(p_strDocType, 1)
        )
        INTO v_strCostAccountID;

        SELECT dbo.GetStockAccountID(
            p_pstrCoID,
            p_strBrID
        )
        INTO v_strStockAccountID;

        v_strDescription := 'Sales Invoice ' || p_strDocNo;

        v_strYear := EXTRACT(YEAR FROM v_dtpDate)::VARCHAR(4);

        RAISE NOTICE 'Cost Of Stock: %', v_numCostOfStock;

        IF p_strMode = 'P' THEN

            v_strpostingno := dbo.getnexttransno(
                p_pstrCoID,
                p_pstrYear,
                p_strBrID,
                'P'
            );

            IF dbo.IsIncomeOrExpense(
                p_pstrCoID,
                v_strCostAccountID
            ) = true THEN

                v_strCCID := p_strBrID;

            ELSE

                v_strCCID := '';

            END IF;

            SELECT COALESCE(MAX(fSlNo), 0) + 1
            INTO v_intSlNo
            FROM dbo.tblFinTrans
            WHERE fCoID = p_pstrCoID
              AND fBrID = p_strBrID
              AND fDocType = p_strDocType
              AND fDocNo = p_strDocNo;

            -- =========================================
            -- INSERT COST ACCOUNT
            -- =========================================

            INSERT INTO dbo.tblFinTrans
            (
                fCoID,
                fYear,
                fBrID,
                fDocType,
                fDocNo,
                fDate,
                fDescription,
                fSlNo,
                fAccountID,
                fCCID,
                fDebit,
                fCredit,
                fPost,
                fOrigin,
                fYearClose,
                fcuserid,
                fCUserDate,
                fDivID                                              -- NEW (division)
            )
            VALUES
            (
                p_pstrCoID,
                v_strYear,
                p_strBrID,
                p_strDocType,
                p_strDocNo,
                v_dtpDate,
                v_strDescription,
                v_intSlNo,
                v_strCostAccountID,
                v_strCCID,
                COALESCE(v_numCostOfStock, 0),
                0,
                true,
                v_strOrigin,
                false,
                p_pstrUserID,
                v_userDate,
                v_strDivID                                          -- NEW (division)
            );

            -- =========================================
            -- INSERT STOCK ACCOUNT
            -- =========================================

            IF dbo.IsIncomeOrExpense(
                p_pstrCoID,
                v_strStockAccountID
            ) = true THEN

                v_strCCID := p_strBrID;

            ELSE

                v_strCCID := '';

            END IF;

            v_intSlNo := v_intSlNo + 1;

            INSERT INTO dbo.tblFinTrans
            (
                fCoID,
                fYear,
                fBrID,
                fDocType,
                fDocNo,
                fDate,
                fDescription,
                fSlNo,
                fAccountID,
                fCCID,
                fDebit,
                fCredit,
                fPost,
                fOrigin,
                fYearClose,
                fcuserid,
                fCUserDate,
                fDivID                                              -- NEW (division)
            )
            VALUES
            (
                p_pstrCoID,
                v_strYear,
                p_strBrID,
                p_strDocType,
                p_strDocNo,
                v_dtpDate,
                v_strDescription,
                v_intSlNo,
                v_strStockAccountID,
                v_strCCID,
                0,
                COALESCE(v_numCostOfStock, 0),
                true,
                v_strOrigin,
                false,
                p_pstrUserID,
                v_userDate,
                v_strDivID                                          -- NEW (division)
            );

            -- =========================================
            -- UPDATE STOCK TRANSACTION
            -- =========================================

            UPDATE dbo.tblStockTrans
            SET
                fPost = true,
                fpostingno = COALESCE(fpostingno, v_strpostingno)
            WHERE fCoID = p_pstrCoID
              AND fYear = p_pstrYear
              AND fBrID = p_strBrID
              AND fDocType = p_strDocType
              AND fDocNo = p_strDocNo;

            -- =========================================
            -- UPDATE FINANCIAL TRANSACTION
            -- =========================================

            UPDATE dbo.tblFinTrans
            SET fPost = true
            WHERE fCoID = p_pstrCoID
              AND fYear = v_strYear
              AND fBrID = p_strBrID
              AND fDocType = p_strDocType
              AND fDocNo = p_strDocNo;

            -- =========================================
            -- UPDATE ARAP
            -- =========================================

            UPDATE dbo.tblARAP
            SET fPost = true
            WHERE fCoID = p_pstrCoID
              AND fYear = v_strYear
              AND fBrID = p_strBrID
              AND fDocType = p_strDocType
              AND fDocNo = p_strDocNo;

        ELSE

            -- =========================================
            -- REPOSTING
            -- =========================================

            -- UPDATE COST ACCOUNT
            -- (also refreshes the division, in case it was changed)

            UPDATE dbo.tblFinTrans
            SET fDebit = COALESCE(v_numCostOfStock, 0),
                fDivID = v_strDivID                                 -- NEW (division)
            WHERE fCoID = p_pstrCoID
              AND fYear = v_strYear
              AND fBrID = p_strBrID
              AND fDocType = p_strDocType
              AND fDocNo = p_strDocNo
              AND fAccountID = v_strCostAccountID;

            -- UPDATE STOCK ACCOUNT

            UPDATE dbo.tblFinTrans
            SET fCredit = COALESCE(v_numCostOfStock, 0),
                fDivID = v_strDivID                                 -- NEW (division)
            WHERE fCoID = p_pstrCoID
              AND fYear = v_strYear
              AND fBrID = p_strBrID
              AND fDocType = p_strDocType
              AND fDocNo = p_strDocNo
              AND fAccountID = v_strStockAccountID;

        END IF;

    END IF;

END;
$BODY$;

ALTER PROCEDURE dbo.sp_sipost(character varying, character varying, character varying, character varying, character varying, character varying, character varying, timestamp without time zone)
    OWNER TO postgres;