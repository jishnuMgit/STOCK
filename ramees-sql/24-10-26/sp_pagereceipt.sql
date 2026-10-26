CREATE OR REPLACE PROCEDURE dbo.sp_pagesreceipt_det(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_pstryear character varying,
	IN p_strbrid character varying,
	IN p_strdoctype character varying,
	IN p_strdocno character varying,
	IN p_intslno smallint DEFAULT 0,
	IN p_dtpdate character varying DEFAULT NULL::character varying,
	IN p_strcbaccountid character varying DEFAULT NULL::character varying,
	IN p_strreceivedfrompaidto character varying DEFAULT NULL::character varying,
	IN p_strref character varying DEFAULT NULL::character varying,
	IN p_straccountid character varying DEFAULT NULL::character varying,
	IN p_strgcs character varying DEFAULT NULL::character varying,
	IN p_strdivid character varying DEFAULT NULL::character varying,
	IN p_strccid character varying DEFAULT NULL::character varying,
	IN p_numdebit numeric DEFAULT 0,
	IN p_numcredit numeric DEFAULT 0,
	IN p_strdescription character varying DEFAULT NULL::character varying,
	IN p_strnote character varying DEFAULT NULL::character varying,
	IN p_blnmatch boolean DEFAULT false,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	IN p_struserdate character varying DEFAULT NULL::character varying,
	IN p_strdetails jsonb DEFAULT NULL::jsonb,
	INOUT p_result_cursor refcursor DEFAULT 'cur_receiptpage'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$

DECLARE
    v_exists integer := 0;
    v_date date;
    v_gaccountid varchar;
    v_csaccountid varchar;
    v_row record;
    v_debit numeric := COALESCE(p_numdebit, 0);
    v_credit numeric := COALESCE(p_numcredit, 0);

BEGIN

    /* DATE (kept as DATE, no timezone conversion) */

    IF p_dtpdate IS NOT NULL AND TRIM(p_dtpdate) <> '' THEN
        v_date := TO_DATE(TRIM(p_dtpdate), 'DD/MM/YYYY');
    ELSE
        v_date := CURRENT_DATE;
    END IF;

    /* G / CS ACCOUNT MAPPING */

    IF UPPER(TRIM(COALESCE(p_strgcs, ''))) = 'G' THEN
        v_gaccountid := p_straccountid;
        v_csaccountid := '';
    ELSE
        v_gaccountid := dbo.getparentcsaccountid(p_pstrcoid, p_straccountid);
        v_csaccountid := p_straccountid;
    END IF;

    /* ============================================================
       MODE : S  -  INSERT DETAIL ENTRY
       fdebit / fcredit from p_numdebit / p_numcredit,
       fdebitcredit = credit - debit (negative = debit line)
       ============================================================ */

    IF p_strmode = 'S' THEN

        INSERT INTO dbo.tblfintrans
        (
            fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fdoctypeno, fdate,
            fcbaccountid, freceivedfrompaidto, freference, faccountid, fgcs,
            fgaccountid, fcsaccountid, fdivid, fccid,
            fdebit, fcredit, fdebitcredit,
            fdescription, fnote, fmatch, forigin, fcuserid, fcuserdate
        )
        VALUES
        (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
            p_intslno, p_strdoctype || ' ' || p_strdocno, v_date,
            NULLIF(TRIM(p_strcbaccountid), ''),
            NULLIF(TRIM(p_strreceivedfrompaidto), ''),
            NULLIF(TRIM(p_strref), ''),
            NULLIF(TRIM(p_straccountid), ''),
            NULLIF(TRIM(p_strgcs), ''),
            v_gaccountid, v_csaccountid,
            NULLIF(TRIM(p_strdivid), ''),
            NULLIF(TRIM(p_strccid), ''),
            v_debit,
            v_credit,
            v_credit - v_debit,
            NULLIF(TRIM(p_strdescription), ''),
            NULLIF(TRIM(p_strnote), ''),
            COALESCE(p_blnmatch, false),
            'UI',
            NULLIF(TRIM(p_pstruserid), ''),
            CURRENT_TIMESTAMP
        );

        INSERT INTO dbo.tblarap
        (
            fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fdoctypeno, fdate,
            faccountid, fgaccountid, fcsaccountid, fccid, fdivid,
            fdescription, fdocamt, fdebit, fcredit, fcuserid, fcuserdate
        )
        VALUES
        (
            p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
            p_intslno, p_strdoctype || ' ' || p_strdocno, v_date,
            NULLIF(TRIM(p_straccountid), ''),
            v_gaccountid, v_csaccountid,
            COALESCE(p_strccid, ''),
            NULLIF(TRIM(p_strdivid), ''),
            COALESCE(p_strdescription, ''),
            v_debit + v_credit,
            v_debit,
            v_credit,
            NULLIF(TRIM(p_pstruserid), ''),
            CURRENT_TIMESTAMP
        );

    /* ============================================================
       MODE : D  -  DELETE ENTRY
       ============================================================ */

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblfintrans
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND (p_intslno = 0 OR fslno = p_intslno);

        DELETE FROM dbo.tblarap
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND (p_intslno = 0 OR fslno = p_intslno);

    /* ============================================================
       MODE : SC  -  SAVE / UPDATE CONTROL ACCOUNT

       Control row is the OPPOSITE side of the lines:
         total > 0  -> p_numcredit = total  -> fdebit  = total
         total < 0  -> p_numdebit  = |total| -> fcredit = |total|
       ============================================================ */

    ELSIF p_strmode = 'SC' THEN

        SELECT COUNT(*)
        INTO v_exists
        FROM dbo.tblfintrans
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND fslno = 0;

        IF v_exists = 0 THEN

            INSERT INTO dbo.tblfintrans
            (
                fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fdoctypeno, fdate,
                fcbaccountid, freceivedfrompaidto, freference, faccountid, fgcs,
                fgaccountid, fcsaccountid, fdivid, fccid,
                fdebit, fcredit, fdebitcredit,
                fdescription, fnote, fmatch, forigin, fcuserid, fcuserdate
            )
            VALUES
            (
                p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
                0, p_strdoctype || ' ' || p_strdocno, v_date,
                NULLIF(TRIM(p_strcbaccountid), ''),
                NULLIF(TRIM(p_strreceivedfrompaidto), ''),
                NULLIF(TRIM(p_strref), ''),
                NULLIF(TRIM(p_strcbaccountid), ''),
                NULLIF(TRIM(p_strgcs), ''),
                v_gaccountid, v_csaccountid,
                NULLIF(TRIM(p_strdivid), ''),
                NULLIF(TRIM(p_strccid), ''),
                v_credit,
                v_debit,
                v_debit - v_credit,
                NULLIF(TRIM(p_strdescription), ''),
                NULLIF(TRIM(p_strnote), ''),
                COALESCE(p_blnmatch, false),
                'UIG',
                NULLIF(TRIM(p_pstruserid), ''),
                CURRENT_TIMESTAMP
            );

        ELSE

            UPDATE dbo.tblfintrans
            SET
                fdate = v_date,
                fcbaccountid = NULLIF(TRIM(p_strcbaccountid), ''),
                freceivedfrompaidto = NULLIF(TRIM(p_strreceivedfrompaidto), ''),
                freference = NULLIF(TRIM(p_strref), ''),
                faccountid = NULLIF(TRIM(p_strcbaccountid), ''),
                fgcs = NULLIF(TRIM(p_strgcs), ''),
                fgaccountid = v_gaccountid,
                fcsaccountid = v_csaccountid,
                fdivid = NULLIF(TRIM(p_strdivid), ''),
                fccid = NULLIF(TRIM(p_strccid), ''),
                fdebit = v_credit,
                fcredit = v_debit,
                fdebitcredit = v_debit - v_credit,
                fdescription = NULLIF(TRIM(p_strdescription), ''),
                fnote = NULLIF(TRIM(p_strnote), ''),
                fmatch = COALESCE(p_blnmatch, false),
                fmuserid = NULLIF(TRIM(p_pstruserid), ''),
                fmuserdate = CURRENT_TIMESTAMP
            WHERE fcoid = p_pstrcoid
              AND fyear = p_pstryear
              AND fbrid = p_strbrid
              AND fdoctype = p_strdoctype
              AND fdocno = p_strdocno
              AND fslno = 0;

        END IF;

    /* ============================================================
       MODE : M
       ============================================================ */

    ELSIF p_strmode = 'M' THEN

        /* ---- M + slno = 0 : CONTROL ENTRY ---- */

        IF p_intslno = 0 THEN

            SELECT COUNT(*)
            INTO v_exists
            FROM dbo.tblfintrans
            WHERE fcoid = p_pstrcoid
              AND fyear = p_pstryear
              AND fbrid = p_strbrid
              AND fdoctype = p_strdoctype
              AND fdocno = p_strdocno
              AND fslno = 0;

            IF v_exists = 0 THEN
                RAISE EXCEPTION 'Control entry not found. Document: %', p_strdocno;
            END IF;

            UPDATE dbo.tblfintrans
            SET
                fdate = v_date,
                freceivedfrompaidto = NULLIF(TRIM(p_strreceivedfrompaidto), ''),
                freference = NULLIF(TRIM(p_strref), ''),
                fcbaccountid = NULLIF(TRIM(p_strcbaccountid), ''),
                faccountid = NULLIF(TRIM(p_strcbaccountid), ''),
                fgcs = NULLIF(TRIM(p_strgcs), ''),
                fgaccountid = v_gaccountid,
                fcsaccountid = v_csaccountid,
                fdivid = NULLIF(TRIM(p_strdivid), ''),
                fccid = NULLIF(TRIM(p_strccid), ''),
                fdebit = v_credit,
                fcredit = v_debit,
                fdebitcredit = v_debit - v_credit,
                fdescription = NULLIF(TRIM(p_strdescription), ''),
                fnote = NULLIF(TRIM(p_strnote), ''),
                fmatch = COALESCE(p_blnmatch, false),
                fmuserid = NULLIF(TRIM(p_pstruserid), ''),
                fmuserdate = CURRENT_TIMESTAMP
            WHERE fcoid = p_pstrcoid
              AND fyear = p_pstryear
              AND fbrid = p_strbrid
              AND fdoctype = p_strdoctype
              AND fdocno = p_strdocno
              AND fslno = 0;

        /* ---- M + slno > 0, no details : SINGLE DETAIL UPDATE ---- */

        ELSIF p_strdetails IS NULL THEN

            UPDATE dbo.tblfintrans
            SET
                fdate = v_date,
                fcbaccountid = NULLIF(TRIM(p_strcbaccountid), ''),
                freceivedfrompaidto = NULLIF(TRIM(p_strreceivedfrompaidto), ''),
                freference = NULLIF(TRIM(p_strref), ''),
                faccountid = NULLIF(TRIM(p_straccountid), ''),
                fgcs = NULLIF(TRIM(p_strgcs), ''),
                fgaccountid = v_gaccountid,
                fcsaccountid = v_csaccountid,
                fdivid = NULLIF(TRIM(p_strdivid), ''),
                fccid = NULLIF(TRIM(p_strccid), ''),
                fdebit = v_debit,
                fcredit = v_credit,
                fdebitcredit = v_credit - v_debit,
                fdescription = NULLIF(TRIM(p_strdescription), ''),
                fnote = NULLIF(TRIM(p_strnote), ''),
                fmatch = COALESCE(p_blnmatch, false),
                fmuserid = NULLIF(TRIM(p_pstruserid), ''),
                fmuserdate = CURRENT_TIMESTAMP
            WHERE fcoid = p_pstrcoid
              AND fyear = p_pstryear
              AND fbrid = p_strbrid
              AND fdoctype = p_strdoctype
              AND fdocno = p_strdocno
              AND fslno = p_intslno;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Detail entry not found. Document: %, Slno: %',
                    p_strdocno, p_intslno;
            END IF;

            UPDATE dbo.tblarap
            SET
                fdate = v_date,
                faccountid = NULLIF(TRIM(p_straccountid), ''),
                fgaccountid = v_gaccountid,
                fcsaccountid = v_csaccountid,
                fccid = COALESCE(p_strccid, ''),
                fdivid = NULLIF(TRIM(p_strdivid), ''),
                fdescription = COALESCE(p_strdescription, ''),
                fdocamt = v_debit + v_credit,
                fdebit = v_debit,
                fcredit = v_credit,
                fmuserid = NULLIF(TRIM(p_pstruserid), ''),
                fmuserdate = CURRENT_TIMESTAMP
            WHERE fcoid = p_pstrcoid
              AND fyear = p_pstryear
              AND fbrid = p_strbrid
              AND fdoctype = p_strdoctype
              AND fdocno = p_strdocno
              AND fslno = p_intslno;

        /* ---- M + p_strdetails : BULK DETAIL UPDATE ---- */

        ELSE

            IF jsonb_typeof(p_strdetails) <> 'array' THEN
                RAISE EXCEPTION 'p_strdetails must be a JSON array';
            END IF;

            /* delete details that are no longer in the frontend */

            DELETE FROM dbo.tblfintrans t
            WHERE t.fcoid = p_pstrcoid
              AND t.fyear = p_pstryear
              AND t.fbrid = p_strbrid
              AND t.fdoctype = p_strdoctype
              AND t.fdocno = p_strdocno
              AND t.fslno <> 0
              AND NOT EXISTS
              (
                  SELECT 1
                  FROM jsonb_array_elements(p_strdetails) j
                  WHERE (j ->> 'slno')::smallint = t.fslno
              );

            DELETE FROM dbo.tblarap t
            WHERE t.fcoid = p_pstrcoid
              AND t.fyear = p_pstryear
              AND t.fbrid = p_strbrid
              AND t.fdoctype = p_strdoctype
              AND t.fdocno = p_strdocno
              AND t.fslno <> 0
              AND NOT EXISTS
              (
                  SELECT 1
                  FROM jsonb_array_elements(p_strdetails) j
                  WHERE (j ->> 'slno')::smallint = t.fslno
              );

            /* update / insert each frontend detail
               JSON keys MUST be exactly the column names below */

            FOR v_row IN
                SELECT *
                FROM jsonb_to_recordset(p_strdetails)
                AS x
                (
                    slno                smallint,
                    dtpdate             varchar,
                    cbaccountid         varchar,
                    receivedfrompaidto  varchar,
                    ref                 varchar,
                    accountid           varchar,
                    gcs                 varchar,
                    divid               varchar,
                    ccid                varchar,
                    debit               numeric,
                    credit              numeric,
                    description         varchar,
                    note                varchar,
                    match               boolean
                )
            LOOP

                IF UPPER(TRIM(COALESCE(v_row.gcs, ''))) = 'G' THEN
                    v_gaccountid := v_row.accountid;
                    v_csaccountid := '';
                ELSE
                    v_gaccountid := dbo.getparentcsaccountid(p_pstrcoid, v_row.accountid);
                    v_csaccountid := v_row.accountid;
                END IF;

                /* ---- TBLFINTRANS ---- */

                SELECT COUNT(*)
                INTO v_exists
                FROM dbo.tblfintrans
                WHERE fcoid = p_pstrcoid
                  AND fyear = p_pstryear
                  AND fbrid = p_strbrid
                  AND fdoctype = p_strdoctype
                  AND fdocno = p_strdocno
                  AND fslno = v_row.slno;

                IF v_exists > 0 THEN

                    UPDATE dbo.tblfintrans
                    SET
                        fdate = TO_DATE(TRIM(v_row.dtpdate), 'DD/MM/YYYY'),
                        fcbaccountid = NULLIF(TRIM(v_row.cbaccountid), ''),
                        freceivedfrompaidto = NULLIF(TRIM(v_row.receivedfrompaidto), ''),
                        freference = NULLIF(TRIM(v_row.ref), ''),
                        faccountid = NULLIF(TRIM(v_row.accountid), ''),
                        fgcs = NULLIF(TRIM(v_row.gcs), ''),
                        fgaccountid = v_gaccountid,
                        fcsaccountid = v_csaccountid,
                        fdivid = NULLIF(TRIM(v_row.divid), ''),
                        fccid = NULLIF(TRIM(v_row.ccid), ''),
                        fdebit = COALESCE(v_row.debit, 0),
                        fcredit = COALESCE(v_row.credit, 0),
                        fdebitcredit = COALESCE(v_row.credit, 0) - COALESCE(v_row.debit, 0),
                        fdescription = NULLIF(TRIM(v_row.description), ''),
                        fnote = NULLIF(TRIM(v_row.note), ''),
                        fmatch = COALESCE(v_row.match, false),
                        fmuserid = NULLIF(TRIM(p_pstruserid), ''),
                        fmuserdate = CURRENT_TIMESTAMP
                    WHERE fcoid = p_pstrcoid
                      AND fyear = p_pstryear
                      AND fbrid = p_strbrid
                      AND fdoctype = p_strdoctype
                      AND fdocno = p_strdocno
                      AND fslno = v_row.slno;

                ELSE

                    INSERT INTO dbo.tblfintrans
                    (
                        fcoid, fyear, fbrid, fdoctype, fdocno, fslno,
                        fdoctypeno, fdate, fcbaccountid,
                        freceivedfrompaidto, freference, faccountid, fgcs,
                        fgaccountid, fcsaccountid, fdivid, fccid,
                        fdebit, fcredit, fdebitcredit,
                        fdescription, fnote, fmatch, forigin, fcuserid, fcuserdate
                    )
                    VALUES
                    (
                        p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
                        v_row.slno, p_strdoctype || ' ' || p_strdocno,
                        TO_DATE(TRIM(v_row.dtpdate), 'DD/MM/YYYY'),
                        NULLIF(TRIM(v_row.cbaccountid), ''),
                        NULLIF(TRIM(v_row.receivedfrompaidto), ''),
                        NULLIF(TRIM(v_row.ref), ''),
                        NULLIF(TRIM(v_row.accountid), ''),
                        NULLIF(TRIM(v_row.gcs), ''),
                        v_gaccountid, v_csaccountid,
                        NULLIF(TRIM(v_row.divid), ''),
                        NULLIF(TRIM(v_row.ccid), ''),
                        COALESCE(v_row.debit, 0),
                        COALESCE(v_row.credit, 0),
                        COALESCE(v_row.credit, 0) - COALESCE(v_row.debit, 0),
                        NULLIF(TRIM(v_row.description), ''),
                        NULLIF(TRIM(v_row.note), ''),
                        COALESCE(v_row.match, false),
                        'UI',
                        NULLIF(TRIM(p_pstruserid), ''),
                        CURRENT_TIMESTAMP
                    );

                END IF;

                /* ---- TBLARAP ---- */

                SELECT COUNT(*)
                INTO v_exists
                FROM dbo.tblarap
                WHERE fcoid = p_pstrcoid
                  AND fyear = p_pstryear
                  AND fbrid = p_strbrid
                  AND fdoctype = p_strdoctype
                  AND fdocno = p_strdocno
                  AND fslno = v_row.slno;

                IF v_exists > 0 THEN

                    UPDATE dbo.tblarap
                    SET
                        fdate = TO_DATE(TRIM(v_row.dtpdate), 'DD/MM/YYYY'),
                        faccountid = NULLIF(TRIM(v_row.accountid), ''),
                        fgaccountid = v_gaccountid,
                        fcsaccountid = v_csaccountid,
                        fccid = COALESCE(v_row.ccid, ''),
                        fdivid = NULLIF(TRIM(v_row.divid), ''),
                        fdescription = COALESCE(v_row.description, ''),
                        fdocamt = COALESCE(v_row.debit, 0) + COALESCE(v_row.credit, 0),
                        fdebit = COALESCE(v_row.debit, 0),
                        fcredit = COALESCE(v_row.credit, 0),
                        fmuserid = NULLIF(TRIM(p_pstruserid), ''),
                        fmuserdate = CURRENT_TIMESTAMP
                    WHERE fcoid = p_pstrcoid
                      AND fyear = p_pstryear
                      AND fbrid = p_strbrid
                      AND fdoctype = p_strdoctype
                      AND fdocno = p_strdocno
                      AND fslno = v_row.slno;

                ELSE

                    INSERT INTO dbo.tblarap
                    (
                        fcoid, fyear, fbrid, fdoctype, fdocno, fslno,
                        fdoctypeno, fdate, faccountid, fgaccountid, fcsaccountid,
                        fccid, fdivid, fdescription, fdocamt, fdebit, fcredit,
                        fcuserid, fcuserdate
                    )
                    VALUES
                    (
                        p_pstrcoid, p_pstryear, p_strbrid, p_strdoctype, p_strdocno,
                        v_row.slno, p_strdoctype || ' ' || p_strdocno,
                        TO_DATE(TRIM(v_row.dtpdate), 'DD/MM/YYYY'),
                        NULLIF(TRIM(v_row.accountid), ''),
                        v_gaccountid, v_csaccountid,
                        COALESCE(v_row.ccid, ''),
                        NULLIF(TRIM(v_row.divid), ''),
                        COALESCE(v_row.description, ''),
                        COALESCE(v_row.debit, 0) + COALESCE(v_row.credit, 0),
                        COALESCE(v_row.debit, 0),
                        COALESCE(v_row.credit, 0),
                        NULLIF(TRIM(p_pstruserid), ''),
                        CURRENT_TIMESTAMP
                    );

                END IF;

            END LOOP;

        END IF;

    /* ============================================================
       MODE : GETHD  -  GET HEADER (fslno = 0)
       fdate returned as DD/MM/YYYY string (no JS timezone shift)
       fdebitcredit falls back to credit - debit for older rows
       ============================================================ */

    ELSIF p_strmode = 'GETHD' THEN

        OPEN p_result_cursor FOR

        SELECT
            fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fdoctypeno,
            TO_CHAR(fdate, 'DD/MM/YYYY') AS fdate,
            fcbaccountid, freceivedfrompaidto, freference, fnote,
            faccountid, fgcs, fcsaccountid, fgaccountid, fdivid, fccid,
            fdescription,
            fdebit,
            fcredit,
            COALESCE(fdebitcredit, fcredit - fdebit) AS fdebitcredit,
            forigin, fpost, fyearclose, fbank, fbankdate, fmatch,
            fadjdocamt, fcuserid, fcuserdate, fmuserid, fmuserdate,
            fcbamt, fvatslab, fvatamt, fvatper, famountexclvat,
            fapplydate, fapplyyear, fcopied, fzatcacleared,
            fdatabeforezatca, fdocamt
        FROM dbo.tblfintrans
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND fslno = 0;

    /* ============================================================
       MODE : GETTL  -  GET DETAILS (fslno <> 0)
       ============================================================ */

    ELSIF p_strmode = 'GETTL' THEN

        OPEN p_result_cursor FOR

        SELECT
            fcoid, fyear, fbrid, fdoctype, fdocno, fslno, fdoctypeno,
            TO_CHAR(fdate, 'DD/MM/YYYY') AS fdate,
            fcbaccountid, freceivedfrompaidto, freference, fnote,
            faccountid, fgcs, fcsaccountid, fgaccountid, fdivid, fccid,
            fdescription,
            fdebit,
            fcredit,
            COALESCE(fdebitcredit, fcredit - fdebit) AS fdebitcredit,
            forigin, fpost, fyearclose, fbank, fbankdate, fmatch,
            fadjdocamt, fcuserid, fcuserdate, fmuserid, fmuserdate,
            fcbamt, fvatslab, fvatamt, fvatper, famountexclvat,
            fapplydate, fapplyyear, fcopied, fzatcacleared,
            fdatabeforezatca, fdocamt
        FROM dbo.tblfintrans
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND fslno <> 0
        ORDER BY fslno;

    /* ============================================================
       DEFAULT
       ============================================================ */

    ELSE

        OPEN p_result_cursor FOR

        SELECT *
        FROM dbo.tblfintrans
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
        ORDER BY fslno;

    END IF;

END;
$BODY$;

ALTER PROCEDURE dbo.sp_pagesreceipt_det(character varying, character varying, character varying, character varying, character varying, character varying, smallint, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, numeric, numeric, character varying, character varying, boolean, character varying, character varying, jsonb, refcursor)
    OWNER TO postgres;