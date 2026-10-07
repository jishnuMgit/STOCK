-- Settings/SetChartOfAccount (menu 9110 "Set Chart Of Account").
-- Maps a parameter (CASH, BANK, A/R, A/P ...) to the accounts used for
-- it, per company - table dbo.tblcoasetting. Company before user, as
-- everywhere else.
--
-- Modes
--   G   the saved parameter -> account rows of this company
--   S1  insert one row                    (fcuserid / fcuserdate)
--   M1  update one row                    (fmuserid / fmuserdate)
--       found by its ORIGINAL type + slno, because the row's own
--       type / slno may be what changed
--   D1  delete one row (found by its ORIGINAL type + slno)
CREATE OR REPLACE PROCEDURE dbo.sp_pagesetchartofaccount(
    p_strmode           varchar(3),
    p_pstrcoid          varchar(3),
    p_intslno           smallint    DEFAULT 0,
    p_strtype           varchar(10) DEFAULT NULL,
    p_straccountid      varchar(12) DEFAULT NULL,
    p_strgph            varchar(1)  DEFAULT NULL,
    p_intoriginal_slno  smallint    DEFAULT 0,
    p_stroriginal_type  varchar(10) DEFAULT NULL,
    p_pstruserid        varchar(30) DEFAULT NULL,
    p_result_cursor     refcursor   DEFAULT 'cur_setchartofaccount'
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
                fgaccountid,
                fgph
            FROM dbo.tblcoasetting
            WHERE fcoid = p_pstrcoid
            ORDER BY fslno;

    END IF;


    /* =====================================================
       MODE S1 - INSERT
    ===================================================== */

    IF p_strmode = 'S1' THEN

        INSERT INTO dbo.tblcoasetting (
            fcoid, fslno, ftype, fgaccountid, fgph, fcuserid, fcuserdate
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

        UPDATE dbo.tblcoasetting
        SET
            fslno       = p_intslno,
            ftype       = p_strtype,
            fgaccountid = p_straccountid,
            fgph        = p_strgph,
            fmuserid    = p_pstruserid,
            fmuserdate  = now()
        WHERE fcoid = p_pstrcoid
          AND ftype = p_stroriginal_type
          AND fslno = p_intoriginal_slno;

    END IF;


    /* =====================================================
       MODE D1 - DELETE
    ===================================================== */

    IF p_strmode = 'D1' THEN

        DELETE FROM dbo.tblcoasetting
        WHERE fcoid = p_pstrcoid
          AND ftype = p_stroriginal_type
          AND fslno = p_intoriginal_slno;

    END IF;

END;
$$;
