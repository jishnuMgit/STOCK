-- ============================================================
-- dbo.tblstaff : create the table (with the Purchase / Sales flags)
--
-- Same table as before, plus two columns:
--   fispurchase  true = the staff member works in Purchase
--   fissales     true = the staff member works in Sales
--   (both may be true; both default to false)
--
-- Safe to run twice: nothing happens when the table already exists.
-- ============================================================

CREATE TABLE IF NOT EXISTS dbo.tblstaff
(
    fcoid        character varying(3)  COLLATE pg_catalog."default" NOT NULL,
    fstaffid     character varying(4)  COLLATE pg_catalog."default" NOT NULL,
    fstaffname   character varying(50) COLLATE pg_catalog."default",
    fispurchase  boolean NOT NULL DEFAULT false,
    fissales     boolean NOT NULL DEFAULT false,
    fcuserid     character varying(30) COLLATE pg_catalog."default",
    fcuserdate   timestamp without time zone,
    fmuserid     character varying(30) COLLATE pg_catalog."default",
    fmuserdate   timestamp without time zone,
    CONSTRAINT pk_tblstaff PRIMARY KEY (fcoid, fstaffid)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS dbo.tblstaff
    OWNER to postgres;


-- sample rows (company 01; fstaffid is 4 characters at most)
INSERT INTO dbo.tblstaff
    (fcoid, fstaffid, fstaffname, fispurchase, fissales, fcuserid, fcuserdate)
VALUES
    ('01', '0001', 'Ahmed Al Harbi',   true,  false, 'ADMIN', now()),   -- purchase only
    ('01', '0002', 'Khalid Al Otaibi', false, true,  'ADMIN', now()),   -- sales only
    ('01', '0003', 'Sara Mohammed',    true,  true,  'ADMIN', now()),   -- both
    ('01', '0004', 'Rahul Nair',       false, false, 'ADMIN', now())    -- neither
ON CONFLICT (fcoid, fstaffid) DO NOTHING;


-- check
SELECT fcoid, fstaffid, fstaffname, fispurchase, fissales
FROM dbo.tblstaff
ORDER BY fstaffid;
