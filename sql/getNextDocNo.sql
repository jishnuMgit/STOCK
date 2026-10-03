-- FUNCTION: dbo.getnextdocno(character varying, character varying, character varying, character varying)

-- DROP FUNCTION IF EXISTS dbo.getnextdocno(character varying, character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION dbo.getnextdocno(
	p_strcoid character varying,
	p_stryear character varying,
	p_strbrid character varying,
	p_strdoctype character varying)
    RETURNS TABLE(fdocno character varying, fdocnolen smallint) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
DECLARE
    v_last_doc_no   VARCHAR(14);
    v_next_doc_no   VARCHAR(14);
    v_doc_no_prefix VARCHAR(8);
    v_seq_no_len    SMALLINT;
    v_start_seq_no  VARCHAR(10);
    v_next_seq_no   BIGINT;
BEGIN

    ------------------------------------------------------------
    -- GET LAST DOCUMENT NUMBER
    ------------------------------------------------------------

    IF p_strdoctype IN
       ('BR', 'CR', 'BP', 'CP', 'JV', 'DN', 'CN', 'SINV', 'SCN')
    THEN

        SELECT MAX(t.fdocno)
        INTO v_last_doc_no
        FROM dbo.tblfintrans t
        WHERE t.fcoid = p_strcoid
          AND t.fyear = p_stryear
          AND t.fbrid = p_strbrid
          AND t.fdoctype = p_strdoctype;

    ELSIF p_strdoctype IN
          ('PI', 'PR', 'SI', 'SR', 'ST', 'ADJ')
    THEN

        SELECT MAX(t.fdocno)
        INTO v_last_doc_no
        FROM dbo.tblstocktrans t
        WHERE t.fcoid = p_strcoid
          AND t.fyear = p_stryear
          AND t.fbrid = p_strbrid
          AND t.fdoctype = p_strdoctype;

    ELSE

        RAISE EXCEPTION
            'Invalid document type: %',
            p_strdoctype;

    END IF;

    ------------------------------------------------------------
    -- GET DOCUMENT NUMBER SETTINGS
    ------------------------------------------------------------

    SELECT
        d.fdocnoprefix,
        d.fseqnolen,
        d.fstartseqno
    INTO
        v_doc_no_prefix,
        v_seq_no_len,
        v_start_seq_no
    FROM dbo.tbldocumentno d
    WHERE d.fcoid = p_strcoid
      AND d.fyear = p_stryear
      AND d.fbrid = p_strbrid
      AND d.fdoctype = p_strdoctype
    LIMIT 1;

    ------------------------------------------------------------
    -- VALIDATE DOCUMENT CONFIGURATION
    ------------------------------------------------------------

    IF NOT FOUND
       OR v_doc_no_prefix IS NULL
       OR v_seq_no_len IS NULL
       OR v_start_seq_no IS NULL
    THEN

        RAISE EXCEPTION
            'Document configuration not found or incomplete. Company: %, Year: %, Branch: %, Type: %',
            p_strcoid,
            p_stryear,
            p_strbrid,
            p_strdoctype;

    END IF;

    ------------------------------------------------------------
    -- GENERATE FIRST DOCUMENT NUMBER
    ------------------------------------------------------------

    IF v_last_doc_no IS NULL THEN

        v_next_doc_no :=
            v_doc_no_prefix ||
            LPAD(
                TRIM(v_start_seq_no),
                v_seq_no_len,
                '0'
            );

    ------------------------------------------------------------
    -- GENERATE NEXT DOCUMENT NUMBER
    ------------------------------------------------------------

    ELSE

        IF v_last_doc_no NOT LIKE v_doc_no_prefix || '%' THEN

            RAISE EXCEPTION
                'Invalid document number %. Expected prefix %',
                v_last_doc_no,
                v_doc_no_prefix;

        END IF;

        v_next_seq_no :=
            SUBSTRING(
                v_last_doc_no
                FROM LENGTH(v_doc_no_prefix) + 1
            )::BIGINT + 1;

        v_next_doc_no :=
            v_doc_no_prefix ||
            LPAD(
                v_next_seq_no::VARCHAR,
                v_seq_no_len,
                '0'
            );

    END IF;

    ------------------------------------------------------------
    -- RETURN DOCUMENT NUMBER AND ACTUAL LENGTH
    ------------------------------------------------------------

    fdocno := v_next_doc_no;
    fdocnolen := LENGTH(v_next_doc_no);

    RETURN NEXT;

END;
$BODY$;

ALTER FUNCTION dbo.getnextdocno(character varying, character varying, character varying, character varying)
    OWNER TO postgres;

