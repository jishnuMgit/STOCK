
import React, { useMemo, useState } from "react";
import Select, { type SingleValue, type StylesConfig } from "react-select";

interface SelectOption {
  value: string;
  label: string;
}

interface StockRow {
  id: number;
  slNo: number;
  itemId: SelectOption | null;
  itemName: SelectOption | null;
  unit: string;
  qty: string;
  unitCost: string;
}

const branchOptions: SelectOption[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH1", label: "BRANCH 1" },
  { value: "BRANCH2", label: "BRANCH 2" },
];

const itemOptions: SelectOption[] = [
  { value: "ITM001", label: "ITM001" },
  { value: "ITM002", label: "ITM002" },
  { value: "ITM003", label: "ITM003" },
  { value: "ITM004", label: "ITM004" },
];

const itemNameOptions: SelectOption[] = [
  { value: "ITM001", label: "Apple" },
  { value: "ITM002", label: "Orange" },
  { value: "ITM003", label: "Mango" },
  { value: "ITM004", label: "Banana" },
];

// ============================================================
// REACT SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "29px",
    height: "29px",
    borderRadius: "0px",
    borderColor: state.isFocused ? "#80bdff" : "#d5dce5",
    boxShadow: state.isFocused ? "0 0 0 1px #80bdff" : "none",
    fontSize: "12px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    "&:hover": {
      borderColor: "#9caec3",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    padding: "0 5px",
    height: "29px",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),

  singleValue: (base) => ({
    ...base,
    margin: 0,
    color: "#374151",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#9ca3af",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "29px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "3px",
    color: "#64748b",
  }),

  clearIndicator: (base) => ({
    ...base,
    padding: "3px",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menu: (base) => ({
    ...base,
    zIndex: 50,
    fontSize: "12px",
    marginTop: "2px",
  }),

  menuList: (base) => ({
    ...base,
    maxHeight: "180px",
  }),

  option: (base, state) => ({
    ...base,
    padding: "6px 9px",
    fontSize: "12px",
    backgroundColor: state.isSelected
      ? "#2563eb"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#374151",
    cursor: "pointer",
  }),
};

// ============================================================
// COMPONENT
// ============================================================

const BeginningStockPage: React.FC = () => {
  const [branch, setBranch] = useState<SelectOption | null>(
    branchOptions[0]
  );

  const [date, setDate] = useState("2026-06-29");
  const [note, setNote] = useState("");

  const [rows, setRows] = useState<StockRow[]>(
    Array.from({ length: 15 }, (_, index) => ({
      id: index + 1,
      slNo: index + 1,
      itemId: null,
      itemName: null,
      unit: "",
      qty: "",
      unitCost: "",
    }))
  );

  const [activeRow, setActiveRow] = useState(0);
  const [message, setMessage] = useState("");

  const updateRow = (
    rowIndex: number,
    field: keyof StockRow,
    value: string | SelectOption | null
  ) => {
    setRows((previous) =>
      previous.map((row, index) => {
        if (index !== rowIndex) return row;

        const updated = { ...row, [field]: value };

        // Keep Item ID and Item Name synchronized.
        if (field === "itemId") {
          const selected = value as SelectOption | null;

          updated.itemName = selected
            ? itemNameOptions.find(
                (option) => option.value === selected.value
              ) ?? null
            : null;
        }

        if (field === "itemName") {
          const selected = value as SelectOption | null;

          updated.itemId = selected
            ? itemOptions.find(
                (option) => option.value === selected.value
              ) ?? null
            : null;
        }

        return updated;
      })
    );
  };

  const updateTextField = (
    rowIndex: number,
    field: "unit" | "qty" | "unitCost",
    value: string
  ) => {
    updateRow(rowIndex, field, value);
  };

  const getTotalCost = (row: StockRow) => {
    const qty = Number(row.qty) || 0;
    const cost = Number(row.unitCost) || 0;
    return qty * cost;
  };

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + getTotalCost(row), 0),
    [rows]
  );

  const formatAmount = (amount: number) =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      {
        id: previous.length
          ? Math.max(...previous.map((row) => row.id)) + 1
          : 1,
        slNo: previous.length + 1,
        itemId: null,
        itemName: null,
        unit: "",
        qty: "",
        unitCost: "",
      },
    ]);
  };

  const clearForm = () => {
    setBranch(branchOptions[0]);
    setDate("2026-06-29");
    setNote("");
    setRows(
      Array.from({ length: 15 }, (_, index) => ({
        id: index + 1,
        slNo: index + 1,
        itemId: null,
        itemName: null,
        unit: "",
        qty: "",
        unitCost: "",
      }))
    );
    setActiveRow(0);
    setMessage("");
  };

  const handleAction = (action: string) => {
    if (action === "Clear") {
      clearForm();
      return;
    }

    if (action === "Save") {
      setMessage("Ready to save beginning stock.");
    } else if (action === "Delete") {
      setMessage("Delete action selected.");
    } else if (action === "Print") {
      window.print();
      return;
    } else if (action === "Post") {
      setMessage("Post action selected.");
    }
  };

  const handleTableKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: "unit" | "qty" | "unitCost"
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (field === "unit") {
      document.getElementById(`txtQty-${rowIndex}`)?.focus();
    } else if (field === "qty") {
      document.getElementById(`txtUnitCost-${rowIndex}`)?.focus();
    } else if (rowIndex < rows.length - 1) {
      setActiveRow(rowIndex + 1);
      document.getElementById(`txtSNo-${rowIndex + 1}`)?.focus();
    } else {
      addRow();
      window.setTimeout(() => {
        document.getElementById(`txtSNo-${rowIndex + 1}`)?.focus();
      }, 0);
    }
  };

  return (
    <div className="flex h-screen min-h-[500px] w-full flex-col overflow-hidden bg-white text-[12px] text-slate-700">
      {/* ======================================================
          TITLE BAR
      ====================================================== */}
      <header className="relative flex h-[42px] shrink-0 items-center justify-center border-x-4 border-t-4 border-[#333333] bg-[#9bdfbd]">
        <h1 className="text-[20px] font-semibold leading-none text-[#263d55]">
          Beginning Stock
        </h1>
      </header>

      {/* ======================================================
          HEADER FORM
      ====================================================== */}
      <section className="flex h-[66px] shrink-0 items-center justify-between gap-4 px-[22px]">
        {/* Branch */}
        <div className="flex min-w-0 items-center gap-3">
          <label
            htmlFor="lkpBranch"
            className="shrink-0 text-[14px] font-semibold text-slate-600"
          >
            Branch :
          </label>

          <div className="w-[292px] max-w-full">
            <Select<SelectOption, false>
              inputId="lkpBranch"
              name="lkpBranch"
              options={branchOptions}
              value={branch}
              onChange={(option: SingleValue<SelectOption>) =>
                setBranch(option)
              }
              styles={selectStyles}
              isClearable
              placeholder="Select Branch"
            />
          </div>
        </div>

        {/* Date */}
        <div className="flex shrink-0 items-center gap-3">
          <label
            htmlFor="dtpDate"
            className="text-[14px] font-semibold text-slate-600"
          >
            Date :
          </label>

          <input
            id="dtpDate"
            name="dtpDate"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-[29px] w-[142px] rounded border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-400"
          />
        </div>
      </section>

      {/* ======================================================
          STOCK TABLE
      ====================================================== */}
      <main className="flex min-h-0 flex-1 flex-col px-[21px]">
        <div className="min-h-0 flex-1 overflow-auto border border-[#d5e5ff]">
          <table className="w-full min-w-[900px] table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "17px" }} />
              <col style={{ width: "43px" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "40%" }} />
              <col style={{ width: "6.2%" }} />
              <col style={{ width: "6.2%" }} />
              <col style={{ width: "9.2%" }} />
              <col style={{ width: "9.2%" }} />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-[#f5f8fc]">
              <tr className="h-[27px] text-left text-[12px] text-slate-600">
                <th className="border border-[#d5e5ff] px-1 font-normal">
                  ▾
                </th>
                <th className="border border-[#d5e5ff] px-1 text-center font-medium">
                  Sl.No.
                </th>
                <th className="border border-[#d5e5ff] px-2 font-medium">
                  Item ID
                </th>
                <th className="border border-[#d5e5ff] px-2 font-medium">
                  Item Name
                </th>
                <th className="border border-[#d5e5ff] px-2 font-medium">
                  Unit
                </th>
                <th className="border border-[#d5e5ff] px-2 text-right font-medium">
                  Qty.
                </th>
                <th className="border border-[#d5e5ff] px-2 text-right font-medium">
                  Unit Cost
                </th>
                <th className="border border-[#d5e5ff] px-2 text-right font-medium">
                  Total Cost
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => setActiveRow(index)}
                  className={`h-[27px] ${
                    activeRow === index
                      ? "bg-[#f8fbff]"
                      : "bg-white"
                  }`}
                >
                  {/* Row selector */}
                  <td className="border border-[#d5e5ff] px-1 text-center">
                    {activeRow === index ? (
                      <span className="text-[9px] text-slate-700">▸</span>
                    ) : null}
                  </td>

                  {/* Serial number */}
                  <td className="border border-[#d5e5ff] p-0">
                    <input
                      id={`txtSNo-${index}`}
                      name="txtSNo"
                      aria-label={`Serial number row ${index + 1}`}
                      value={row.slNo}
                      readOnly
                      className="h-[26px] w-full bg-transparent px-1 text-center outline-none"
                    />
                  </td>

                  {/* Item ID - React Select */}
                  <td className="border border-[#d5e5ff] p-0">
                    <Select<SelectOption, false>
                      inputId={`lkpItemID-${index}`}
                      name="lkpItemID"
                      options={itemOptions}
                      value={row.itemId}
                      onChange={(option: SingleValue<SelectOption>) =>
                        updateRow(index, "itemId", option)
                      }
                      styles={selectStyles}
                      isClearable
                      menuPortalTarget={undefined}
                      placeholder=""
                    />
                  </td>

                  {/* Item Name - React Select */}
                  <td className="border border-[#d5e5ff] p-0">
                    <Select<SelectOption, false>
                      inputId={`lkpItemName-${index}`}
                      name="lkpItemName"
                      options={itemNameOptions}
                      value={row.itemName}
                      onChange={(option: SingleValue<SelectOption>) =>
                        updateRow(index, "itemName", option)
                      }
                      styles={selectStyles}
                      isClearable
                      placeholder=""
                    />
                  </td>

                  {/* Unit */}
                  <td className="border border-[#d5e5ff] p-0">
                    <input
                      id={`txtUnit-${index}`}
                      name="txtUnit"
                      value={row.unit}
                      onChange={(event) =>
                        updateTextField(index, "unit", event.target.value)
                      }
                      onKeyDown={(event) =>
                        handleTableKeyDown(event, index, "unit")
                      }
                      className="h-[26px] w-full bg-transparent px-2 outline-none focus:bg-blue-50"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="border border-[#d5e5ff] p-0">
                    <input
                      id={`txtQty-${index}`}
                      name="txtQty"
                      type="number"
                      min="0"
                      step="any"
                      value={row.qty}
                      onChange={(event) =>
                        updateTextField(index, "qty", event.target.value)
                      }
                      onKeyDown={(event) =>
                        handleTableKeyDown(event, index, "qty")
                      }
                      className="h-[26px] w-full bg-transparent px-2 text-right outline-none focus:bg-blue-50"
                    />
                  </td>

                  {/* Unit Cost */}
                  <td className="border border-[#d5e5ff] p-0">
                    <input
                      id={`txtUnitCost-${index}`}
                      name="txtUnitCost"
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitCost}
                      onChange={(event) =>
                        updateTextField(
                          index,
                          "unitCost",
                          event.target.value
                        )
                      }
                      onKeyDown={(event) =>
                        handleTableKeyDown(event, index, "unitCost")
                      }
                      className="h-[26px] w-full bg-transparent px-2 text-right outline-none focus:bg-blue-50"
                    />
                  </td>

                  {/* Total Cost */}
                  <td className="border border-[#d5e5ff] p-0">
                    <input
                      id={`txtTotalCost-${index}`}
                      name="txtTotalCost"
                      value={
                        row.qty !== "" || row.unitCost !== ""
                          ? formatAmount(getTotalCost(row))
                          : ""
                      }
                      readOnly
                      className="h-[26px] w-full bg-transparent px-2 text-right outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* ======================================================
          BOTTOM FORM
      ====================================================== */}
      <section className="flex h-[70px] shrink-0 items-center gap-3 px-[21px]">
        {/* Note */}
        <label
          htmlFor="txtNote"
          className="w-[32px] shrink-0 text-[12px] text-slate-700"
        >
          Note
        </label>

        <input
          id="txtNote"
          name="txtNote"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="h-[28px] min-w-0 flex-1 border border-slate-300 bg-white px-2 outline-none focus:border-blue-400"
        />

        {/* Total label */}
        <div className="ml-3 flex h-[28px] w-[71px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[12px]">
          Total
        </div>

        {/* Calculated total */}
        <input
          id="txtGrandTotal"
          name="txtGrandTotal"
          value={formatAmount(total)}
          readOnly
          className="h-[28px] w-[76px] shrink-0 rounded border border-slate-300 bg-white px-1 text-right text-[14px] outline-none"
        />

        {/* Right-side total display */}
        <input
          id="txtTotal"
          name="txtTotal"
          value={formatAmount(total)}
          readOnly
          className="ml-auto h-[28px] w-[110px] shrink-0 rounded border border-slate-300 bg-white px-2 text-right text-[14px] outline-none"
        />
      </section>

      {/* ======================================================
          ACTION BUTTONS
      ====================================================== */}
      <footer className="flex min-h-[94px] shrink-0 flex-col items-center justify-center gap-2 border-x-4 border-b-4 border-[#333333] bg-white px-4 pb-2">
        {message && (
          <p
            role="status"
            className="text-[11px] text-blue-700"
          >
            {message}
          </p>
        )}

        <div className="flex w-full flex-wrap items-center justify-center gap-[13px]">
          {["Save", "Delete", "Print", "Post", "Clear"].map(
            (action) => (
              <button
                key={action}
                id={`btn${action}`}
                name={`btn${action}`}
                type="button"
                onClick={() => handleAction(action)}
                className="h-[44px] w-[117px] max-w-full rounded-[5px] border border-[#9bb0c7] bg-gradient-to-b from-white to-[#dce5ed] text-[16px] font-normal text-green-600 shadow-sm transition-colors hover:from-[#edf7ff] hover:to-[#d0e1ef] focus:outline-none focus:ring-2 focus:ring-blue-300 active:translate-y-px"
              >
                <span className="underline decoration-green-600 decoration-[1px] underline-offset-2">
                  {action}
                </span>
              </button>
            )
          )}
        </div>
      </footer>
    </div>
  );
};

export default BeginningStockPage;