-- =====================================================================
-- dbo.sp_pagecustomerdivision - the Customer Division screen (Finance > Setup > Customer Division)
-- the port of the old SP_frmCustDivision
--
--   G  the divisions of one customer  (cursor: fdivid, fdivname, fdivname_ar)
--   S  save a new division
--   M  modify a division (p_txtoriginaldivisionid finds the row, so the ID itself can be changed)
--   D  delete a division (p_txtoriginaldivisionid)
--
-- The screen sends only the changed rows, one call each, in ONE transaction (the backend): any error rolls all back.
-- The rules are here, so they hold whoever calls it:
--   * Division ID and Division Name must be unique within the customer
--   * a division that transactions already use cannot be deleted, and its ID cannot be changed
-- A rule that fails is a RAISE EXCEPTION (SQLSTATE P0001) whose message the screen shows as it is.
--
-- The table (dbo.tblcustdivision): fcoid, fcustomerid, fdivid varchar(8), fdivname varchar(60), fdivname_ar varchar(60),
-- fcuserid / fcuserdate = created by, fmuserid / fmuserdate = modified by.
--
-- Parameter order: the name of the screen and the user that works are last (p_pstruserid just before the cursor).
-- A different signature than an older install -> the old one is dropped first (CREATE OR REPLACE cannot rename or
-- move arguments).
-- =====================================================================

DROP PROCEDURE IF EXISTS dbo.sp_pagecustdivision(varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, refcursor);
DROP PROCEDURE IF EXISTS dbo.sp_pagecustomerdivision;

