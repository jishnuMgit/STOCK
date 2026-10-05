-- Settings/SetPostingAccount (converted from SQL Server
-- SP_frmSetPostingAccount). Company before user, as everywhere else.
--
-- Modes
--   G   the 11 saved account ids for this company + branch
--   S   insert a new company + branch row
--   M   update the 11 account ids of an existing row
CREATE OR REPLACE PROCEDURE dbo.sp_pagesetpostingaccount(
    p_strmode                   varchar(1),
    p_pstrcoid                  varchar(3),
    p_strbrid                   varchar(3),
    p_strcashsupplieraccountid  varchar(12) DEFAULT NULL,
    p_strcashcustomeraccountid  varchar(12) DEFAULT NULL,
    p_strstockaccountid         varchar(12) DEFAULT NULL,
    p_strsalesaccountid         varchar(12) DEFAULT NULL,
    p_strsalesretaccountid      varchar(12) DEFAULT NULL,
    p_strsalescostaccountid     varchar(12) DEFAULT NULL,
    p_strsalesretcostaccountid  varchar(12) DEFAULT NULL,
    p_strstockadjaccountid      varchar(12) DEFAULT NULL,
    p_strroundoffaccountid      varchar(12) DEFAULT NULL,
    p_strinputvataccountid      varchar(12) DEFAULT NULL,
    p_stroutputvataccountid     varchar(12) DEFAULT NULL,
    p_pstruserid                varchar(30) DEFAULT NULL,
    p_result_cursor             refcursor   DEFAULT 'cur_setpostingaccount'
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
                fcashsupplieraccountid,
                fcashcustomeraccountid,
                fstockaccountid,
                fsalesaccountid,
                fsalesretaccountid,
                fsalescostaccountid,
                fsalesretcostaccountid,
                fstockadjaccountid,
                froundoffaccountid,
                finputvataccountid,
                foutputvataccountid
            FROM dbo.tblsetpostingaccount
            WHERE fcoid = p_pstrcoid
              AND fbrid = p_strbrid;

    END IF;


    /* =====================================================
       MODE S - SAVE (new company + branch row)
    ===================================================== */

    IF p_strmode = 'S' THEN

        INSERT INTO dbo.tblsetpostingaccount (
            fcoid, fbrid,
            fcashsupplieraccountid, fcashcustomeraccountid,
            fstockaccountid, fsalesaccountid, fsalesretaccountid,
            fsalescostaccountid, fsalesretcostaccountid,
            fstockadjaccountid, froundoffaccountid,
            finputvataccountid, foutputvataccountid,
            fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_strbrid,
            p_strcashsupplieraccountid, p_strcashcustomeraccountid,
            p_strstockaccountid, p_strsalesaccountid, p_strsalesretaccountid,
            p_strsalescostaccountid, p_strsalesretcostaccountid,
            p_strstockadjaccountid, p_strroundoffaccountid,
            p_strinputvataccountid, p_stroutputvataccountid,
            p_pstruserid, now()
        );

    END IF;


    /* =====================================================
       MODE M - MODIFY
    ===================================================== */

    IF p_strmode = 'M' THEN

        UPDATE dbo.tblsetpostingaccount
        SET
            fcashsupplieraccountid = p_strcashsupplieraccountid,
            fcashcustomeraccountid = p_strcashcustomeraccountid,
            fstockaccountid        = p_strstockaccountid,
            fsalesaccountid        = p_strsalesaccountid,
            fsalesretaccountid     = p_strsalesretaccountid,
            fsalescostaccountid    = p_strsalescostaccountid,
            fsalesretcostaccountid = p_strsalesretcostaccountid,
            fstockadjaccountid     = p_strstockadjaccountid,
            froundoffaccountid     = p_strroundoffaccountid,
            finputvataccountid     = p_strinputvataccountid,
            foutputvataccountid    = p_stroutputvataccountid,
            fmuserid               = p_pstruserid,
            fmuserdate             = now()
        WHERE fcoid = p_pstrcoid
          AND fbrid = p_strbrid;

    END IF;

END;
$$;
