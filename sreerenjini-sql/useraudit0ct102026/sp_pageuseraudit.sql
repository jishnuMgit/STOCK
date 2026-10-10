-- PROCEDURE: dbo.sp_pageuseraudit
--   (Postgres port of the SQL Server SP for the old report rptUserAuditRpt,
--    written for OUR dbo.tbluseraudit)
--
-- dbo.tbluseraudit holds one row per audited action:
--   fcoid, fyear, fbrid, fdoctype, fscreenname, fscreenkey, faction,
--   fnote, fuserid, fuserdate   (+ ftransid, a running number)
-- fscreenkey is  branch + doc type + doc no  glued together (dbo.sp_useraudit),
-- so the document number is what is left of it after the branch and the doc
-- type - for a screen with no document it is just the key of the row (a user
-- id, a branch id ...).
--
-- Filters
--   p_rdguser    0 = only the user p_struserid      anything else = every user
--   p_rdgaction  0 = only the action p_stractionid  anything else = every action
--                (the action is the audit letter: S save, M modify, D delete)
--   p_dtpfromdate / p_dtptodate   the period - the to date counts the WHOLE day
--
-- Who sees whom: an Admin User (type AU, ADMIN included) sees every user's
-- rows; anyone else sees only their own, whatever user is asked for.
-- p_pstruserid is the logged-in user.
--
-- Columns
--   fyear, fbrid, fbrname, fdoctype, fdocno   where the action happened
--   fscreenname                               which screen (Staff, Item ...)
--   faction                                   S / M / D
--   fnote                                     what changed
--   fuserid, fuserdate                        who, and the audit date + time (text)
--
-- Examples (cursor calls must run inside one transaction)
--   BEGIN;
--   CALL dbo.sp_pageuseraudit('01', 1, NULL, 1, NULL, '2026-10-01', '2026-10-31',
--                            'ADMIN', 'cur_rpt');
--   FETCH ALL FROM "cur_rpt";
--   COMMIT;

-- DROP PROCEDURE IF EXISTS dbo.sp_pageuseraudit(IN p_pstrcoid character varying, IN p_rdguser smallint, IN p_struserid character varying, IN p_rdgaction smallint, IN p_stractionid character varying, IN p_dtpfromdate date, IN p_dtptodate date, IN p_pstruserid character varying, INOUT p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageuseraudit(
    IN    p_pstrcoid        character varying,
    IN    p_rdguser         smallint,
    IN    p_struserid       character varying,
    IN    p_rdgaction       smallint,
    IN    p_stractionid     character varying,
    IN    p_dtpfromdate     date,
    IN    p_dtptodate       date,
    IN    p_pstruserid      character varying,
    INOUT p_result_cursor   refcursor DEFAULT 'cur_pageuseraudit'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    OPEN p_result_cursor FOR
        SELECT
            a.fyear,
            a.fbrid,
            b.fbrname,
            a.fdoctype,
            -- the key is branch + doc type + doc no: take the doc no off the end
            substr(
                COALESCE(a.fscreenkey, ''),
                length(COALESCE(a.fbrid, '')) + length(COALESCE(a.fdoctype, '')) + 1
            )::character varying AS fdocno,
            a.fscreenname,
            a.faction,
            a.fnote,
            a.fuserid,
            -- the audit date and time as text (16 Jun 2026 09:42:34), so no
            -- time zone can move it
            to_char(a.fuserdate, 'DD Mon YYYY HH24:MI:SS') AS fuserdate
        FROM dbo.tbluseraudit a
        LEFT JOIN dbo.tblbranch b
               ON b.fcoid = a.fcoid
              AND b.fbrid = a.fbrid
        WHERE a.fcoid = p_pstrcoid
          -- an Admin User sees every user, anyone else only themselves
          AND (dbo.getusertype(p_pstrcoid, p_pstruserid) = 'AU'
               OR a.fuserid = p_pstruserid)
          -- one user, or every user
          AND (p_rdguser <> 0
               OR a.fuserid = p_struserid)
          -- one action, or every action
          AND (p_rdgaction <> 0
               OR a.faction = p_stractionid)
          -- the period, the to date counting the whole day
          AND a.fuserdate >= p_dtpfromdate
          AND a.fuserdate <  p_dtptodate + 1
        ORDER BY
            a.fuserid,
            a.fuserdate,
            a.ftransid;

END;
$procedure$;
