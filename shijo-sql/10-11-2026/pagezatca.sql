-- PROCEDURE: dbo.sp_pagezatcafilesubmission(character varying, smallint, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagezatcafilesubmission(character varying, smallint, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagezatcafilesubmission(
	IN p_strmode character varying,
	IN p_rdgdocument smallint,
	IN p_strinvtype character varying DEFAULT NULL::character varying,
	IN p_strfilter character varying DEFAULT NULL::character varying,
	IN p_strfinfilter character varying DEFAULT NULL::character varying,
	INOUT p_result refcursor DEFAULT 'zatcafilesubmission_cursor'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_strsql text;
    v_filter text;
    v_finfilter text;
BEGIN
    v_filter := COALESCE(NULLIF(TRIM(p_strfilter), ''), 'true');
    v_finfilter := COALESCE(NULLIF(TRIM(p_strfinfilter), ''), 'true');

    DROP TABLE IF EXISTS pg_temp.tblrptsalesdet;
    DROP TABLE IF EXISTS pg_temp.tblrptsales;

    CREATE TEMP TABLE tblrptsalesdet
    (
        fcoid varchar(3),
        fyear varchar(4) DEFAULT '0',
        fbrid varchar(3),
        fdoctype varchar(8),
        fdoctypeno varchar(20),
        forigdoctype varchar(8),
        fdocno varchar(15),
        fslno smallint DEFAULT 0,
        forderno integer DEFAULT 0,
        fdate timestamp without time zone,
        fcustomerid varchar(12),
        fcustomertypeid varchar(4),
        fbillingamtwovat numeric(18,2) DEFAULT 0,
        fscvatamt numeric(18,2) DEFAULT 0,
        fbillingamt numeric(18,2) DEFAULT 0,
        finvdatetime timestamp without time zone,
        finvrcntype varchar(5),
        fdebit numeric(18,2) DEFAULT 0,
        fcredit numeric(18,2) DEFAULT 0
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tblrptsales
    (
        fcoid varchar(3),
        fyear varchar(4) DEFAULT '0',
        fbrid varchar(3),
        fdoctype varchar(8),
        fdoctypeno varchar(20),
        forigdoctype varchar(8),
        fdocno varchar(15),
        fslno smallint DEFAULT 0,
        forderno integer DEFAULT 0,
        fdate timestamp without time zone,
        fcustomerid varchar(12),
        fcustomertypeid varchar(4),
        fbillingamtwovat numeric(18,2) DEFAULT 0,
        fscvatamt numeric(18,2) DEFAULT 0,
        fbillingamt numeric(18,2) DEFAULT 0,
        finvdatetime timestamp without time zone,
        finvrcntype varchar(5)
    ) ON COMMIT DROP;

    IF p_strmode = 'G' THEN

        IF p_rdgdocument = 0 THEN

            IF p_strinvtype IN ('SI', 'SR') THEN

                -- tblstocktrans: customer = fcsaccountid, flag = fzactcacleared (spelled so in the table)
                v_strsql := format(
                    'INSERT INTO tblrptsalesdet
                    (
                        fcoid, fyear, fbrid, forigdoctype, fdoctype,
                        fdocno, fdoctypeno, fslno, fdate, fcustomerid,
                        fbillingamtwovat, fscvatamt, fbillingamt,
                        finvdatetime
                    )
                    SELECT
                        fcoid, fyear, fbrid, fdoctype, fdoctype,
                        fdocno, fdoctypeno, fslno, fdate, fcsaccountid,
                        fnetdocamtwovat, fvatamt, fnetdocamt,
                        finvdatetime
                    FROM dbo.tblstocktrans
                    WHERE %s AND fzatcacleared = false',
                    v_filter
                );

                EXECUTE v_strsql;

                IF p_strinvtype = 'SI' THEN

                    -- tblfintrans: flag = fzatcacleared
                    v_strsql := format(
                        'INSERT INTO tblrptsalesdet
                        (
                            fcoid, fyear, fbrid, fdoctype,
                            fdocno, fdoctypeno, fslno, fdate, fcustomerid,
                            fbillingamtwovat, fscvatamt, fbillingamt,
                            finvdatetime, finvrcntype
                        )
                        SELECT
                            fcoid, fyear, fbrid, fdoctype,
                            fdocno, fdoctypeno, MIN(fslno), MAX(fdate),
                            MAX(faccountid), SUM(ftaxableamt), SUM(fvatamt),
                            SUM(fdebit), MAX(fcuserdate), MAX(finvrcntype)
                        FROM dbo.tblfintrans
                        WHERE %s
                          AND forigin = ''UI''
                          AND fzatcacleared = false
                        GROUP BY
                            fcoid, fyear, fbrid,
                            fdoctype, fdocno, fdoctypeno',
                        v_finfilter
                    );

                    EXECUTE v_strsql;

                END IF;
            END IF;

            IF p_strinvtype IN ('DN', 'CN') THEN

                v_strsql := format(
                    'INSERT INTO tblrptsalesdet
                    (
                        fcoid, fyear, fbrid, forigdoctype, fdoctype,
                        fdocno, fdoctypeno, fslno, fdate, fcustomerid,
                        fdebit, fcredit, fbillingamtwovat, fscvatamt,
                        finvdatetime, finvrcntype
                    )
                    SELECT
                        fcoid, fyear, fbrid, fdoctype, fdoctype,
                        fdocno, fdoctypeno, MIN(fslno), MAX(fdate),
                        MAX(faccountid), SUM(fdebit), SUM(fcredit),
                        SUM(ftaxableamt), SUM(COALESCE(fvatamt, 0)),
                        MAX(fcuserdate), MAX(finvrcntype)
                    FROM dbo.tblfintrans
                    WHERE %s
                      AND forigin = ''UI''
                      AND fzatcacleared = false
                    GROUP BY
                        fcoid, fyear, fbrid, fdoctype, fdocno, fdoctypeno',
                    v_finfilter
                );

                EXECUTE v_strsql;

                UPDATE tblrptsalesdet SET fbillingamt = fdebit  WHERE fdoctype = 'DN';
                UPDATE tblrptsalesdet SET fbillingamt = fcredit WHERE fdoctype = 'CN';

            END IF;

        ELSE

            -- All Documents: stock side (SI / SR)
            v_strsql := format(
                'INSERT INTO tblrptsalesdet
                (
                    fcoid, fyear, fbrid, forigdoctype, fdoctype,
                    fdocno, fdoctypeno, fslno, fdate, fcustomerid,
                    fbillingamtwovat, fscvatamt, fbillingamt,
                    finvdatetime
                )
                SELECT
                    fcoid, fyear, fbrid, fdoctype, fdoctype,
                    fdocno, fdoctypeno, fslno, fdate, fcsaccountid,
                    fnetdocamtwovat, fvatamt, fnetdocamt,
                    finvdatetime
                FROM dbo.tblstocktrans
                WHERE %s
                  AND fdoctype IN (''SI'', ''SR'')
                  AND fzactcacleared = false',
                v_filter
            );

            EXECUTE v_strsql;

            -- All Documents: finance side, same as the One Document SI branch
            v_strsql := format(
                'INSERT INTO tblrptsalesdet
                (
                    fcoid, fyear, fbrid, fdoctype,
                    fdocno, fdoctypeno, fslno, fdate, fcustomerid,
                    fbillingamtwovat, fscvatamt, fbillingamt,
                    finvdatetime, finvrcntype
                )
                SELECT
                    fcoid, fyear, fbrid, fdoctype,
                    fdocno, fdoctypeno, MIN(fslno), MAX(fdate),
                    MAX(faccountid), SUM(ftaxableamt), SUM(fvatamt),
                    SUM(fdebit), MAX(fcuserdate), MAX(finvrcntype)
                FROM dbo.tblfintrans
                WHERE %s
                  AND fdoctype = ''SI''
                  AND forigin = ''UI''
                  AND fzatcacleared = false
                GROUP BY
                    fcoid, fyear, fbrid,
                    fdoctype, fdocno, fdoctypeno',
                v_finfilter
            );

            EXECUTE v_strsql;

            -- All Documents: DN / CN
            v_strsql := format(
                'INSERT INTO tblrptsalesdet
                (
                    fcoid, fyear, fbrid, forigdoctype, fdoctype,
                    fdocno, fdoctypeno, fslno, fdate, fcustomerid,
                    fdebit, fcredit, fbillingamtwovat, fscvatamt,
                    finvdatetime, finvrcntype
                )
                SELECT
                    fcoid, fyear, fbrid, fdoctype, fdoctype,
                    fdocno, fdoctypeno, MIN(fslno), MAX(fdate),
                    MAX(faccountid), SUM(fdebit), SUM(fcredit),
                    SUM(ftaxableamt), SUM(COALESCE(fvatamt, 0)),
                    MAX(fcuserdate), MAX(finvrcntype)
                FROM dbo.tblfintrans
                WHERE %s
                  AND fdoctype IN (''DN'', ''CN'')
                  AND forigin = ''UI''
                  AND fzatcacleared = false
                GROUP BY
                    fcoid, fyear, fbrid, fdoctype, fdocno, fdoctypeno',
                v_finfilter
            );

            EXECUTE v_strsql;

            UPDATE tblrptsalesdet SET fbillingamt = fdebit  WHERE fdoctype = 'DN';
            UPDATE tblrptsalesdet SET fbillingamt = fcredit WHERE fdoctype = 'CN';

        END IF;

        UPDATE tblrptsalesdet SET finvrcntype = 'ST' WHERE fdoctype IN ('SI', 'SR');
        UPDATE tblrptsalesdet SET finvrcntype = 'ST' WHERE fdoctype = 'DNSIR';

        UPDATE tblrptsalesdet
        SET fcustomertypeid = dbo.getbusinesstype(fcoid, fcustomerid);

        INSERT INTO tblrptsales
        (
            fcoid, fyear, fbrid, forigdoctype, fdoctype,
            fdocno, fdoctypeno, fdate, finvdatetime,
            fcustomerid, fbillingamtwovat, fscvatamt,
            fbillingamt, fcustomertypeid, finvrcntype
        )
        SELECT
            fcoid, fyear, fbrid, forigdoctype, fdoctype,
            fdocno, fdoctypeno,
            MAX(fdate), MAX(finvdatetime),
            MAX(fcustomerid), MAX(fbillingamtwovat), MAX(fscvatamt),
            MAX(fbillingamt), MAX(fcustomertypeid), MAX(finvrcntype)
        FROM tblrptsalesdet
        GROUP BY
            fcoid, fyear, fbrid, forigdoctype, fdoctype, fdocno, fdoctypeno;

        UPDATE tblrptsales SET forderno = 1 WHERE fdoctype = 'SI';
        UPDATE tblrptsales SET forderno = 2 WHERE fdoctype = 'SR';
        UPDATE tblrptsales SET forderno = 3 WHERE fdoctype = 'DN';
        UPDATE tblrptsales SET forderno = 4 WHERE fdoctype = 'CN';

        OPEN p_result FOR
        SELECT
            a.fcoid,
            a.fyear,
            a.fbrid,
            a.forigdoctype,
            a.fdoctype,
            a.fdocno,
            a.fdoctypeno,
            ROW_NUMBER() OVER (ORDER BY a.fdate, a.forderno, a.fbrid) AS fslno,
            a.fcustomerid,
            a.fcustomertypeid,
            b.faccountname,
            a.fbillingamtwovat,
            a.fscvatamt,
            a.fbillingamt,
            TO_CHAR(a.fdate, 'YYYY-MM-DD') AS fdate,
            TO_CHAR(a.fdate, 'YYYY-MM-DD') AS finvfromdate,
            TO_CHAR(a.fdate, 'YYYY-MM-DD') AS finvtodate,
            TO_CHAR(a.finvdatetime, 'YYYY-MM-DD HH24:MI:SS') AS finvdatetime,
            a.finvrcntype
        FROM tblrptsales a
        LEFT JOIN dbo.tblaccount b
            ON a.fcoid = b.fcoid
           AND a.fcustomerid = b.faccountid
        ORDER BY a.fdate, a.forderno, a.fbrid;

    END IF;
END;
$BODY$;
ALTER PROCEDURE dbo.sp_pagezatcafilesubmission(character varying, smallint, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

