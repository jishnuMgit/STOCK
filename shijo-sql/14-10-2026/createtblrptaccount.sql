-- Table: dbo.tblrptaccount

-- DROP TABLE IF EXISTS dbo.tblrptaccount;

CREATE TABLE IF NOT EXISTS dbo.tblrptaccount
(
    fuserid character varying(20) COLLATE pg_catalog."default",
    faccountid character varying(12) COLLATE pg_catalog."default",
    faccountname character varying(120) COLLATE pg_catalog."default",
    fhavecc boolean,
    faccountlevel smallint,
    faddress character varying(100) COLLATE pg_catalog."default",
    fcontact character varying(100) COLLATE pg_catalog."default",
    fphone character varying(50) COLLATE pg_catalog."default",
    fcreditlimit integer,
    fcreditdays integer,
    fvatno character varying(15) COLLATE pg_catalog."default"
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS dbo.tblrptaccount
    OWNER to postgres;