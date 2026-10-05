-- Settings/FinanceSetting (converted from SQL Server
-- SP_frmFinSetting). Company before user, as everywhere else.
--
-- Modes
--   G   the saved parameter -> account rows of this company
--   S1  insert one row
--   M1  update one row   (found by its ORIGINAL type + slno, because
--                         the row's own type / slno may be what changed)
--   D1  delete one row   (found by its ORIGINAL type + slno)
CREATE OR REPLACE PROCEDURE dbo.sp_pagefinancesetting(
    p_strmode           varchar(3),
    p_pstrcoid          varchar(3),
    p_intslno           smallint    DEFAULT 0,
    p_strtype           varchar(10) DEFAULT NULL,
    p_straccountid      varchar(12) DEFAULT NULL,
    p_strgph            varchar(1)  DEFAULT NULL,
    p_intoriginal_slno  smallint    DEFAULT 0,
    p_stroriginal_type  varchar(10) DEFAULT NULL,
    p_pstruserid        varchar(20) DEFAULT NULL,
    p_result_cursor     refcursor   DEFAULT 'cur_finsetting'
)
LANGUAGE plpgsql
AS $$
BEGIN

    /* =====================================================
       MODE G - GET
    ===================================================== */

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                fslno,
                ftype,
                faccountid,
                fgph
            FROM dbo.tblfinsetting
            WHERE fcoid = p_pstrcoid
            ORDER BY fslno;

    END IF;


    /* =====================================================
       MODE S1 - INSERT
    ===================================================== */

    IF p_strmode = 'S1' THEN

        INSERT INTO dbo.tblfinsetting (
            fcoid, fslno, ftype, faccountid, fgph, fuserid, fuserdate
        )
        VALUES (
            p_pstrcoid, p_intslno, p_strtype, p_straccountid, p_strgph,
            p_pstruserid, now()
        );

    END IF;


    /* =====================================================
       MODE M1 - MODIFY
    ===================================================== */

    IF p_strmode = 'M1' THEN

        UPDATE dbo.tblfinsetting
        SET
            fslno      = p_intslno,
            ftype      = p_strtype,
            faccountid = p_straccountid,
            fgph       = p_strgph,
            fuserid    = p_pstruserid,
            fuserdate  = now()
        WHERE fcoid = p_pstrcoid
          AND ftype = p_stroriginal_type
          AND fslno = p_intoriginal_slno;

    END IF;


    /* =====================================================
       MODE D1 - DELETE
    ===================================================== */

    IF p_strmode = 'D1' THEN

        DELETE FROM dbo.tblfinsetting
        WHERE fcoid = p_pstrcoid
          AND ftype = p_stroriginal_type
          AND fslno = p_intoriginal_slno;

    END IF;

END;
$$;
