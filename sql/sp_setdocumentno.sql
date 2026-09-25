CREATE OR REPLACE PROCEDURE dbo.sp_setdocumentno(
    p_strmode                 varchar(5),
    p_pstrcoid                varchar(3),
    p_pstryear                varchar(4),
    p_strbrid                 varchar(3),
    p_strmoduleid              varchar(4),
    p_strdoctype               varchar(5)  DEFAULT NULL,
    p_strdocnoprefix           varchar(8)  DEFAULT NULL,
    p_strstartseqno            varchar(6)  DEFAULT NULL,
    p_blnstrictserialseqno     boolean     DEFAULT false,
    p_strseqnoincrementmode    varchar(6)  DEFAULT NULL,
    p_strseqnoresetmode        varchar(6)  DEFAULT NULL,
    p_blnprintaftersave        smallint    DEFAULT 0,
    p_intpositionno            smallint    DEFAULT 1,
    p_original_fdoctype        varchar(5)  DEFAULT NULL,
    p_pstruserid                varchar(30) DEFAULT NULL,
    p_result_cursor             refcursor   DEFAULT 'cur_setdocumentno'
)
LANGUAGE plpgsql
AS $$
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
$$;
