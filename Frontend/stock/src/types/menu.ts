/* =========================================================
   MENU TYPES

   Mirrors dbo.tblmenu / tbluserpermission shape returned by
   GET /api/menu.

   fmenuid encodes the hierarchy itself: 2 characters per
   level, e.g.

     "01"      -> level 1 (category)   e.g. Purchase
     "0101"    -> level 2 (group)      e.g. Transaction
     "010101"  -> level 3 (leaf)       e.g. Purchase Invoice

   Parent id of any node = its own id minus the last 2 chars.
========================================================= */

export interface MenuRow {
  fmenuid: string;
  fmenuname: string;
  fmenucaption: string;
  fmenubuttons: string;

  // Only present for restricted users (userType "RU").
  fuserbuttons?: string;
}

export interface MenuNode extends MenuRow {
  children: MenuNode[];
}
