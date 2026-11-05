import { useMemo } from "react";
import { useMenus } from "./useMenus";
import { buildMenuTree } from "../utils/buildMenuTree";
import {
  ADMINISTRATION_NODE,
  HIDDEN_MENU_NAMES,
  MENU_PLACED_AFTER,
} from "../config/menuConfig";

export function useMenuTree() {
  const { menus, loading, error } = useMenus();

  const userType = useMemo(() => localStorage.getItem("userType"), []);

  const menuTree = useMemo(() => {
    const tree = buildMenuTree(
      menus.filter((menu) => !HIDDEN_MENU_NAMES.includes(menu.fmenuname)),
      MENU_PLACED_AFTER,
    );

    // Finance > Transaction > Match

    if (userType === "AU") {
      tree.push(ADMINISTRATION_NODE);
    }

    return tree;
  }, [menus, userType]);

  return { menuTree, loading, error };
}
