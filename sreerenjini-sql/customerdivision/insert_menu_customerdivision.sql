-- =====================================================================
-- The menu "Customer Division" (Finance > Setup)
--
--   fmenuid       110207       the next free id of the Setup folder (1102): 110201 .. 110206 are taken
--   fmenuname     mnuCustomerDivision   the key the frontend uses to find the page (config/menuConfig.ts: ROUTE MAP) ->
--                                       /Finance/Setup/CustomerDivision
--   fmenucaption  Customer Division     the caption of the sidebar
--   fmenubuttons  SMD                   Save, Modify, Delete - the same as the other Setup pages
--
-- The sidebar lists a folder by fmenuid, so 110207 would be the last one of the Setup folder. The frontend lists it right
-- after Customer (config/menuConfig.ts: MENU_PLACED_AFTER) - nothing else needs to change in tblmenu.
--
-- An Admin User (AU) sees every row of tblmenu. A Restricted User (RU) sees it only when the menu is granted to the
-- user (tbluserpermission, Security > User Permission).
--
-- Safe to run twice: it adds the menu only when it is not there yet.
-- =====================================================================

INSERT INTO dbo.tblmenu (fmenuid, fmenuname, fmenucaption, fmenubuttons)
SELECT '110207', 'mnuCustomerDivision', 'Customer Division', 'SMD'
 WHERE NOT EXISTS (SELECT 1 FROM dbo.tblmenu WHERE fmenuid = '110207');

-- the check
SELECT fmenuid, fmenuname, fmenucaption, fmenubuttons
  FROM dbo.tblmenu
 WHERE fmenuid LIKE '1102%'
 ORDER BY fmenuid;
