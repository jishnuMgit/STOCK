-- PROCEDURE: dbo.sp_pagesetdocumentno(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_pstryear character varying, IN p_strbrid character varying, IN p_strmoduleid character varying, IN p_strdoctype character varying, IN p_strdocnoprefix character varying, IN p_strstartseqno character varying, IN p_blnstrictserialseqno boolean, IN p_strseqnoincrementmode character varying, IN p_strseqnoresetmode character varying, IN p_blnprintaftersave smallint, IN p_intpositionno smallint, IN p_original_fdoctype character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagesetdocumentno(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_pstryear character varying, IN p_strbrid character varying, IN p_strmoduleid character varying, IN p_strdoctype character varying, IN p_strdocnoprefix character varying, IN p_strstartseqno character varying, IN p_blnstrictserialseqno boolean, IN p_strseqnoincrementmode character varying, IN p_strseqnoresetmode character varying, IN p_blnprintaftersave smallint, IN p_intpositionno smallint, IN p_original_fdoctype character varying, IN p_pstruserid character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagesetdocumentno(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_pstryear character varying, IN p_strbrid character varying, IN p_strmoduleid character varying, IN p_strdoctype character varying DEFAULT NULL::character varying, IN p_strdocnoprefix character varying DEFAULT NULL::character varying, IN p_strstartseqno character varying DEFAULT NULL::character varying, IN p_blnstrictserialseqno boolean DEFAULT false, IN p_strseqnoincrementmode character varying DEFAULT NULL::character varying, IN p_strseqnoresetmode character varying DEFAULT NULL::character varying, IN p_blnprintaftersave smallint DEFAULT 0, IN p_intpositionno smallint DEFAULT 1, IN p_original_fdoctype character varying DEFAULT NULL::character varying, IN p_pstruserid character varying DEFAULT NULL::character varying, IN p_result_cursor refcursor DEFAULT 'cur_setdocumentno'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_nextyear varchar(4);
BEGIN

    v_nextyear := (p_pstryear::integer + 1)::varchar;

    /* =====================================================
       MODE G — GET
    ===================================================== */

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                fdoctype,
                fdocnoprefix,
                fstartseqno,
                fstrictserialseqno,
                fseqnoincrementmode,
                fseqnoresetmode,
                fprintaftersave
            FROM dbo.tbldocumentno
            WHERE fcoid = p_pstrcoid
              AND fyear = p_pstryear
              AND fbrid = p_strbrid
              AND fmoduleid = p_strmoduleid
            ORDER BY fpositionno;

    END IF;

    /* =====================================================
       MODE GNY — GET NEXT YEAR (Copy To Next Year preview)
    ===================================================== */

    IF p_strmode = 'GNY' THEN

        OPEN p_result_cursor FOR
            SELECT
                fdoctype,
                fdocnoprefix,
                fstartseqno,
                fstrictserialseqno,
                fseqnoincrementmode,
                fseqnoresetmode,
                fprintaftersave
            FROM dbo.tbldocumentno
            WHERE fcoid = p_pstrcoid
              AND fyear = v_nextyear
              AND fbrid = p_strbrid
              AND fmoduleid = p_strmoduleid;

    END IF;

    /* =====================================================
       MODE S — SAVE (insert one document type's rule)
    ===================================================== */

    IF p_strmode = 'S' THEN

        INSERT INTO dbo.tbldocumentno (
            fcoid,
            fyear,
            fbrid,
            fdoctype,
            fmoduleid,
            fdocnoprefix,
            fstartseqno,
            fseqnolen,
            fdocnolen,
            fstrictserialseqno,
            fseqnoincrementmode,
            fseqnoresetmode,
            fprintaftersave,
            fcuserid,
            fcuserdate
        )
        VALUES (
            p_pstrcoid,
            p_pstryear,
            p_strbrid,
            p_strdoctype,
            p_strmoduleid,
            p_strdocnoprefix,
            p_strstartseqno,
            LENGTH(p_strstartseqno),
            LENGTH(p_strdocnoprefix) + LENGTH(p_strstartseqno),
            COALESCE(p_blnstrictserialseqno, false),
            p_strseqnoincrementmode,
            p_strseqnoresetmode,
            COALESCE(p_blnprintaftersave, 0),
            p_pstruserid,
            now()
        );

    END IF;

    /* =====================================================
       MODE M — MODIFY
    ===================================================== */

    IF p_strmode = 'M' THEN

        UPDATE dbo.tbldocumentno
        SET
            fdoctype            = p_strdoctype,
            fdocnoprefix        = p_strdocnoprefix,
            fstartseqno         = p_strstartseqno,
            fseqnolen           = LENGTH(p_strstartseqno),
            fdocnolen           = LENGTH(p_strdocnoprefix) + LENGTH(p_strstartseqno),
            fstrictserialseqno  = COALESCE(p_blnstrictserialseqno, false),
            fseqnoincrementmode = p_strseqnoincrementmode,
            fseqnoresetmode     = p_strseqnoresetmode,
            fprintaftersave     = COALESCE(p_blnprintaftersave, 0),
            fmuserid            = p_pstruserid,
            fmuserdate          = now()
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fmoduleid = p_strmoduleid
          AND fdoctype = p_original_fdoctype;

    END IF;

    /* =====================================================
       MODE D1 — DELETE ONE
    ===================================================== */

    IF p_strmode = 'D1' THEN

        DELETE FROM dbo.tbldocumentno
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fmoduleid = p_strmoduleid
          AND fdoctype = p_original_fdoctype;

    END IF;

    /* =====================================================
       MODE D — DELETE ALL (for this Co/Year/Branch/Module)
    ===================================================== */

    IF p_strmode = 'D' THEN

        DELETE FROM dbo.tbldocumentno
        WHERE fcoid = p_pstrcoid
          AND fyear = p_pstryear
          AND fbrid = p_strbrid
          AND fmoduleid = p_strmoduleid;

    END IF;

    /* =====================================================
       MODE DNY — DELETE NEXT YEAR
    ===================================================== */

    IF p_strmode = 'DNY' THEN

        DELETE FROM dbo.tbldocumentno
        WHERE fcoid = p_pstrcoid
          AND fyear = v_nextyear
          AND fbrid = p_strbrid
          AND fmoduleid = p_strmoduleid;

    END IF;

END;
$procedure$;
