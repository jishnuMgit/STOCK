CREATE OR REPLACE PROCEDURE dbo.sp_pagecashsupplier(
  strmode             varchar,
  gstrcoid            varchar,
  strcashsupplierid   varchar,
  strcashsuppliername varchar DEFAULT NULL,
  strvatno            varchar DEFAULT NULL,
  gstruserid          varchar DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF strmode = 'S' THEN
    INSERT INTO dbo."tblCashSupplier"
      ("fCoID", "fCashSupplierID", "fCashSupplierName", "fVATNo",
       "fSUserID", "fSUserDate")
    VALUES
      (gstrcoid, strcashsupplierid, strcashsuppliername, strvatno,
       gstruserid, now());

  ELSIF strmode = 'M' THEN
    UPDATE dbo."tblCashSupplier"
       SET "fCashSupplierName" = strcashsuppliername,
           "fVATNo"            = strvatno,
           "fMUserID"          = gstruserid,
           "fMUserDate"        = now()
     WHERE "fCoID" = gstrcoid
       AND "fCashSupplierID" = strcashsupplierid;

  ELSIF strmode = 'D' THEN
    DELETE FROM dbo."tblCashSupplier"
     WHERE "fCoID" = gstrcoid
       AND "fCashSupplierID" = strcashsupplierid;

  ELSE
    RAISE EXCEPTION 'Invalid mode: %', strmode;
  END IF;
END;
$$;
