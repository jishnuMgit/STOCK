import type { MenuNode } from "../types/menu";
import { getMenuRoute } from "../config/menuConfig";

export function isNodeActive(node: MenuNode, activePath: string): boolean {
  if (getMenuRoute(node) === activePath) return true;
  return node.children.some((child) => isNodeActive(child, activePath));
}
