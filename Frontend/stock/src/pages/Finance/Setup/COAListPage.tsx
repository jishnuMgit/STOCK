import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  SquarePen,
  Trash2,
  Search,
  X,
} from "lucide-react";

import COAPage from "./COAPage";

// ============================================================
// TYPES
// ============================================================

interface AccountNode {
  id: string;
  name: string;
  accountId: string;
  children?: AccountNode[];
  color?: string;
  bold?: boolean;
}

// ============================================================
// ACCOUNT TREE DATA
// ============================================================

const accountTree: AccountNode[] = [
  {
    id: "assets",
    name: "ASSETS",
    accountId: "1000000",
    color: "text-green-600",
    bold: true,
    children: [
      {
        id: "current-assets",
        name: "CURRENT ASSETS",
        accountId: "1100000",
        color: "text-blue-600",
        bold: true,
        children: [
          {
            id: "cash",
            name: "CASH",
            accountId: "1101000",
            color: "text-fuchsia-600",
            bold: true,
            children: [
              {
                id: "petty-cash",
                name: "PETTY CASH",
                accountId: "1101001",
              },
              {
                id: "main-cash",
                name: "MAIN CASH",
                accountId: "1101002",
              },
              {
                id: "cash-refund",
                name: "CASH REFUND",
                accountId: "1101003",
              },
            ],
          },

          {
            id: "bank",
            name: "BANK",
            accountId: "1102000",
            color: "text-fuchsia-600",
            bold: true,
            children: [
              {
                id: "al-rajhi-bank",
                name: "AL RAJHI BANK",
                accountId: "1102001",
              },
              {
                id: "saudi-national-bank",
                name: "SAUDI NATIONAL BANK - SNB",
                accountId: "1102002",
              },
              {
                id: "saudi-british-bank",
                name: "SAUDI BRITISH BANK",
                accountId: "1102003",
              },
              {
                id: "banque-saudi-fransi-cvn",
                name: "BANQUE SAUDI FRANSI - BSF CVN",
                accountId: "1102004",
              },
              {
                id: "bsf-region-account",
                name: "BSF- REGION ACCOUNT",
                accountId: "1102005",
              },
              {
                id: "banque-saudi-fransi-ace",
                name: "BANQUE SAUDI FRANSI -BSF ACE",
                accountId: "1102006",
              },
            ],
          },

          {
            id: "receivables",
            name: "RECEIVABLES",
            accountId: "1103000",
            color: "text-fuchsia-600",
            bold: true,
            children: [
              {
                id: "clients-receivables",
                name: "CLIENTS RECEIVABLES",
                accountId: "1103001",
              },
              {
                id: "ecl-allowance",
                name: "ECL ALLOWANCE",
                accountId: "1103002",
              },
              {
                id: "ace-travel-input-vat",
                name: "ACE TRAVEL INPUT VAT",
                accountId: "1108006",
              },
            ],
          },

          {
            id: "ace-travel-group",
            name: "ACE TRAVEL GROUP",
            accountId: "1104000",
            color: "text-fuchsia-600",
            bold: true,
            children: [],
          },

          {
            id: "skab-group",
            name: "SKAB GROUP (RELATED PARTY)",
            accountId: "1105000",
            color: "text-fuchsia-600",
            bold: true,
            children: [],
          },
        ],
      },

      // ========================================================
      // TEST DATA
      // ========================================================

      {
        id: "test-assets",
        name: "CURRENT ASSETS",
        accountId: "1100000",
        color: "text-blue-600",
        bold: true,
        children: [
          {
            id: "cash001",
            name: "CASH01",
            accountId: "11010000",
            color: "text-fuchsia-600",
            bold: true,
            children: [
              {
                id: "petty-cash-001",
                name: "PETTY CASH",
                accountId: "1101001",
              },
              {
                id: "main-cash-001",
                name: "MAIN CASH",
                accountId: "1101002",
              },
              {
                id: "cash-refund-001",
                name: "CASH REFUND",
                accountId: "1101003",
              },
            ],
          },
        ],
      },
    ],
  },
];

// ============================================================
// HELPER - GET EXPANDED NODES FOR MINIMUM VISIBLE ROWS
// ============================================================

