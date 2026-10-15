import React, { useEffect, useMemo, useState } from "react";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import {
  makePairComponents,
  filterPairOption,
  makePairDividedMenuStyles,
  pairDividedIdMenuStyles,
} from "../../../components/PairSelect/pairSelectParts";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";

// ============================================================
// ITEM ENQUIRY (the old frmItemEnquiry)
//
// A view-only screen: pick an item (Item ID or Item Name - both boxes open the
// same "ID | Name" list and picking from one fills the other, or use the
// First / Prev / Next / Last buttons; nothing is chosen when the page opens)
// and see its details and, branch by
// branch, its stock, cost and price. Nothing here can be edited or saved.
//
// Names follow the rule: state = element id/name = response key
// (lkpItemID, txtUnit, txtPacking ...).
// ============================================================

interface SelectOption {
  value: string;
  label: string;
  // the open list shows both columns and the search matches either
  id?: string;
  name?: string;
}

// one branch row of the grid (the server's response keys)
interface BranchRow {
  txtBranchID: string;
  txtBranchName: string;
  txtStock: string;
  txtPrevUnitCost: string;
  txtUnitPrice: string | null;
  txtUnitCost: string;
  txtTotalCost: string;
}

// the item's details (the server's response keys)
interface ItemHeader {
  txtUnit: string | null;
  txtPacking: string | null;
  txtCBM: string | null;
  lkpItemGroupID: string | null;
  lkpItemGroupName: string | null;
  lkpSupplierID: string | null;
  lkpSupplierName: string | null;
  txtSupplierItemID: string | null;
  txtReorderLevel: string | null;
  txtReorderQty: string | null;
}

// how many grid rows are always shown (the old grid showed empty rows too)
const MIN_GRID_ROWS = 8;

// Stock with 3 decimals, costs with 4 (the columns); the price has 2
const formatStock = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatCost = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

const formatPrice = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// "10.0000" -> "10": the details boxes show plain numbers
const plainNumber = (value: string | null | undefined) =>
  value === null || value === undefined || value === ""
    ? ""
    : String(Number(value));

// ============================================================
// ITEM ID | ITEM NAME DROPDOWNS (shared parts)
// ============================================================

// The Item ID box is 300px wide (the longest ID, ACCSS-INSULATION-1/2, would be
// cut off in a narrower one). The Item Name box's list hangs 210px past the box:
// that is the Item ID column, wide enough for a whole ID on one line.
const NAME_LIST_HANG = 210;

