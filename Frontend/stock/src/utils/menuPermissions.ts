/* =========================================================
   MENU BUTTON PERMISSIONS

   fmenubuttons / fuserbuttons is a string of letters, each
   representing a permitted action on that menu's page, e.g.
   "SMDPT" = Save, Modify, Delete, Print, Transfer.

   "0" means the row is a folder/group with no actions of
   its own (used for level 1 and level 2 nodes).

   Not used by SideNav directly, but pages can import this
   to show/hide their own action buttons based on what the
   logged-in user is permitted to do on that menu.
========================================================= */

export type MenuAction = "S" | "M" | "D" | "P" | "T";

export function hasMenuPermission(
  buttons: string | undefined,
  action: MenuAction,
): boolean {
  if (!buttons || buttons === "0") {
    return false;
  }

  return buttons.toUpperCase().includes(action);
}