const getExpandedForMinimumRows = (
  nodes: AccountNode[],
  minimumRows: number,
): Set<string> => {
  const result = new Set<string>();

  let visibleRows = 0;

  const expandUntilMinimum = (currentNodes: AccountNode[]): boolean => {
    for (const node of currentNodes) {
      visibleRows++;

      if (visibleRows >= minimumRows) {
        return true;
      }

      if (node.children && node.children.length > 0) {
        result.add(node.id);

        if (expandUntilMinimum(node.children)) {
          return true;
        }
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

const filterTree = (nodes: AccountNode[], search: string): AccountNode[] => {
  if (!search.trim()) {
    return nodes;
  }

  const value = search.trim().toLowerCase();

  const filtered: (AccountNode | null)[] = nodes.map(
    (node): AccountNode | null => {
      const matched =
        node.name.toLowerCase().includes(value) ||
        node.accountId.toLowerCase().includes(value);

      const filteredChildren = node.children
        ? filterTree(node.children, search)
        : [];

      if (matched || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    },
  );

  return filtered.filter((node): node is AccountNode => node !== null);
};

// ============================================================
// TREE ROW PROPS
// ============================================================

interface TreeRowProps {
  node: AccountNode;
  level: number;
  expanded: Set<string>;
  toggleNode: (id: string) => void;
  onAdd: (node: AccountNode) => void;
  onModify: (node: AccountNode) => void;
  onDelete: (node: AccountNode) => void;
}

// ============================================================
// TREE ROW
// ============================================================

const TreeRow: React.FC<TreeRowProps> = ({
  node,
  level,
  expanded,
  toggleNode,
  onAdd,
  onModify,
  onDelete,
}) => {
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const isExpanded = expanded.has(node.id);

  // ============================================================
  // ICON COLOR
  // ============================================================

  const iconColor =
    level === 0
      ? "text-green-600"
      : level === 1
        ? "text-blue-600"
        : level === 2
          ? "text-fuchsia-600"
          : "text-slate-500";

  return (
    <>
      {/* ========================================================
          CURRENT ROW
      ======================================================== */}

      <div
        className="
          grid
          min-h-[30px]
          grid-cols-[minmax(0,1fr)_84px_55px_55px_52px]
          border-b
          border-slate-300
          bg-white
          text-[12px]
        "
      >
        {/* ======================================================
            ACCOUNT NAME
        ====================================================== */}

        <div
          className="
            flex
            min-w-0
            items-center
            border-r
            border-slate-300
          "
        >
          <div
            className="flex min-w-0 items-center"
            style={{
              paddingLeft: `${7 + level * 26}px`,
            }}
          >
            {/* TREE ARROW */}

            <button
              type="button"
              onClick={() => hasChildren && toggleNode(node.id)}
              className="
                mr-1
                flex
                h-3.5
                w-3.5
                cursor-pointer
                shrink-0
                items-center
                justify-center
                text-slate-600
                focus:outline-none
              "
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

            {/* ACCOUNT NAME */}

            <span
              className={`
                truncate
                whitespace-nowrap
                ${node.color ?? "text-slate-700"}
                ${node.bold ? "font-semibold" : "font-normal"}
              `}
              title={node.name}
            >
              {node.name}
            </span>
          </div>
        </div>

        {/* ======================================================
            ACCOUNT ID
        ====================================================== */}

        <div
          className={`flex items-center border-r border-slate-300 px-2 ${node.color ?? "text-slate-700"}
    ${node.bold ? "font-semibold" : "font-normal"}`}
        >
          {node.accountId}
        </div>

        {/* ======================================================
            ADD
        ====================================================== */}

        <div className="flex items-center justify-center border-r border-slate-300">
          <button
            id={`Addbtn-${node.id}`}
            type="button"
            title="Add"
            onClick={() => onAdd(node)}
            className="
              flex
              h-5
              w-5
              cursor-pointer
              items-center
              justify-center
              rounded-full
              bg-[#43b65c]
              text-white
              hover:bg-[#359c4c]
              focus:outline-none
            "
          >
            {level !== 3 && <Plus size={11} strokeWidth={3} />}
          </button>
        </div>

        {/* ======================================================
            MODIFY
        ====================================================== */}

        <div className="flex items-center justify-center border-r border-slate-300">
          <button
            id={`Modifybtn-${node.id}`}
            type="button"
            title="Modify"
            onClick={() => onModify(node)}
            className="
              flex
              h-5
              w-5
              cursor-pointer
              items-center
              justify-center
              rounded-full
              bg-[#2694e8]
              text-white
              hover:bg-[#147fcf]
              focus:outline-none
            "
          >
            <SquarePen size={9} strokeWidth={2.5} />
          </button>
        </div>

        {/* ======================================================
            DELETE
        ====================================================== */}

        <div className="flex items-center justify-center">
          <button
            id={`Deletebtn-${node.id}`}
            type="button"
            title="Delete"
            onClick={() => onDelete(node)}
            className="
              flex
              h-5
              w-5
              cursor-pointer
              items-center
              justify-center
              text-red-500
              hover:text-red-600
              focus:outline-none
            "
          >
            <Trash2 size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ========================================================
          CHILDREN
      ======================================================== */}

      {hasChildren && isExpanded && (
        <>
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              level={level + 1}
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

const COAListPage: React.FC = () => {
  const [search, setSearch] = useState("");

  // ============================================================
  // COA POPUP STATE
  // ============================================================

  const [showCOAPage, setShowCOAPage] = useState(false);

  // ============================================================
  // DEFAULT EXPANDED NODES
  // ============================================================

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    getExpandedForMinimumRows(accountTree, 25),
  );

  // ============================================================
  // FILTERED DATA
  // ============================================================

  const filteredTree = useMemo(() => {
    return filterTree(accountTree, search);
  }, [search]);

  // ============================================================
  // TOGGLE TREE NODE
  // ============================================================

  const toggleNode = (id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  // ============================================================
  // ADD ACCOUNT
  // ============================================================

  const handleAdd = (node: AccountNode) => {
    console.log("Add account under:", node);

    // Open COAPage popup
    setShowCOAPage(true);
  };

  // ============================================================
  // MODIFY
  // ============================================================

  const handleModify = (node: AccountNode) => {
    console.log("Modify account:", node);
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = (node: AccountNode) => {
    const confirmed = window.confirm(`Delete account "${node.name}"?`);

    if (!confirmed) {
      return;
    }

    console.log("Delete account:", node);
  };

  // ============================================================
  // CLOSE POPUP
  // ============================================================

  const closeCOAPage = () => {
    setShowCOAPage(false);
  };

  // ============================================================
  // ESCAPE KEY
  // ============================================================

  useEffect(() => {
    if (!showCOAPage) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCOAPage(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCOAPage]);

  // ============================================================
  // SEARCH AUTO EXPAND
  // ============================================================

  useEffect(() => {
    if (!search.trim()) {
      return;
    }

    const expandMatchingParents = (
      nodes: AccountNode[],
      result: Set<string>,
    ) => {
      const value = search.trim().toLowerCase();

      nodes.forEach((node) => {
        if (!node.children || node.children.length === 0) {
          return;
        }

        const childMatches = node.children.some(
          (child) =>
            child.name.toLowerCase().includes(value) ||
            child.accountId.toLowerCase().includes(value) ||
            (child.children && child.children.length > 0),
        );

        if (childMatches) {
          result.add(node.id);
        }

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
      {/* ========================================================
          COA LIST PAGE
          This entire page becomes blurred when popup is open
      ======================================================== */}

      <div
        className={`flex items-center justify-center transition-all duration-200
          ${showCOAPage ? "blur-[3px]" : ""}
        `}
      >
        <div className="min-h-screen w-[1000px] mt-10 px-0 pt-0">
          {/* ====================================================
              MAIN CONTAINER
          ==================================================== */}

          <div className="w-full max-w-none overflow-hidden border border-slate-400 bg-white">
            {/* ==================================================
                TITLE
            ================================================== */}

            <div className="flex h-7 w-full items-center border-b border-slate-400 bg-[#a3dfc0]">
              <h1
                id="ChartOfAccount"
                className="ml-[10px] text-[17px] font-semibold text-slate-700"
              >
                Chart Of Account List
              </h1>
            </div>

            {/* ==================================================
                SEARCH
            ================================================== */}

            <div className="px-3.5 pb-2 pt-3">
              <div className="relative w-[74.5%]">
                {/* <Search
                  size={11}
                  className="
                    pointer-events-none
                    absolute
                    left-2.5
                    top-1/2
                    -translate-y-1/2
                    text-slate-500
                  "
                /> */}

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

            {/* ==================================================
                TABLE HEADER
            ================================================== */}

            <div
              className="
                mx-3.5
                grid
                grid-cols-[minmax(0,1fr)_84px_55px_55px_52px]
                border
                border-slate-300
                bg-[#f4f8fb]
              "
            >
              {/* ACCOUNT NAME */}

              <div
                id="trvChartOfAccount"
                className="
                  flex
                  h-[23px]
                  items-center
                  border-r
                  border-slate-300
                  px-2
                  text-[12px]
                  font-semibold
                  text-slate-700
                "
              >
                Account Name
              </div>

              {/* ACCOUNT ID */}

              <div
                className="
                  flex
                  h-[23px]
                  items-center
                  border-r
                  border-slate-300
                  px-2
                  text-[12px]
                  font-semibold
                  text-slate-700
                "
              >
                Account ID
              </div>

              {/* ADD */}

              <div
                id="Addbtn"
                className="
                  flex
                  h-[23px]
                  items-center
                  justify-center
                  border-r
                  border-slate-300
                  text-[12px]
                  font-semibold
                  text-slate-700
                "
              >
                Add
              </div>

              {/* MODIFY */}

              <div
                id="Modifybtn"
                className="
                  flex
                  h-[23px]
                  items-center
                  justify-center
                  border-r
                  border-slate-300
                  text-[12px]
                  font-semibold
                  text-slate-700
                "
              >
                Modify
              </div>

              {/* DELETE */}

              <div
                id="Deletebtn"
                className="
                  flex
                  h-[23px]
                  items-center
                  justify-center
                  text-[12px]
                  font-semibold
                  text-slate-700
                "
              >
                Delete
              </div>
            </div>

            {/* ==================================================
                TREE
            ================================================== */}

            <div
              id="trvChartOfAccount"
              className="
                mx-3.5
                overflow-hidden
                border-x
                border-b
                border-slate-300
              "
            >
              {filteredTree.map((node) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  level={0}
                  expanded={expanded}
                  toggleNode={toggleNode}
                  onAdd={handleAdd}
                  onModify={handleModify}
                  onDelete={handleDelete}
                />
              ))}

              {/* NO RESULTS */}

              {filteredTree.length === 0 && (
                <div
                  className="
                    flex
                    h-12
                    items-center
                    justify-center
                    text-[10px]
                    text-slate-500
                  "
                >
                  No accounts found
                </div>
              )}
            </div>

            {/* ==================================================
                BOTTOM
            ================================================== */}

            <div className="h-7" />
          </div>
        </div>
      </div>

      {/* ========================================================
          COA POPUP OVERLAY
      ======================================================== */}

      {showCOAPage && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-slate-800/20
            
            backdrop-blur-xs
            
          "
          onMouseDown={closeCOAPage}
        >
          {/* ====================================================
              POPUP CONTAINER
          ==================================================== */}

          <div
            className="relative max-h-[95vh] w-[850px] overflow-auto rounded-[3px] border
              border-slate-400 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.30)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* ==================================================
                CLOSE BUTTON
            ================================================== */}

            <button
              id="btnCloseCOAPage"
              type="button"
              title="Close"
              onClick={closeCOAPage}
              className="absolute right-2 top-1 z-[10000] flex h-6 w-6 items-center justify-center rounded-full bg-white
                text-slate-500 shadow hover:bg-slate-100 hover:text-red-500 focus:outline-none"
            >
              <X size={15} strokeWidth={2} />
            </button>

            {/* ==================================================
                COA PAGE
            ================================================== */}

            <COAPage />
          </div>
        </div>
      )}
    </>
  );
};

export default COAListPage;
