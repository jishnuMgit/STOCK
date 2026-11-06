ALTER TABLE dbo.tblarap
RENAME COLUMN fclosed TO fmatchcompleted;

alter table dbo.tblcustdivision
add column fcuserid varchar(30),
add column fcuserdate timestamp(0) without time zone,
add column fmuserid varchar(30),
add column fmuserdate timestamp(0) without time zone;