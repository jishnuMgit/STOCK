import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { printChartOfAccountReport } from "./printChartOfAccountReport";

// ============================================================
// TYPES
// ============================================================

type AccountNode = {
  id: string;
  name: string;
  level: number;
  children: AccountNode[];
};

type TreeAccount = {
  accountId: string;
  accountName: string;
  accountGroupId: string | null;
  accountLevel: number;
};

const API = `${import.meta.env.VITE_API_URL}/RptChartOfAccount`;

// Sends the login cookie, and the company / user kept at sign-in as a stopgap
// (the server uses its session first and only falls back to these).
// TODO: if your COA page sends a token, add the same Authorization header here,
// then delete the coId / userId part.
const apiFetch = (url: string, init: RequestInit = {}) => {
  const coId = localStorage.getItem("PstrCoID") ?? "";
  const userId = localStorage.getItem("PstrUserID") ?? "";
  const sep = url.includes("?") ? "&" : "?";

  return fetch(
    `${url}${sep}coId=${encodeURIComponent(coId)}&userId=${encodeURIComponent(userId)}`,
    { credentials: "include", ...init },
  );
};

// ============================================================
// TREE HELPERS
// ============================================================

// VB FillTree: an account is a root when its id equals its group id; an
// account whose group is not found is left out.
const buildTree = (list: TreeAccount[]) => {
  const byId = new Map<string, AccountNode>();
  const parentOf = new Map<string, string | null>();
  const roots: AccountNode[] = [];

  list.forEach((a) =>
    byId.set(a.accountId, {
      id: a.accountId,
      name: a.accountName,
      level: a.accountLevel,
      children: [],
    }),
  );

  list.forEach((a) => {
    const node = byId.get(a.accountId)!;

    if (!a.accountGroupId || a.accountGroupId === a.accountId) {
      roots.push(node);
      parentOf.set(node.id, null);
      return;
    }

    const parent = byId.get(a.accountGroupId);
    if (parent) {
      parent.children.push(node);
      parentOf.set(node.id, parent.id);
    }
  });

  return { roots, byId, parentOf };
};

const descendantsOf = (node: AccountNode): string[] =>
  node.children.flatMap((child) => [child.id, ...descendantsOf(child)]);

// ============================================================
// CHECKBOX (never shows the indeterminate dash)
// ============================================================

type TreeCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

