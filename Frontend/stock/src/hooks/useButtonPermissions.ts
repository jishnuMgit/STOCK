import { useMemo } from "react";
import { useMenus } from "./useMenus";

/* =========================================================
   BUTTON PERMISSIONS

   Frontend equivalent of the legacy ConfigureButtonsUserID:
   given a page's fmenuid, tells you which action buttons
   this logged-in user is allowed to use on it.

   Reuses GET /api/menu (useMenus) instead of a separate
   endpoint - that response already carries, per menu row,
   fmenubuttons (what the menu supports) and fuserbuttons
   (what this user was granted), via MenuController's "RU"
   branch. "AU" (admin) gets every menu with no fuserbuttons
   restriction, so admin is always treated as fully allowed.
========================================================= */

export interface ButtonPermissions {
  save: boolean;
  modify: boolean;
  delete: boolean;
  print: boolean;
  post: boolean;
  printDN: boolean;
  eprint: boolean;
  loading: boolean;
}

const BUTTON_CODES: Record<Exclude<keyof ButtonPermissions, "loading">, string> = {
  save: "S",
  modify: "M",
  delete: "D",
  print: "P",
  post: "T",
  printDN: "N",
  eprint: "E",
};

export function useButtonPermissions(menuId: string): ButtonPermissions {
  const { menus, loading } = useMenus();

  const userType = useMemo(() => localStorage.getItem("userType"), []);

  return useMemo(() => {
    // Fail closed while we don't know yet - every button stays
    // disabled until the real rights come back.
    if (loading) {
      return {
        save: false,
        modify: false,
        delete: false,
        print: false,
        post: false,
        printDN: false,
        eprint: false,
        loading: true,
      };
    }

    const menuRow = menus.find((menu) => menu.fmenuid === menuId);

    // ADMIN ("AU") rows come back with no fuserbuttons at all -
    // treat that as full rights (every code the menu supports),
    // same as the legacy "If gstrUserID <> ADMIN" bypass.
    const grantedButtons =
      userType === "AU"
        ? menuRow?.fmenubuttons ?? ""
        : menuRow?.fuserbuttons ?? "";

    const result = {} as ButtonPermissions;

    for (const key of Object.keys(BUTTON_CODES) as Array<
      keyof typeof BUTTON_CODES
    >) {
      result[key] = grantedButtons.includes(BUTTON_CODES[key]);
    }

    result.loading = false;

    return result;
  }, [menus, loading, userType, menuId]);
}
