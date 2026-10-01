-- =========================================================
-- dbo.sp_pageuserpermissioncobranch
-- Used by Security/UserPermissionCoBranch.
--
-- Converted from the pasted SQL Server draft, with the fixes
-- that draft needed to actually run in Postgres:
--   * GetCo/GetBr used a bare SELECT with nowhere for the rows
--     to go - that raises "query has no destination for result
--     data" the moment it's called. Fixed with OPEN ... FOR
--     SELECT into a refcursor, same pattern as the sibling
--     sp_pageuserpermission procedure.
--   * S/D wrote to dbo.tbluserrightcobranch (the old SQL Server
--     table name) - our real table is dbo.tbluserpermissioncobranch
--     (already created, matches our naming convention).
--   * Parameter order is now mode, coid, userid, brid (company
--     before user), matching sp_pageuserpermission. Column
--     widths match the real table (fcoid/fbrid varchar(3),
--     fuserid varchar(30)), not the draft's placeholder sizes.
--
-- Modes
--   GetCo    every company (fcoid, fconame) - the tree's top level
--   GetBr    one company's branches (fbrid, fbrname)
--   GetCoBr  every company JOINed to its branches, one flat
--            result set - added so the controller can load the
--            whole tree in a single call instead of GetCo then
--            one GetBr per company (an N+1 query pattern).
--            GetCo/GetBr are untouched and still work as before.
--   S        insert one (fuserid, fcoid, fbrid) row
--   D        delete every row for this user (global wipe across
--            all companies, matching the original VB Apply())
-- =========================================================

CREATE OR REPLACE PROCEDURE dbo.sp_pageuserpermissioncobranch(
    IN p_strmode varchar(5),
    IN p_strcoid varchar(3) DEFAULT NULL,
    IN p_struserid varchar(30) DEFAULT NULL,
    IN p_strbrid varchar(3) DEFAULT NULL,
    INOUT p_result refcursor DEFAULT 'cobranch_cursor'
)
LANGUAGE plpgsql
AS $procedure$
BEGIN

    /* =========================================================
       GET COMPANY
       ========================================================= */

    IF p_strmode = 'GetCo' THEN

        OPEN p_result FOR
            SELECT
                fcoid,
                fconame
            FROM dbo.tblcompany
            ORDER BY fpositionno, fcoid;

    END IF;


    /* =========================================================
       GET BRANCH
       ========================================================= */

    IF p_strmode = 'GetBr' THEN

        OPEN p_result FOR
            SELECT
                fbrid,
                fbrname
            FROM dbo.tblbranch
            WHERE fcoid = p_strcoid
            ORDER BY fpositionno, fbrid;

    END IF;


    /* =========================================================
       GET COMPANY + BRANCH (one call, no N+1)
       ========================================================= */

    IF p_strmode = 'GetCoBr' THEN

        -- LEFT JOIN, not JOIN: a company with zero branches must
        -- still come back as one row (with b.fbrid NULL), the
        -- same way it shows up (with an empty branch list) from
        -- GetCo today. A plain JOIN would drop it silently.
        OPEN p_result FOR
            SELECT
                c.fcoid,
                c.fconame,
                b.fbrid,
                b.fbrname
            FROM dbo.tblcompany c
            LEFT JOIN dbo.tblbranch b ON b.fcoid = c.fcoid
            ORDER BY c.fpositionno, c.fcoid, b.fpositionno, b.fbrid;

    END IF;


    /* =========================================================
       SAVE USER COMPANY / BRANCH RIGHT
       ========================================================= */

    IF p_strmode = 'S' THEN

        INSERT INTO dbo.tbluserpermissioncobranch
        (
            fuserid,
            fcoid,
            fbrid
        )
        VALUES
        (
            p_struserid,
            p_strcoid,
            p_strbrid
        );

    END IF;


    /* =========================================================
       DELETE USER COMPANY / BRANCH RIGHTS
       ========================================================= */

    IF p_strmode = 'D' THEN

        DELETE FROM dbo.tbluserpermissioncobranch
        WHERE fuserid = p_struserid;

    END IF;

END;
$procedure$;
