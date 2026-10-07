-- PROCEDURE: dbo.sp_pagesetpostingaccount(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagesetpostingaccount(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagesetpostingaccount(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_strbrid character varying,
	IN p_strcashsupplieraccountid character varying DEFAULT NULL::character varying,
	IN p_strcashcustomeraccountid character varying DEFAULT NULL::character varying,
	IN p_strstockaccountid character varying DEFAULT NULL::character varying,
	IN p_strsalesaccountid character varying DEFAULT NULL::character varying,
	IN p_strsalesretaccountid character varying DEFAULT NULL::character varying,
	IN p_strsalescostaccountid character varying DEFAULT NULL::character varying,
	IN p_strsalesretcostaccountid character varying DEFAULT NULL::character varying,
	IN p_strstockadjaccountid character varying DEFAULT NULL::character varying,
	IN p_strroundoffaccountid character varying DEFAULT NULL::character varying,
	IN p_strinputvataccountid character varying DEFAULT NULL::character varying,
	IN p_stroutputvataccountid character varying DEFAULT NULL::character varying,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	IN p_result_cursor refcursor DEFAULT 'cur_setpostingaccount'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
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
$BODY$;
ALTER PROCEDURE dbo.sp_pagesetpostingaccount(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, refcursor)
    OWNER TO postgres;

