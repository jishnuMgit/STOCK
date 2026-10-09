import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";

import COAPage, { type CoaMode } from "./COAPage";
import { useCoa, type CoaNode } from "../../../hooks/useCoa";

// ============================================================
// HELPER - GET EXPANDED NODES FOR MINIMUM VISIBLE ROWS
// ============================================================

const getExpandedForMinimumRows = (
  nodes: CoaNode[],
  minimumRows: number,
): Set<string> => {
  const result = new Set<string>();
  let visibleRows = 0;

  const expandUntilMinimum = (currentNodes: CoaNode[]): boolean => {
    for (const node of currentNodes) {
      visibleRows++;
      if (visibleRows >= minimumRows) return true;

      if (node.children && node.children.length > 0) {
        result.add(node.id);
        if (expandUntilMinimum(node.children)) return true;
      }
    }
    return false;
  };

  expandUntilMinimum(nodes);
  return result;
};

// ============================================================
// HELPER - FILTER TREE
// ============================================================

const filterTree = (nodes: CoaNode[], search: string): CoaNode[] => {
  if (!search.trim()) return nodes;

  const value = search.trim().toLowerCase();

  const filtered: (CoaNode | null)[] = nodes.map((node): CoaNode | null => {
    const matched =
      node.name.toLowerCase().includes(value) ||
      node.accountId.toLowerCase().includes(value);

    const filteredChildren = node.children
      ? filterTree(node.children, search)
      : [];

    if (matched || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  });

  return filtered.filter((node): node is CoaNode => node !== null);
};

// ============================================================
// TREE ROW
// ============================================================

interface TreeRowProps {
  node: CoaNode;
  depth: number;
  expanded: Set<string>;
  toggleNode: (id: string) => void;
  onAdd: (node: CoaNode) => void;
  onModify: (node: CoaNode) => void;
  onDelete: (node: CoaNode) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
  node,
  depth,
  expanded,
  toggleNode,
  onAdd,
  onModify,
  onDelete,
}) => {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expanded.has(node.id);

  // Same rules as the old VB form:
  //  - level 4 can't have children (no Add)
  //  - level 1 can't be modified / deleted
  const canAdd = node.level < 4;
  const canEdit = node.level !== 1;

  const iconColor =
    depth === 0
      ? "text-green-600"
      : depth === 1
        ? "text-blue-600"
        : depth === 2
          ? "text-fuchsia-600"
          : "text-slate-500";

  const textClass = `${node.color ?? "text-slate-700"} ${node.bold ? "font-semibold" : "font-normal"}`;

  return (
    <>
      <div className="grid min-h-[30px] grid-cols-[minmax(0,1fr)_84px_55px_55px_52px] border-b border-slate-300 bg-white text-[12px]">
        {/* ACCOUNT NAME */}
        <div className="flex min-w-0 items-center border-r border-slate-300">
          <div
            className="flex min-w-0 items-center"
            style={{ paddingLeft: `${7 + depth * 26}px` }}
          >
            <button
              type="button"
              onClick={() => hasChildren && toggleNode(node.id)}
              className="mr-1 flex h-3.5 w-3.5 cursor-pointer shrink-0 items-center justify-center text-slate-600 focus:outline-none"
              aria-label={
                hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined
              }
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown
                    size={10}
                    strokeWidth={2.5}
                    className={iconColor}
                  />
                ) : (
                  <ChevronRight
                    size={10}
                    strokeWidth={2.5}
                    className={iconColor}
                  />
                )
              ) : (
                <span className="block w-2.5" />
              )}
            </button>

            <span
              className={`truncate whitespace-nowrap ${textClass}`}
              title={node.name}
            >
              {node.name}
            </span>
          </div>
        </div>

        {/* ACCOUNT ID */}
        <div
          className={`flex items-center border-r border-slate-300 px-2 ${textClass}`}
        >
          {node.accountId}
        </div>

        {/* ADD */}
        <div className="flex items-center justify-center border-r border-slate-300">
          {canAdd && (
            <button
              id={`Addbtn-${node.id}`}
              type="button"
              title="Add"
              onClick={() => onAdd(node)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#43b65c] text-white hover:bg-[#359c4c] focus:outline-none"
            >
              <Plus size={11} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* MODIFY */}
        <div className="flex items-center justify-center border-r border-slate-300">
          {canEdit && (
            <button
              id={`Modifybtn-${node.id}`}
              type="button"
              title="Modify"
              onClick={() => onModify(node)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#2694e8] text-white hover:bg-[#147fcf] focus:outline-none"
            >
              <SquarePen size={9} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* DELETE */}
        <div className="flex items-center justify-center">
          {canEdit && (
            <button
              id={`Deletebtn-${node.id}`}
              type="button"
              title="Delete"
              onClick={() => onDelete(node)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center text-red-500 hover:text-red-600 focus:outline-none"
            >
              <Trash2 size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <>
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleNode={toggleNode}
              onAdd={onAdd}
              onModify={onModify}
              onDelete={onDelete}
            />
          ))}
        </>
      )}
    </>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

interface PopupState {
  mode: CoaMode;
  node: CoaNode;
}

const COAListPage: React.FC = () => {
  const { tree, fetchTree, loading, error } = useCoa();

  const [search, setSearch] = useState("");
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // set the default expansion only for the very first load
  const initialExpandDone = useRef(false);

  // ============================================================
  // LOAD TREE
  // ============================================================

  useEffect(() => {
    fetchTree().then((list) => {
      if (list && !initialExpandDone.current) {
        initialExpandDone.current = true;
        setExpanded(getExpandedForMinimumRows(list, 25));
      }
    });
  }, [fetchTree]);

  // ============================================================
  // FILTERED DATA
  // ============================================================

  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);

  // ============================================================
  // TOGGLE TREE NODE
  // ============================================================

  const toggleNode = (id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ============================================================
  // ADD / MODIFY / DELETE  -> open the popup in the right mode
  // ============================================================

  const handleAdd = (node: CoaNode) => setPopup({ mode: "S", node });
  const handleModify = (node: CoaNode) => setPopup({ mode: "M", node });
  const handleDelete = (node: CoaNode) => setPopup({ mode: "D", node });

  const closePopup = () => setPopup(null);

  // Popup saved / modified / deleted something -> reload the tree.
  // expandId = parent to open so the new account is visible.
  const handleChanged = async (expandId?: string) => {
    await fetchTree();
    if (expandId) {
      setExpanded((previous) => new Set(previous).add(expandId));
    }
  };

  // ============================================================
  // ESCAPE KEY
  // ============================================================

  useEffect(() => {
    if (!popup) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopup(null);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [popup]);

  // ============================================================
  // SEARCH AUTO EXPAND
  // ============================================================

  useEffect(() => {
    if (!search.trim()) return;

    const expandMatchingParents = (nodes: CoaNode[], result: Set<string>) => {
      const value = search.trim().toLowerCase();

      nodes.forEach((node) => {
        if (!node.children || node.children.length === 0) return;

        const childMatches = node.children.some(
          (child) =>
            child.name.toLowerCase().includes(value) ||
            child.accountId.toLowerCase().includes(value) ||
            (child.children && child.children.length > 0),
        );

        if (childMatches) result.add(node.id);

        expandMatchingParents(node.children, result);
      });
    };

    setExpanded((previous) => {
      const next = new Set(previous);
      expandMatchingParents(filteredTree, next);
      return next;
    });
  }, [search, filteredTree]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* COA LIST PAGE (blurred while the popup is open) */}
      <div
        className={`flex items-center justify-center transition-all duration-200 ${popup ? "blur-[3px]" : ""}`}
      >
        <div className="min-h-screen w-[1000px] mt-10 px-0 pt-0">
          <div className="w-full max-w-none overflow-hidden border border-slate-400 bg-white">
            {/* TITLE */}
            <div className="flex h-7 w-full items-center border-b border-slate-400 bg-[#a3dfc0]">
              <h1
                id="ChartOfAccount"
                className="ml-[10px] text-[17px] font-semibold text-slate-700"
              >
                Chart Of Account List
              </h1>
            </div>

            {/* SEARCH */}
            <div className="px-3.5 pb-2 pt-3">
              <div className="relative w-[74.5%]">
                <input
                  id="txtSearch"
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search..."
                  className="input-style w-full"
                />
              </div>
            </div>

            {/* TABLE HEADER */}
            <div className="mx-3.5 grid grid-cols-[minmax(0,1fr)_84px_55px_55px_52px] border border-slate-300 bg-[#f4f8fb]">
              <div
                id="trvChartOfAccount"
                className="flex h-[23px] items-center border-r border-slate-300 px-2 text-[12px] font-semibold text-slate-700"
              >
                Account Name
              </div>
              <div className="flex h-[23px] items-center border-r border-slate-300 px-2 text-[12px] font-semibold text-slate-700">
                Account ID
              </div>
              <div
                id="Addbtn"
                className="flex h-[23px] items-center justify-center border-r border-slate-300 text-[12px] font-semibold text-slate-700"
              >
                Add
              </div>
              <div
                id="Modifybtn"
                className="flex h-[23px] items-center justify-center border-r border-slate-300 text-[12px] font-semibold text-slate-700"
              >
                Modify
              </div>
              <div
                id="Deletebtn"
                className="flex h-[23px] items-center justify-center text-[12px] font-semibold text-slate-700"
              >
                Delete
              </div>
            </div>

            {/* TREE */}
            <div
              id="trvChartOfAccount"
              className="mx-3.5 overflow-hidden border-x border-b border-slate-300"
            >
              {filteredTree.map((node) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  toggleNode={toggleNode}
                  onAdd={handleAdd}
                  onModify={handleModify}
                  onDelete={handleDelete}
                />
              ))}

              {/* LOADING / ERROR / NO RESULTS */}
              {loading && tree.length === 0 && (
                <div className="flex h-12 items-center justify-center text-[11px] text-slate-500">
                  Loading...
                </div>
              )}

              {!loading && error && (
                <div className="flex h-12 items-center justify-center text-[11px] text-red-500">
                  {error}
                </div>
              )}

              {!loading && !error && filteredTree.length === 0 && (
                <div className="flex h-12 items-center justify-center text-[10px] text-slate-500">
                  No accounts found
                </div>
              )}
            </div>

            <div className="h-7" />
          </div>
        </div>
      </div>

      {/* COA POPUP OVERLAY */}
      {popup && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-800/20 backdrop-blur-xs"
          onMouseDown={closePopup}
        >
          <div
            className="relative max-h-[95vh] w-[850px] overflow-auto rounded-[3px] border border-slate-400 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.30)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              id="btnCloseCOAPage"
              type="button"
              title="Close"
              onClick={closePopup}
              className="absolute right-2 top-1 z-[10000] flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-slate-500 shadow hover:bg-slate-100 hover:text-red-500 focus:outline-none"
            >
              <X size={15} strokeWidth={2} />
            </button>

            {/* key -> fresh form every time the popup is opened */}
            <COAPage
              key={`${popup.mode}-${popup.node.accountId}`}
              mode={popup.mode}
              accountId={popup.node.accountId}
              onClose={closePopup}
              onChanged={handleChanged}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default COAListPage;
