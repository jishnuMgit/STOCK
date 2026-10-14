
import React, { useEffect, useRef, useState } from "react";

type AccountNode = {
  id: string;
  name: string;
  children?: AccountNode[];
};

const accountTree: AccountNode[] = [
  {
    id: "1",
    name: "PENDING CASH",
    children: [
      { id: "1-1", name: "CUSTOMER 1" },
      { id: "1-2", name: "CUSTOMER 2" },
    ],
  },
  {
    id: "2",
    name: "RECEIVABLES OFFICE RUH",
    children: [
      { id: "2-1", name: "CUSTOMER 3" },
      { id: "2-2", name: "CUSTOMER 4" },
    ],
  },
];

const leavesOf = (node: AccountNode): string[] =>
  node.children && node.children.length > 0
    ? node.children.map((child) => child.id)
    : [node.id];

const allLeafIds = (): string[] => accountTree.flatMap(leavesOf);

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
    if (ref.current) {
      // Never show the indeterminate dash.
      ref.current.indeterminate = false;
    }
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
        appearance-none rounded-xs
        border border-[#9aa8b5]
        bg-white
        checked:border-[#64d96e]
        checked:bg-[#64d96e] focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-[#64d96e]
      "
    />
  );
};

type RptCustomerListPageProps = {
  onClose?: () => void;
};

const RptCustomerListPage: React.FC<
  RptCustomerListPageProps
> = ({ onClose }) => {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(allLeafIds()),
  );

const [expanded, setExpanded] = useState<Set<string>>(
  () => new Set(accountTree.map((node) => node.id)),
);

  const [selectedId, setSelectedId] = useState<string | null>(
    accountTree[0]?.id ?? null,
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleNode = (node: AccountNode) => {
    const leaves = leavesOf(node);

    setChecked((prev) => {
      const next = new Set(prev);
      const allChecked = leaves.every((leaf) => next.has(leaf));

      leaves.forEach((leaf) => {
        if (allChecked) {
          next.delete(leaf);
        } else {
          next.add(leaf);
        }
      });

      return next;
    });
  };

  const nodeState = (node: AccountNode) => {
    const leaves = leavesOf(node);
    const count = leaves.filter((leaf) => checked.has(leaf)).length;

    return {
      // A parent is checked when at least one child is checked.
      checked: count > 0,
    };
  };

  const handlePrint = () => {
    const selected = accountTree
      .map((root) => {
        const children = (root.children ?? [])
          .filter((child) => checked.has(child.id))
          .map((child) => ({
            id: child.id,
            name: child.name,
          }));

        if (children.length === 0 && !checked.has(root.id)) {
          return null;
        }

        return {
          id: root.id,
          name: root.name,
          children,
        };
      })
      .filter(Boolean);

    console.log(selected);
  };

  const handleClose = () => {
    setChecked(new Set(allLeafIds()));
    setExpanded(new Set(accountTree.map((node) => node.id)));
    setSelectedId(accountTree[0]?.id ?? null);
    onClose?.();
  };

  const renderRow = (node: AccountNode, level: 1 | 2) => {
    const hasChildren =
      !!node.children && node.children.length > 0;

    const isExpanded = expanded.has(node.id);
    const selected = selectedId === node.id;
    const state = nodeState(node);

    return (
      <tr
        key={node.id}
        onClick={() => setSelectedId(node.id)}
        className={selected ? "bg-[#f2faf5]" : "bg-white"}
      >
        <td className="h-7 border border-[#e0e5ea] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
          {selected ? "▶" : ""}
        </td>

        <td
          className={`border border-[#e0e5ea] p-0 ${
            selected ? "bg-[#e7f7ed]" : ""
          }`}
        >
          <div
            className="flex h-7 items-center gap-2 pr-2"
            style={{
              // Child indentation increased by 10px.
              paddingLeft: level === 1 ? 8 : 44,
            }}
          >
            {level === 1 ? (
              <button
                type="button"
                aria-label={isExpanded ? "Collapse" : "Expand"}
                aria-expanded={
                  hasChildren ? isExpanded : undefined
                }
                disabled={!hasChildren}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpand(node.id);
                }}
                className={`flex h-4 w-4 shrink-0 items-center justify-center text-[8px] text-[#657486] transition-transform ${
                  isExpanded ? "rotate-90" : ""
                } ${
                  hasChildren
                    ? "cursor-pointer"
                    : "invisible"
                }`}
              >
                ▶
              </button>
            ) : null}

            <TreeCheckbox
              id={`chk-${node.id}`}
              label={node.name}
              checked={state.checked}
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
               Customer List            </h1>
          </header>

          <section id="trlCustomerList" className="px-3.5 pb-6 pt-3">
            <div className="h-105 overflow-auto border border-[#cfd7df] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-5.5" />
                  <col />
                </colgroup>

                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#fafbfc] text-[#405066]">
                    <th className="h-7 border border-[#e0e5ea]" />
                    <th className="h-7 border border-[#e0e5ea] px-2 text-left font-normal">
                      Customer Name
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {accountTree.map((root) => (
                    <React.Fragment key={root.id}>
                      {renderRow(root, 1)}

                      {expanded.has(root.id) &&
                        root.children?.map((child) =>
                          renderRow(child, 2),
                        )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                id="btnPrint"
                type="button"
                onClick={handlePrint}
                className="btn-style"
              >
                <u>P</u>rint
              </button>

              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
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

export default RptCustomerListPage;
