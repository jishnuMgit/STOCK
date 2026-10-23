CREATE OR REPLACE PROCEDURE dbo.sp_frmpiexp(
    IN p_strmode VARCHAR(5),
    IN p_gstrcoid VARCHAR(3),
    IN p_gintyear SMALLINT,
    IN p_strbrid VARCHAR(3),
    IN p_strdoctype VARCHAR(5),
    IN p_strdocno VARCHAR(15),
    IN p_intdocno INTEGER DEFAULT 0,
    IN p_dtpdate TIMESTAMP DEFAULT NULL,
    IN p_intslno SMALLINT DEFAULT 0,
    IN p_straccountid VARCHAR(12) DEFAULT NULL,
    IN p_strccid VARCHAR(8) DEFAULT NULL,
    IN p_strcurrency VARCHAR(8) DEFAULT NULL,
    IN p_numcurrencyrate NUMERIC(18,4) DEFAULT 0,
    IN p_numcreditfc NUMERIC(18,2) DEFAULT 0,
    IN p_numcredit NUMERIC(18,2) DEFAULT 0,
    IN p_strdescription VARCHAR(100) DEFAULT NULL,
    IN p_original_fslno SMALLINT DEFAULT 0,
    IN p_gstruserid VARCHAR(20) DEFAULT NULL
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_strccid VARCHAR(8);
BEGIN

    -- isnullorempty returns boolean: cast before comparing
    IF COALESCE(dbo.isnullorempty(p_strccid)::int, 1) = 0 THEN
        v_strccid := p_strccid;
    ELSE
        v_strccid := '';
    END IF;

    -- Modes G / GP removed: a PROCEDURE cannot return rows.
    -- The backend reads tblfintrans directly (GET /purchase-invoice/expense).

    IF p_strmode = 'S' THEN

        -- Column changes vs the SQL Server version:
        --   fintdocno      -> fdoctypeno   (varchar)
        --   fuserid        -> fcuserid
        --   fuserdate      -> fcuserdate
        --   fdebitfc, fcreditfc, fcurrency, fcurrencyrate -> not in tblfintrans
        --   fpost, fyearclose are boolean -> false instead of 0
        INSERT INTO dbo.tblfintrans (
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fdocno,
            fdoctypeno,
            fdate,
            fslno,
            faccountid,
            fccid,
            fdebit,
            fcredit,
            fpost,
            fyearclose,
            fdescription,
            forigin,
            fcuserid,
            fcuserdate
        )
        VALUES (
            p_gstrcoid,
            p_gintyear::text,
            p_strbrid,
            p_strdoctype,
            p_strdocno,
            p_intdocno::text,
            p_dtpdate,
            p_intslno,
            p_straccountid,
            v_strccid,
            0,
            COALESCE(p_numcredit, 0),
            false,
            false,
            p_strdescription,
            'GS',
            p_gstruserid,
            CURRENT_TIMESTAMP
        );

        -- isap: same boolean/integer issue
        IF COALESCE(dbo.isap(p_gstrcoid, p_straccountid)::int, 0) = 1 THEN

            INSERT INTO dbo.tblarap (
                fcoid,
                fyear,
                fbrid,
                fdoctype,
                fdocno,
                fdoctypeno,
                fdate,
                fdescription,
                fslno,
                faccountid,
                fdebit,
                fcredit,
                fdocamt,
                fpost,
                fstatus,
                fcuserid,
                fcuserdate
            )
            VALUES (
                p_gstrcoid,
                p_gintyear::text,
                p_strbrid,
                p_strdoctype,
                p_strdocno,
                p_intdocno::text,
                p_dtpdate,
                p_strdescription,
                p_intslno,
                p_straccountid,
                0,
                COALESCE(p_numcredit, 0),
                COALESCE(p_numcredit, 0),
                false,
                'N',
                p_gstruserid,
                CURRENT_TIMESTAMP
            );

        END IF;

    ELSIF p_strmode = 'D1' THEN

        -- fyear is varchar in the tables, p_gintyear is smallint: compare as text
        DELETE FROM dbo.tblfintrans
        WHERE fcoid = p_gstrcoid
          AND fyear::text = p_gintyear::text
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND fslno > 0;

        DELETE FROM dbo.tblarap
        WHERE fcoid = p_gstrcoid
          AND fyear::text = p_gintyear::text
          AND fbrid = p_strbrid
          AND fdoctype = p_strdoctype
          AND fdocno = p_strdocno
          AND fslno > 0;

    END IF;

END;
$procedure$;