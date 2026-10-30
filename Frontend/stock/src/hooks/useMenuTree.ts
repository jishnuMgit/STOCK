import { useMemo } from "react";
import { useMenus } from "./useMenus";
import { buildMenuTree } from "../utils/buildMenuTree";
import {
  ADMINISTRATION_NODE,
  HIDDEN_MENU_NAMES,
  TRANSACTION_MATCHING_NODE,
  injectChild,
} from "../config/menuConfig";

export function useMenuTree() {
  const { menus, loading, error } = useMenus();

  const userType = useMemo(() => localStorage.getItem("userType"), []);

  const menuTree = useMemo(() => {
    let tree = buildMenuTree(
      menus.filter((menu) => !HIDDEN_MENU_NAMES.includes(menu.fmenuname)),
    );

    // Finance > Transaction > Match
    tree = injectChild(tree, "1101", TRANSACTION_MATCHING_NODE);

    if (userType === "AU") {
      tree.push(ADMINISTRATION_NODE);
    }

    return tree;
  }, [menus, userType]);

  return { menuTree, loading, error };
}
