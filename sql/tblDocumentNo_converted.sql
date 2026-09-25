DROP TABLE IF EXISTS dbo.tblDocumentNo;

CREATE TABLE dbo.tblDocumentNo (
    fCoID varchar(3) NOT NULL,
    fYear varchar(4) NOT NULL,
    fBrID varchar(3) NOT NULL,
    fDocType varchar(5) NOT NULL,
    fModuleID varchar(4) NULL,
    fDocNoPrefix varchar(8) NULL,
    fStartSeqNo varchar(6) NULL,
    fSeqNoLen smallint NULL,
    fDocNoLen smallint NULL,
    fStrictSerialSeqNo boolean NULL,
    fSeqNoIncrementMode varchar(6) NULL,
    fSeqNoResetMode varchar(6) NULL,
    fPrintAfterSave smallint NULL,
    fPositionNo smallint NULL,
    fCUserID varchar(30) NULL,
    fCUserDate timestamp NULL,
    fMUserID varchar(30) NULL,
    fMUserDate timestamp NULL,
    CONSTRAINT PK_tblDocumentNo_1 PRIMARY KEY (fCoID, fYear, fBrID, fDocType)
);

ALTER TABLE dbo.tblDocumentNo ALTER COLUMN fPositionNo SET DEFAULT 0;