const itemIdComponents = makePairComponents("Item ID", "Item Name", false, true);
const itemNameComponents = makePairComponents(
  "Item ID",
  "Item Name",
  true,
  true,
  NAME_LIST_HANG,
);
const itemNameMenuStyles = makePairDividedMenuStyles(NAME_LIST_HANG);

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    borderColor: "#99a1af",
    borderRadius: "4px",
    boxShadow: "none",
    fontSize: "14px",
    backgroundColor: "#ffffff",
    cursor: "text",
    "&:hover": { borderColor: "#20884e" },
    ...(state.isFocused && {
      borderColor: "#20884e",
      boxShadow: "none",
      outline: "none",
    }),
  }),
  valueContainer: (base: any) => ({
    ...base,
    height: "30px",
    padding: "0 8px",
    overflow: "hidden",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "#344054",
    fontSize: "14px",
    margin: 0,
  }),
  placeholder: (base: any) => ({
    ...base,
    color: "#8b96a3",
    fontSize: "14px",
    margin: 0,
  }),
  input: (base: any) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "14px",
    color: "#344054",
  }),
  indicatorsContainer: (base: any) => ({ ...base, height: "28px" }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: "#aeb8c2",
    padding: "4px",
    "&:hover": { color: "#808080" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base: any) => ({
    ...base,
    fontSize: "14px",
    zIndex: 999999,
    marginTop: "2px",
    borderRadius: "3px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 999999 }),
  menuList: (base: any) => ({
    ...base,
    padding: "3px 0",
    maxHeight: "200px",
    overflowY: "auto",
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "12px",
    cursor: "pointer",
    backgroundColor: state.isFocused || state.isSelected ? "#eefbf4" : "#ffffff",
    color: "#344054",
    padding: "7px 10px",
    "&:active": { backgroundColor: "#dff5e9" },
  }),
};

const labelClass = "w-[120px] shrink-0 text-right text-[14px] text-gray-600";
const readOnlyClass = "input-style bg-gray-50";

const ItemEnquiryPage: React.FC = () => {
  // the two Item boxes (always the same item)
  const [itemIdOptions, setItemIdOptions] = useState<SelectOption[]>([]);
  const [itemNameOptions, setItemNameOptions] = useState<SelectOption[]>([]);
  const [lkpItemID, setLkpItemID] = useState<SelectOption | null>(null);
  const [lkpItemName, setLkpItemName] = useState<SelectOption | null>(null);

  // the item's details
  const [txtUnit, setTxtUnit] = useState("");
  const [txtPacking, setTxtPacking] = useState("");
  const [txtCBM, setTxtCBM] = useState("");
  const [lkpItemGroupID, setLkpItemGroupID] = useState("");
  const [lkpItemGroupName, setLkpItemGroupName] = useState("");
  const [lkpSupplierID, setLkpSupplierID] = useState("");
  const [lkpSupplierName, setLkpSupplierName] = useState("");
  const [txtSupplierItemID, setTxtSupplierItemID] = useState("");
  const [txtReorderLevel, setTxtReorderLevel] = useState("");
  const [txtReorderQty, setTxtReorderQty] = useState("");

  // the branch rows
  const [rows, setRows] = useState<BranchRow[]>([]);

  // ----------------------------------------------------------
  // CLEAR THE DETAILS AND THE GRID
  // ----------------------------------------------------------

  const clearDetails = () => {
    setTxtUnit("");
    setTxtPacking("");
    setTxtCBM("");
    setLkpItemGroupID("");
    setLkpItemGroupName("");
    setLkpSupplierID("");
    setLkpSupplierName("");
    setTxtSupplierItemID("");
    setTxtReorderLevel("");
    setTxtReorderQty("");
    setRows([]);
  };

  // ----------------------------------------------------------
  // LOAD THE ITEM LIST once. No item is chosen: the two boxes start empty and
  // the user picks one.
  // ----------------------------------------------------------

  useEffect(() => {
    const loadItems = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("Company ID not found. Please log in again.");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/ItemEnquiry/getItemList?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load item list");
          return;
        }

        const rowsFromServer: { lkpItemID: string; lkpItemName: string }[] =
          result.data || [];

        setItemIdOptions(
          rowsFromServer.map((row) => ({
            value: row.lkpItemID,
            label: row.lkpItemID,
            id: row.lkpItemID,
            name: row.lkpItemName,
          })),
        );

        setItemNameOptions(
          rowsFromServer.map((row) => ({
            value: row.lkpItemID,
            label: row.lkpItemName,
            id: row.lkpItemID,
            name: row.lkpItemName,
          })),
        );
      } catch (error) {
        console.error("getItemList (item enquiry) error:", error);
        toast.error("Cannot connect to Item Enquiry API.");
      }
    };

    loadItems();
  }, []);

  // ----------------------------------------------------------
  // THE ITEM CHANGED: load its details and its branches
  // ----------------------------------------------------------

  const itemValue = lkpItemID?.value ?? "";

  useEffect(() => {
    if (!itemValue) {
      clearDetails();
      return;
    }

    let ignore = false;

    const loadItem = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrYear = localStorage.getItem("PstrYear");

        if (!PstrCoID || !PstrYear) {
          toast.error("Company ID / Year not found. Please log in again.");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/ItemEnquiry/getItemEnquiry?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpItemID=${encodeURIComponent(itemValue)}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (ignore) return;

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the item");
          clearDetails();
          return;
        }

        const header: ItemHeader | null = result.header ?? null;

        setTxtUnit(header?.txtUnit ?? "");
        setTxtPacking(plainNumber(header?.txtPacking));
        setTxtCBM(plainNumber(header?.txtCBM));
        setLkpItemGroupID(header?.lkpItemGroupID ?? "");
        setLkpItemGroupName(header?.lkpItemGroupName ?? "");
        setLkpSupplierID(header?.lkpSupplierID ?? "");
        setLkpSupplierName(header?.lkpSupplierName ?? "");
        setTxtSupplierItemID(header?.txtSupplierItemID ?? "");
        setTxtReorderLevel(plainNumber(header?.txtReorderLevel));
        setTxtReorderQty(plainNumber(header?.txtReorderQty));
        setRows(result.data || []);
      } catch (error) {
        if (ignore) return;

        console.error("getItemEnquiry error:", error);
        toast.error("Cannot connect to Item Enquiry API.");
      }
    };

    loadItem();

    return () => {
      ignore = true;
    };
  }, [itemValue]);

  // ----------------------------------------------------------
  // PICK AN ITEM from either box: both boxes show it
  // ----------------------------------------------------------

  const pickItem = (itemID: string | null) => {
    if (!itemID) {
      setLkpItemID(null);
      setLkpItemName(null);
      return;
    }

    setLkpItemID(itemIdOptions.find((option) => option.value === itemID) ?? null);
    setLkpItemName(
      itemNameOptions.find((option) => option.value === itemID) ?? null,
    );
  };

  // ----------------------------------------------------------
  // FIRST / PREV / NEXT / LAST (the old navigator)
  // ----------------------------------------------------------

  const currentIndex = itemIdOptions.findIndex(
    (option) => option.value === itemValue,
  );

  const goTo = (index: number) => {
    const option = itemIdOptions[index];

    if (option) pickItem(option.value);
  };

  const lastIndex = itemIdOptions.length - 1;

  // ----------------------------------------------------------
  // CLEAR
  // ----------------------------------------------------------

  const handleClear = () => {
    setLkpItemID(null);
    setLkpItemName(null);
    clearDetails();
    document.getElementById("lkpItemID")?.focus();
  };

  useAltShortcuts({ c: handleClear });

  // ----------------------------------------------------------
  // TOTALS: the stock and the value of the item over its branches
  // ----------------------------------------------------------

  const txtTotalStock = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.txtStock), 0),
    [rows],
  );

  const txtItemValue = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.txtTotalCost), 0),
    [rows],
  );

  // the grid always shows at least MIN_GRID_ROWS rows
  const blankRows = Math.max(0, MIN_GRID_ROWS - rows.length);

  const navButtonClass =
    "btn-style min-w-[44px] disabled:cursor-not-allowed disabled:opacity-40";

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <div className="flex min-h-full w-full justify-center bg-gray-100 px-3 pb-5">
      <main className="mt-5 flex h-fit w-full max-w-[900px] flex-col overflow-hidden border border-gray-400 bg-white text-[12px] text-slate-700">
        {/* TITLE BAR */}
        <div className="flex h-[28px] w-full shrink-0 items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Item Enquiry
          </h1>
        </div>

        <div className="m-[12px] flex flex-col gap-[10px] px-[12px] pb-[12px]">
          {/* ITEM ID */}
          <div className="flex items-center gap-3">
            <label htmlFor="lkpItemID" className={labelClass}>
              Item ID :
            </label>

            <div className="w-[300px] max-w-full">
              <Select<SelectOption, false>
                inputId="lkpItemID"
                name="lkpItemID"
                options={itemIdOptions}
                value={lkpItemID}
                onChange={(option: SingleValue<SelectOption>) =>
                  pickItem(option?.value ?? null)
                }
                styles={
                  {
                    ...selectStyles,
                    ...pairDividedIdMenuStyles,
                  } as StylesConfig<SelectOption, false>
                }
                components={itemIdComponents}
                filterOption={filterPairOption}
                noOptionsMessage={() => "No Item Found"}
                isSearchable
                isClearable
                placeholder=""
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                menuShouldScrollIntoView
              />
            </div>
          </div>

          {/* ITEM NAME */}
          <div className="flex items-center gap-3">
            <label htmlFor="lkpItemName" className={labelClass}>
              Item Name :
            </label>

            <div className="w-[520px] max-w-full">
              <Select<SelectOption, false>
                inputId="lkpItemName"
                name="lkpItemName"
                options={itemNameOptions}
                value={lkpItemName}
                onChange={(option: SingleValue<SelectOption>) =>
                  pickItem(option?.value ?? null)
                }
                styles={
                  {
                    ...selectStyles,
                    ...itemNameMenuStyles,
                  } as StylesConfig<SelectOption, false>
                }
                components={itemNameComponents}
                filterOption={filterPairOption}
                noOptionsMessage={() => "No Item Found"}
                isSearchable
                isClearable={false}
                placeholder=""
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                menuShouldScrollIntoView
              />
            </div>
          </div>

          {/* UNIT */}
          <div className="flex items-center gap-3">
            <label htmlFor="txtUnit" className={labelClass}>
              Unit :
            </label>
            <input
              id="txtUnit"
              name="txtUnit"
              value={txtUnit}
              readOnly
              className={`${readOnlyClass} w-[240px]`}
            />
          </div>

          {/* PACKING / CBM */}
          <div className="flex items-center gap-3">
            <label htmlFor="txtPacking" className={labelClass}>
              Packing :
            </label>
            <input
              id="txtPacking"
              name="txtPacking"
              value={txtPacking}
              readOnly
              className={`${readOnlyClass} w-[110px] text-right`}
            />

            <label htmlFor="txtCBM" className="ml-[60px] w-[50px] text-right text-[14px] text-gray-600">
              CBM :
            </label>
            <input
              id="txtCBM"
              name="txtCBM"
              value={txtCBM}
              readOnly
              className={`${readOnlyClass} w-[110px] text-right`}
            />
          </div>

          {/* ITEM GROUP */}
          <div className="flex items-center gap-3">
            <label htmlFor="lkpItemGroupID" className={labelClass}>
              Item Group :
            </label>
            <input
              id="lkpItemGroupID"
              name="lkpItemGroupID"
              value={lkpItemGroupID}
              readOnly
              className={`${readOnlyClass} w-[120px]`}
            />
            <input
              id="lkpItemGroupName"
              name="lkpItemGroupName"
              aria-label="Item Group Name"
              value={lkpItemGroupName}
              readOnly
              className={`${readOnlyClass} w-[390px] max-w-full`}
            />
          </div>

          {/* SUPPLIER */}
          <div className="flex items-center gap-3">
            <label htmlFor="lkpSupplierID" className={labelClass}>
              Supplier :
            </label>
            <input
              id="lkpSupplierID"
              name="lkpSupplierID"
              value={lkpSupplierID}
              readOnly
              className={`${readOnlyClass} w-[120px]`}
            />
            <input
              id="lkpSupplierName"
              name="lkpSupplierName"
              aria-label="Supplier Name"
              value={lkpSupplierName}
              readOnly
              className={`${readOnlyClass} w-[390px] max-w-full`}
            />
          </div>

          {/* SUPPLIER ITEM ID */}
          <div className="flex items-center gap-3">
            <label htmlFor="txtSupplierItemID" className={labelClass}>
              Supplier Item ID :
            </label>
            <input
              id="txtSupplierItemID"
              name="txtSupplierItemID"
              value={txtSupplierItemID}
              readOnly
              className={`${readOnlyClass} w-[240px]`}
            />
          </div>

          {/* REORDER LEVEL / QTY */}
          <div className="flex items-center gap-3">
            <label htmlFor="txtReorderLevel" className={labelClass}>
              Reorder Level :
            </label>
            <input
              id="txtReorderLevel"
              name="txtReorderLevel"
              value={txtReorderLevel}
              readOnly
              className={`${readOnlyClass} w-[110px] text-right`}
            />

            <label htmlFor="txtReorderQty" className="ml-[60px] w-[100px] text-right text-[14px] text-gray-600">
              Reorder Qty. :
            </label>
            <input
              id="txtReorderQty"
              name="txtReorderQty"
              value={txtReorderQty}
              readOnly
              className={`${readOnlyClass} w-[110px] text-right`}
            />
          </div>

          {/* BRANCH GRID */}
          <div className="customer-table-scroll mt-[6px] overflow-auto border border-[#bfe8d0]">
            <table className="w-full min-w-[700px] table-fixed border-collapse border border-[#bfe8d0]">
              <colgroup>
                <col />
                <col style={{ width: "13%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>

              <thead className="bg-[#edf9f2]">
                <tr className="h-[30px] text-[14px] text-gray-600">
                  <th className="border border-[#bfe8d0] px-2 text-left font-normal">
                    Branch
                  </th>
                  <th className="border border-[#bfe8d0] px-2 text-right font-normal">
                    Stock
                  </th>
                  <th className="border border-[#bfe8d0] px-2 text-right font-normal">
                    Prev. Unit Cost
                  </th>
                  <th className="border border-[#bfe8d0] px-2 text-right font-normal">
                    Unit Price
                  </th>
                  <th className="border border-[#bfe8d0] px-2 text-right font-normal">
                    Unit Cost
                  </th>
                  <th className="border border-[#bfe8d0] px-2 text-right font-normal">
                    Total Cost
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.txtBranchID} className="h-[30px] text-[14px]">
                    <td className="border border-[#bfe8d0] px-2">
                      <input
                        id={`txtBranchName-${index}`}
                        name="txtBranchName"
                        value={row.txtBranchName}
                        readOnly
                        className="h-[26px] w-full bg-transparent outline-none"
                      />
                    </td>
                    <td className="border border-[#bfe8d0] px-2">
                      <input
                        id={`txtStock-${index}`}
                        name="txtStock"
                        value={formatStock(Number(row.txtStock))}
                        readOnly
                        className="h-[26px] w-full bg-transparent text-right outline-none"
                      />
                    </td>
                    <td className="border border-[#bfe8d0] px-2">
                      <input
                        id={`txtPrevUnitCost-${index}`}
                        name="txtPrevUnitCost"
                        value={formatCost(Number(row.txtPrevUnitCost))}
                        readOnly
                        className="h-[26px] w-full bg-transparent text-right outline-none"
                      />
                    </td>
                    <td className="border border-[#bfe8d0] px-2">
                      <input
                        id={`txtUnitPrice-${index}`}
                        name="txtUnitPrice"
                        value={
                          row.txtUnitPrice === null
                            ? ""
                            : formatPrice(Number(row.txtUnitPrice))
                        }
                        readOnly
                        className="h-[26px] w-full bg-transparent text-right outline-none"
                      />
                    </td>
                    <td className="border border-[#bfe8d0] px-2">
                      <input
                        id={`txtUnitCost-${index}`}
                        name="txtUnitCost"
                        value={formatCost(Number(row.txtUnitCost))}
                        readOnly
                        className="h-[26px] w-full bg-transparent text-right outline-none"
                      />
                    </td>
                    <td className="border border-[#bfe8d0] px-2">
                      <input
                        id={`txtTotalCost-${index}`}
                        name="txtTotalCost"
                        value={formatCost(Number(row.txtTotalCost))}
                        readOnly
                        className="h-[26px] w-full bg-transparent text-right outline-none"
                      />
                    </td>
                  </tr>
                ))}

                {Array.from({ length: blankRows }).map((_, index) => (
                  <tr key={`blank-${index}`} className="h-[30px]">
                    {Array.from({ length: 6 }).map((__, cell) => (
                      <td key={cell} className="border border-[#bfe8d0]" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* NAVIGATOR / TOTALS / CLEAR */}
          <div className="mt-[4px] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                id="btnFirst"
                name="btnFirst"
                type="button"
                aria-label="First item"
                onClick={() => goTo(0)}
                disabled={itemIdOptions.length === 0 || currentIndex === 0}
                className={navButtonClass}
              >
                |&lt;
              </button>
              <button
                id="btnPrev"
                name="btnPrev"
                type="button"
                aria-label="Previous item"
                onClick={() => goTo(currentIndex - 1)}
                disabled={itemIdOptions.length === 0 || currentIndex <= 0}
                className={navButtonClass}
              >
                &lt;
              </button>
              <button
                id="btnNext"
                name="btnNext"
                type="button"
                aria-label="Next item"
                onClick={() => goTo(currentIndex + 1)}
                disabled={itemIdOptions.length === 0 || currentIndex >= lastIndex}
                className={navButtonClass}
              >
                &gt;
              </button>
              <button
                id="btnLast"
                name="btnLast"
                type="button"
                aria-label="Last item"
                onClick={() => goTo(lastIndex)}
                disabled={itemIdOptions.length === 0 || currentIndex === lastIndex}
                className={navButtonClass}
              >
                &gt;|
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="txtTotalStock" className="text-[14px] text-gray-600">
                  Total :
                </label>
                <input
                  id="txtTotalStock"
                  name="txtTotalStock"
                  value={formatStock(txtTotalStock)}
                  readOnly
                  className="input-style w-[130px] text-right"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="txtItemValue" className="text-[14px] text-gray-600">
                  Item Value :
                </label>
                <input
                  id="txtItemValue"
                  name="txtItemValue"
                  value={formatCost(txtItemValue)}
                  readOnly
                  className="input-style w-[150px] text-right"
                />
              </div>

              <button
                id="btnClear"
                name="btnClear"
                type="button"
                onClick={handleClear}
                className="btn-style"
              >
                <span className="underline underline-offset-2">C</span>
                lear
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemEnquiryPage;
