-- Settings/SetPostingAccount: which account each kind of posting goes
-- to, one row per company + branch (converted from SQL Server
-- tblSetPostingAccount; user id columns widened to the 30 used by
-- the other tables).
CREATE TABLE IF NOT EXISTS dbo.tblsetpostingaccount (
    fcoid                   varchar(3)  NOT NULL,
    fbrid                   varchar(3)  NOT NULL,
    fcashsupplieraccountid  varchar(12),
    fcashcustomeraccountid  varchar(12),
    fstockaccountid         varchar(12),
    fsalesaccountid         varchar(12),
    fsalesretaccountid      varchar(12),
    fsalescostaccountid     varchar(12),
    fsalesretcostaccountid  varchar(12),
    fstockadjaccountid      varchar(12),
    froundoffaccountid      varchar(12),
    finputvataccountid      varchar(12),
    foutputvataccountid     varchar(12),
    fcuserid                varchar(30),
    fcuserdate              timestamp,
    fmuserid                varchar(30),
    fmuserdate              timestamp,
    CONSTRAINT pk_tblsetpostingaccount PRIMARY KEY (fcoid, fbrid)
);
