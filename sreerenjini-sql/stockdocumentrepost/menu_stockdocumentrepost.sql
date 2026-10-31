-- The Post button of the Stock Document Re-Post page (menu 020106, mnuStkDocumentRePost) is enabled by the T right.
-- tblmenu.fmenubuttons is '0' (no buttons) today, so for an Admin user the button stays disabled until the menu
-- supports T. Then grant T to the other users on the User Permission screen.
UPDATE dbo.tblmenu
SET    fmenubuttons = 'T'
WHERE  fmenuid = '020106';