const TreeCheckbox: React.FC<TreeCheckboxProps> = ({
  id,
  label,
  checked,
  onChange,
}) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = false;
  }, [checked]);

  return (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      className="
        account-checkbox
        h-4 w-4 shrink-0 cursor-pointer
        appearance-none rounded-[2px]
        border border-[#9aa8b5]
        bg-white
        checked:border-[#64d96e]
        checked:bg-[#64d96e]
        focus-visible:outline focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-[#64d96e]
      "
    />
  );
};

// ============================================================
// PAGE
// ============================================================

type RptChartOfAccountPageProps = {
  onClose?: () => void;
};

const RptChartOfAccountPage: React.FC<RptChartOfAccountPageProps> = ({
  onClose,
}) => {
  const [accounts, setAccounts] = useState<TreeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(accounts), [accounts]);

  // everything starts checked, the first level open (VB: CheckNode(Checked))
  const resetSelection = (list: TreeAccount[]) => {
    const t = buildTree(list);
    setChecked(new Set(t.byId.keys()));
    setExpanded(new Set(t.roots.map((r) => r.id)));
    setSelectedId(t.roots[0]?.id ?? null);
  };

  // ------------------------------------------------------------
  // LOAD THE TREE
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(API);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load chart of accounts");
          return;
        }
        if (cancelled) return;

        const list = data.accounts as TreeAccount[];
        setAccounts(list);
        resetSelection(list);
      } catch {
        if (!cancelled) toast.error("Failed to load chart of accounts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------
  // EXPAND / CHECK
  // ------------------------------------------------------------
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // VB SetCheckedNode: a click turns the node and everything under it on / off.
  // A parent shows checked while at least one child is checked.
  const toggleNode = (node: AccountNode) => {
    setChecked((prev) => {
      const next = new Set(prev);
      const turnOn = !next.has(node.id);

      [node.id, ...descendantsOf(node)].forEach((id) => {
        if (turnOn) next.add(id);
        else next.delete(id);
      });

      let parentId = tree.parentOf.get(node.id) ?? null;
      while (parentId) {
        const parent = tree.byId.get(parentId)!;
        if (parent.children.some((c) => next.has(c.id))) next.add(parentId);
        else next.delete(parentId);
        parentId = tree.parentOf.get(parentId) ?? null;
      }

      return next;
    });
  };

  // ------------------------------------------------------------
  // PRINT (VB cmdPrint_Click)
  // The checked accounts go to the server, which returns the report rows;
  // the report is then opened in the browser's print dialog.
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (printing) return;

    const accountIds = [...checked];
    if (accountIds.length === 0) {
      toast.warning("Select at least one account", { toastId: "coa-none" });
      return;
    }

    setPrinting(true);
    try {
      const res = await apiFetch(`${API}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not prepare the report");
        return;
      }

      printChartOfAccountReport(data.report);
    } catch {
      toast.error("Could not prepare the report");
    } finally {
      setPrinting(false);
    }
  };

  const handleClose = () => {
    resetSelection(accounts);
    if (onClose) onClose();
    else window.history.back();
  };

  // Alt+P prints, Alt+C closes (Ctrl+P / Ctrl+L of the old form clash with the
  // browser). Re-attached every render so it always sees the latest state.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.code === "KeyP") {
        event.preventDefault();
        handlePrint();
      } else if (event.code === "KeyC") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // ------------------------------------------------------------
  // ROWS ON THE SCREEN (open branches only)
  // ------------------------------------------------------------
  const visible: { node: AccountNode; depth: number }[] = [];
  const walk = (nodes: AccountNode[], depth: number) => {
    nodes.forEach((node) => {
      visible.push({ node, depth });
      if (node.children.length > 0 && expanded.has(node.id)) {
        walk(node.children, depth + 1);
      }
    });
  };
  walk(tree.roots, 0);

  const renderRow = ({ node, depth }: { node: AccountNode; depth: number }) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const selected = selectedId === node.id;

    return (
      <tr
        key={node.id}
        onClick={() => setSelectedId(node.id)}
        className={selected ? "bg-[#f2faf5]" : "bg-white"}
      >
        <td className="h-[28px] border border-[#e0e5ea] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
          {selected ? "▶" : ""}
        </td>

        <td
          className={`border border-[#e0e5ea] p-0 ${
            selected ? "bg-[#e7f7ed]" : ""
          }`}
        >
          <div
            className="flex h-[28px] items-center gap-2 pr-2"
            style={{ paddingLeft: 8 + depth * 24 }}
          >
            <button
              type="button"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              aria-expanded={hasChildren ? isExpanded : undefined}
              disabled={!hasChildren}
              onClick={(event) => {
                event.stopPropagation();
                toggleExpand(node.id);
              }}
              className={`flex h-4 w-4 shrink-0 items-center justify-center text-[8px] text-[#657486] transition-transform ${
                isExpanded ? "rotate-90" : ""
              } ${hasChildren ? "cursor-pointer" : "invisible"}`}
            >
              ▶
            </button>

            <TreeCheckbox
              id={`chk-${node.id}`}
              label={node.name}
              checked={checked.has(node.id)}
              onChange={() => toggleNode(node)}
            />

            <label
              htmlFor={`chk-${node.id}`}
              onClick={(event) => event.stopPropagation()}
              className="cursor-pointer select-none text-[12px] text-[#24364d]"
            >
              {node.name}
            </label>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Chart Of Account
            </h1>
          </header>

          <section id="trlCOA" className="px-3.5 pb-6 pt-3">
            <div className="h-[420px] overflow-auto border border-[#cfd7df] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-[22px]" />
                  <col />
                </colgroup>

                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#fafbfc] text-[#405066]">
                    <th className="h-[28px] border border-[#e0e5ea]" />
                    <th className="h-[28px] border border-[#e0e5ea] px-2 text-left font-normal">
                      Account Name
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-3 text-[12px] text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    visible.map(renderRow)
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                id="btnPrint"
                type="button"
                onClick={handlePrint}
                disabled={loading || printing}
                title="Alt+P"
                className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
              >
                <u>P</u>rint
              </button>

              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
                title="Alt+C"
                className="btn-style"
              >
                <u>C</u>lose
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Draw a white checkmark on checked boxes. */}
      <style>{`
        .account-checkbox:checked {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3 8 3 3 7-7' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
          background-size: 12px 12px;
        }
      `}</style>
    </div>
  );
};

export default RptChartOfAccountPage;
