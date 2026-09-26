import { useMemo } from "react";
import { useMenus } from "./useMenus";
import { buildMenuTree } from "../utils/buildMenuTree";
import {
  ADMINISTRATION_NODE,
  SET_COMPANY_INFO_NODE,
} from "../config/menuConfig";

export function useMenuTree() {
  const { menus, loading, error } = useMenus();

  const userType = useMemo(() => localStorage.getItem("userType"), []);

  const menuTree = useMemo(() => {
    const tree = buildMenuTree(menus);

    if (userType === "AU") {
      tree.push(ADMINISTRATION_NODE);

      // Company Info has no backing row in tblmenu (manager's
      // call — hardcoded here, admin-only). Splice it into
      // Setting's children so it shows up under the real
      // Setting submenu rather than as its own top-level item.
      const settingNode = tree.find(
        (node) => node.fmenuname === "mnu91Setting",
      );

      if (settingNode) {
        settingNode.children = [...settingNode.children, SET_COMPANY_INFO_NODE];
      }
    }

    return tree;
  }, [menus, userType]);

  return { menuTree, loading, error };
}