CREATE OR REPLACE PROCEDURE dbo.sp_pagecustomerdivision
(
    IN    p_strmode                      varchar(1),
    IN    p_pstrcoid                     varchar(3),
    IN    p_lkpcsaccountid               varchar(12) DEFAULT NULL,
    IN    p_txtdivisionid                varchar(8)  DEFAULT NULL,
    IN    p_txtdivisionname              varchar(60) DEFAULT NULL,
    IN    p_txtdivisionname_ar            varchar(60) DEFAULT NULL,
    IN    p_txtoriginaldivisionid        varchar(8)  DEFAULT NULL,
    IN    p_txtoriginaldivisionname      varchar(60) DEFAULT NULL,
    IN    p_txtoriginaldivisionname_ar    varchar(60) DEFAULT NULL,
    IN    p_pstrscreenname               varchar(50) DEFAULT NULL,
    IN    p_pstruserid                   varchar(20) DEFAULT NULL,
    INOUT p_result                       refcursor   DEFAULT 'custdivision_cursor'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id      text := BTRIM(p_txtdivisionid);
    v_name    text := NULLIF(BTRIM(p_txtdivisionname), '');
    v_name_ar  text := NULLIF(BTRIM(p_txtdivisionname_ar), '');
    v_note    varchar(2000);
BEGIN

    -- the lengths of the columns: a message, not a database error
    IF p_strmode IN ('S', 'M') THEN
        IF LENGTH(v_id) > 8 THEN
            RAISE EXCEPTION 'Division ID can be 8 characters at most';
        END IF;
        IF LENGTH(v_name) > 60 THEN
            RAISE EXCEPTION 'Division Name can be 60 characters at most';
        END IF;
        IF LENGTH(v_name_ar) > 60 THEN
            RAISE EXCEPTION 'Division Name (Arabic) can be 60 characters at most';
        END IF;
    END IF;

    -- ---------------------------------------------------------------- GET
    IF p_strmode = 'G' THEN

        OPEN p_result FOR
        SELECT d.fdivid,
               d.fdivname,
               d.fdivname_ar
          FROM dbo.tblcustdivision AS d
         WHERE d.fcoid = p_pstrcoid
           AND d.fcustomerid = p_lkpcsaccountid
         ORDER BY d.fdivid;

    -- --------------------------------------------------------------- SAVE
    ELSIF p_strmode = 'S' THEN

        IF COALESCE(BTRIM(p_lkpcsaccountid), '') = '' THEN
            RAISE EXCEPTION 'Please select ''Customer''';
        END IF;
        IF COALESCE(BTRIM(p_txtdivisionid), '') = '' OR v_name IS NULL THEN
            RAISE EXCEPTION 'Division ID and Division Name are both required';
        END IF;

        IF EXISTS (SELECT 1 FROM dbo.tblcustdivision
                    WHERE fcoid = p_pstrcoid AND fcustomerid = p_lkpcsaccountid AND fdivid = p_txtdivisionid) THEN
            RAISE EXCEPTION '''Division ID'' already exists (%)', p_txtdivisionid;
        END IF;
        IF EXISTS (SELECT 1 FROM dbo.tblcustdivision
                    WHERE fcoid = p_pstrcoid AND fcustomerid = p_lkpcsaccountid AND LOWER(fdivname) = LOWER(v_name)) THEN
            RAISE EXCEPTION '''Division Name'' already exists (%)', v_name;
        END IF;

        INSERT INTO dbo.tblcustdivision
               (fcoid, fcustomerid, fdivid, fdivname, fdivname_ar, fcuserid, fcuserdate)
        VALUES (p_pstrcoid, p_lkpcsaccountid, p_txtdivisionid, v_name, v_name_ar, p_pstruserid, CURRENT_TIMESTAMP);

        v_note := 'Customer ID : ' || p_lkpcsaccountid
               || CHR(13) || CHR(10) || 'Division ID : ' || p_txtdivisionid
               || CHR(13) || CHR(10) || 'Division Name : ' || COALESCE(v_name, '')
               || CHR(13) || CHR(10) || 'Division Name (Arabic) : ' || COALESCE(v_name_ar, '');

        CALL dbo.sp_useraudit(p_pstrcoid, '', '', '', p_txtdivisionid, p_pstrscreenname, 'S', v_note, p_pstruserid);

    -- ------------------------------------------------------------- MODIFY
    ELSIF p_strmode = 'M' THEN

        IF COALESCE(BTRIM(p_txtdivisionid), '') = '' OR v_name IS NULL THEN
            RAISE EXCEPTION 'Division ID and Division Name are both required';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM dbo.tblcustdivision
                        WHERE fcoid = p_pstrcoid AND fcustomerid = p_lkpcsaccountid AND fdivid = p_txtoriginaldivisionid) THEN
            RAISE EXCEPTION 'Division ''%'' was changed or removed by someone else. Cancel and try again', p_txtoriginaldivisionid;
        END IF;

        -- the ID itself: not taken by another division, and not changed when transactions use it
        IF p_txtdivisionid IS DISTINCT FROM p_txtoriginaldivisionid THEN
            IF EXISTS (SELECT 1 FROM dbo.tblcustdivision
                        WHERE fcoid = p_pstrcoid AND fcustomerid = p_lkpcsaccountid AND fdivid = p_txtdivisionid) THEN
                RAISE EXCEPTION '''Division ID'' already exists (%)', p_txtdivisionid;
            END IF;
            IF dbo.havecustomerdivisiontrans(p_pstrcoid, p_lkpcsaccountid, p_txtoriginaldivisionid) THEN
                RAISE EXCEPTION 'You can''t modify the ''Division ID''. Some transactions already entered with this ''Division'' (%)', p_txtoriginaldivisionid;
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM dbo.tblcustdivision
                    WHERE fcoid = p_pstrcoid AND fcustomerid = p_lkpcsaccountid
                      AND fdivid <> p_txtoriginaldivisionid AND LOWER(fdivname) = LOWER(v_name)) THEN
            RAISE EXCEPTION '''Division Name'' already exists (%)', v_name;
        END IF;

        UPDATE dbo.tblcustdivision
           SET fdivid     = p_txtdivisionid,
               fdivname   = v_name,
               fdivname_ar = v_name_ar,
               fmuserid   = p_pstruserid,
               fmuserdate = CURRENT_TIMESTAMP
         WHERE fcoid = p_pstrcoid
           AND fcustomerid = p_lkpcsaccountid
           AND fdivid = p_txtoriginaldivisionid;

        v_note := 'Customer ID : ' || COALESCE(p_lkpcsaccountid, '') || CHR(13) || CHR(10);

        IF p_txtdivisionid IS DISTINCT FROM p_txtoriginaldivisionid THEN
            v_note := v_note || 'Division ID : Changed from ' || COALESCE(p_txtoriginaldivisionid, '')
                             || ' to ' || COALESCE(p_txtdivisionid, '') || CHR(13) || CHR(10);
        END IF;
        IF v_name IS DISTINCT FROM NULLIF(BTRIM(p_txtoriginaldivisionname), '') THEN
            v_note := v_note || 'Division Name : Changed from ' || COALESCE(p_txtoriginaldivisionname, '')
                             || ' to ' || COALESCE(v_name, '') || CHR(13) || CHR(10);
        END IF;
        IF v_name_ar IS DISTINCT FROM NULLIF(BTRIM(p_txtoriginaldivisionname_ar), '') THEN
            v_note := v_note || 'Division Name (Arabic) : Changed from ' || COALESCE(p_txtoriginaldivisionname_ar, '')
                             || ' to ' || COALESCE(v_name_ar, '') || CHR(13) || CHR(10);
        END IF;

        CALL dbo.sp_useraudit(p_pstrcoid, '', '', '', p_txtdivisionid, p_pstrscreenname, 'M', v_note, p_pstruserid);

    -- ------------------------------------------------------------- DELETE
    ELSIF p_strmode = 'D' THEN

        IF dbo.havecustomerdivisiontrans(p_pstrcoid, p_lkpcsaccountid, p_txtoriginaldivisionid) THEN
            RAISE EXCEPTION 'You can''t delete. Some transactions already entered with this ''Division'' (%)', p_txtoriginaldivisionid;
        END IF;

        DELETE FROM dbo.tblcustdivision
         WHERE fcoid = p_pstrcoid
           AND fcustomerid = p_lkpcsaccountid
           AND fdivid = p_txtoriginaldivisionid;

        v_note := 'Customer ID : ' || COALESCE(p_lkpcsaccountid, '')
               || CHR(13) || CHR(10) || 'Division ID : ' || COALESCE(p_txtoriginaldivisionid, '')
               || CHR(13) || CHR(10) || 'Division Name : ' || COALESCE(p_txtoriginaldivisionname, '')
               || CHR(13) || CHR(10) || 'Division Name (Arabic) : ' || COALESCE(p_txtoriginaldivisionname_ar, '');

        CALL dbo.sp_useraudit(p_pstrcoid, '', '', '', p_txtoriginaldivisionid, p_pstrscreenname, 'D', v_note, p_pstruserid);

    ELSE
        RAISE EXCEPTION 'invalid mode: %', p_strmode;
    END IF;
END;
$$;
