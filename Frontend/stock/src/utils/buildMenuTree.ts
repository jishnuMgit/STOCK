import type { MenuNode, MenuRow } from "../types/menu";

/* =========================================================
   BUILD MENU TREE

   Turns the flat list of rows from GET /api/menu into a
   nested tree using the fmenuid encoding (2 chars/level).

   Works for any depth, not just 3 levels, so it stays
   correct even if new levels are added to tblmenu later.

   If a node's computed parent id isn't present in the
   result set (shouldn't happen now that the backend
   backfills ancestor rows for RU users, but kept as a
   safety net), the node is promoted to a root instead of
   being silently dropped.
========================================================= */

export function buildMenuTree(rows: MenuRow[]): MenuNode[] {
  const sorted = [...rows].sort((a, b) => a.fmenuid.localeCompare(b.fmenuid));

  const map = new Map<string, MenuNode>();

  sorted.forEach((row) => {
    map.set(row.fmenuid, { ...row, children: [] });
  });

  const roots: MenuNode[] = [];

  map.forEach((node) => {
    const parentId = node.fmenuid.slice(0, -2);
    const parent = parentId.length >= 2 ? map.get(parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/* =========================================================
   FIND PATH TO NODE

   Returns the fmenuid of every ancestor of the node whose
   route matches `route` (used to auto-expand the branch
   containing the active page, and to auto-expand branches
   that match a search term).
========================================================= */

export function findAncestorIds(
  nodes: MenuNode[],
  predicate: (node: MenuNode) => boolean,
  trail: string[] = [],
): string[] {
  for (const node of nodes) {
    const nextTrail = [...trail, node.fmenuid];

    if (predicate(node)) {
      return trail; // ancestors only, not the node itself
    }

    if (node.children.length) {
      const found = findAncestorIds(node.children, predicate, nextTrail);

      if (found.length || node.children.some(predicate)) {
        return nextTrail;
      }
    }
  }

  return [];
}

/* =========================================================
   FILTER TREE BY SEARCH TEXT

   A node is kept if its own caption matches, or if any
   descendant matches. If the node itself matches, its full
   subtree is kept as-is; otherwise children are filtered
   recursively.
========================================================= */

export function filterMenuTree(nodes: MenuNode[], search: string): MenuNode[] {
  const term = search.trim().toLowerCase();

  if (!term) {
    return nodes;
  }

  const result: MenuNode[] = [];

  nodes.forEach((node) => {
    const selfMatch = node.fmenucaption.toLowerCase().includes(term);

    if (selfMatch) {
      result.push(node);
      return;
    }

    const filteredChildren = filterMenuTree(node.children, term);

    if (filteredChildren.length) {
      result.push({ ...node, children: filteredChildren });
    }
  });

  return result;
}

/* =========================================================
   COLLECT ALL IDS

   Used to auto-open every branch that survived a search
   filter, so matches at deep levels are visible without an
   extra click.
========================================================= */

export function collectIds(nodes: MenuNode[]): string[] {
  const ids: string[] = [];

  nodes.forEach((node) => {
    if (node.children.length) {
      ids.push(node.fmenuid);
      ids.push(...collectIds(node.children));
    }
  });

  return ids;
}
