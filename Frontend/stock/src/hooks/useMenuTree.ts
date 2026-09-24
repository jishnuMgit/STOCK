import { useMemo } from "react";
import { useMenus } from "./useMenus";
import { buildMenuTree } from "../utils/buildMenuTree";
import { ADMINISTRATION_NODE } from "../config/menuConfig";

export function useMenuTree() {
  const { menus, loading, error } = useMenus();

  const userType = useMemo(() => localStorage.getItem("userType"), []);

  const menuTree = useMemo(() => {
    const tree = buildMenuTree(menus);
    if (userType === "AU") tree.push(ADMINISTRATION_NODE);
    return tree;
  }, [menus, userType]);

  return { menuTree, loading, error };
}
