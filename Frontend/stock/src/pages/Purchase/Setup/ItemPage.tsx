import React, { useState } from "react";
import Select from "react-select";

/* =========================================================
   TYPES
========================================================= */

interface BranchRow {
  id: number;
  lkpBranch: string;
  txtItemLocation: string;
  chkIsActive: boolean;
  chkAllowSaleBelowCost: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}
const buttonClass = `min-w-[120px] h-[40px] rounded-[4px] border-l border-r border-b border-[#9db8d4] border-t-0 bg-gradient-to-b
  from-[#ffffff] to-[#e7eef5] px-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors duration-100 hover:border-l-[#7f9fbd]
  hover:border-r-[#7f9fbd] hover:border-b-[#7f9fbd] hover:bg-gradient-to-b hover:from-[#ffffff] hover:to-[#dce8f1]
  focus:border-l-[#20884e] focus:border-r-[#20884e] focus:border-b-[#20884e] focus:border-t-0 focus:bg-gradient-to-b
  focus:from-[#ffffff] focus:to-[#dcefe5] focus:outline-none focus:ring-0`;

const textClass = `text-[15px] text-green-600`;
/* =========================================================
   ITEM PAGE
========================================================= */

const ItemPage: React.FC = () => {
  /* =========================================================
     FORM STATE
  ========================================================= */

  const [txtItemID, setTxtItemID] = useState("");
  const [txtItemName, setTxtItemName] = useState("");
  const [txtItemDescription, setTxtItemDescription] = useState("");
  const [lkpUnit, setLkpUnit] = useState("");
  const [txtPacking, setTxtPacking] = useState("0");
  const [txtCBM, setTxtCBM] = useState("0.0000");
  const [lkpItemGroupID, setLkpItemGroupID] = useState("");
  const [lkpItemGroupName, setLkpItemGroupName] = useState("");
  const [lkpSupplierID, setLkpSupplierID] = useState("");
  const [lkpSupplierName, setLkpSupplierName] = useState("");
  const [txtSupplierItemID, setTxtSupplierItemID] = useState("");
  const [txtReorderLevel, setTxtReorderLevel] = useState("0");
  const [txtReorderQty, setTxtReorderQty] = useState("0");
  const [chkAllBranches, setChkAllBranches] = useState(false);

  /* =========================================================
     BRANCH TABLE
  ========================================================= */

  const [rows, setRows] = useState<BranchRow[]>([
    {
      id: 1,
      lkpBranch: "",
      txtItemLocation: "",
      chkIsActive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 2,
      lkpBranch: "",
      txtItemLocation: "",
      chkIsActive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 3,
      lkpBranch: "",
      txtItemLocation: "",
      chkIsActive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 4,
      lkpBranch: "",
      txtItemLocation: "",
      chkIsActive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 5,
      lkpBranch: "",
      txtItemLocation: "",
      chkIsActive: false,
      chkAllowSaleBelowCost: false,
    },
  ]);

  /* =========================================================
     SELECT OPTIONS
  ========================================================= */

  const unitOptions: SelectOption[] = [
    {
      value: "PCS",
      label: "PCS",
    },
    {
      value: "KG",
      label: "KG",
    },
    {
      value: "BOX",
      label: "BOX",
    },
    {
      value: "LTR",
      label: "LTR",
    },
  ];

  const itemGroupIDOptions: SelectOption[] = [
    {
      value: "01",
      label: "01",
    },
    {
      value: "02",
      label: "02",
    },
  ];

  const itemGroupNameOptions: SelectOption[] = [
    {
      value: "General",
      label: "General",
    },
    {
      value: "Food",
      label: "Food",
    },
    {
      value: "Electronics",
      label: "Electronics",
    },
  ];

  const supplierIDOptions: SelectOption[] = [
    {
      value: "SUP001",
      label: "SUP001",
    },
    {
      value: "SUP002",
      label: "SUP002",
    },
  ];

  const supplierNameOptions: SelectOption[] = [
    {
      value: "Supplier One",
      label: "Supplier One",
    },
    {
      value: "Supplier Two",
      label: "Supplier Two",
    },
  ];

  const branchOptions: SelectOption[] = [
    {
      value: "JD",
      label: "JD",
    },
    {
      value: "DXB",
      label: "DXB",
    },
    {
      value: "AUH",
      label: "AUH",
    },
  ];

  /* =========================================================
     UPDATE TABLE ROW
  ========================================================= */

  const updateRow = (
    id: number,
    field: keyof BranchRow,
    value: string | boolean,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  /* =========================================================
     BUTTON HANDLERS
  ========================================================= */

  const handleSave = () => {
    console.log("Save", {
      txtItemID,
      txtItemName,
      txtItemDescription,
      lkpUnit,
      txtPacking,
      txtCBM,
      lkpItemGroupID,
      lkpItemGroupName,
      lkpSupplierID,
      lkpSupplierName,
      txtSupplierItemID,
      txtReorderLevel,
      txtReorderQty,
      chkAllBranches,
      rows,
    });
  };

  const handleFind = () => {
    console.log("Find");
  };

  const handleDelete = () => {
    console.log("Delete");
  };

  const handleClear = () => {
    setTxtItemID("");
    setTxtItemName("");
    setTxtItemDescription("");

    setLkpUnit("");

    setTxtPacking("0");
    setTxtCBM("0.0000");

    setLkpItemGroupID("");
    setLkpItemGroupName("");

    setLkpSupplierID("");
    setLkpSupplierName("");

    setTxtSupplierItemID("");

    setTxtReorderLevel("0");
    setTxtReorderQty("0");

    setChkAllBranches(false);

    setRows(
      rows.map((row) => ({
        ...row,
        lkpBranch: "",
        txtItemLocation: "",
        chkIsActive: false,
        chkAllowSaleBelowCost: false,
      })),
    );
  };

  /* =========================================================
     COMMON CLASSES
  ========================================================= */

  const inputClass = `h-[28px] w-full rounded-none border border-slate-300 bg-white px-2 text-[12px] text-slate-700 outline-none
    focus:border-blue-500`;

  /* =========================================================
     LABEL CLASS
  ========================================================= */

  const labelClass = `text-[12px] text-slate-700 whitespace-nowrap text-right`;

  /* =========================================================
     REACT SELECT - FORM
     
     Same 28px height as normal input.
  ========================================================= */

  const reactSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      minHeight: "28px",
      height: "28px",
      borderRadius: "0px",
      borderColor: "#cbd5e1",
      boxShadow: "none",
      fontSize: "12px",
    }),

    valueContainer: (provided: any) => ({
      ...provided,
      height: "28px",
      padding: "0 8px",
    }),

    input: (provided: any) => ({
      ...provided,
      margin: "0px",
      padding: "0px",
      fontSize: "12px",
    }),

    singleValue: (provided: any) => ({
      ...provided,
      fontSize: "12px",
      color: "#334155",
    }),

    placeholder: (provided: any) => ({
      ...provided,
      fontSize: "12px",
      color: "#64748b",
    }),

    indicatorsContainer: (provided: any) => ({
      ...provided,
      height: "28px",
    }),

    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: "4px",
    }),

    clearIndicator: (provided: any) => ({
      ...provided,
      padding: "4px",
    }),

    menu: (provided: any) => ({
      ...provided,
      zIndex: 100,
      fontSize: "12px",
    }),

    option: (provided: any) => ({
      ...provided,
      fontSize: "12px",
      padding: "6px 8px",
    }),
  };

  /* =========================================================
     REACT SELECT - TABLE
     
     Border completely removed.
     Same height as table row.
  ========================================================= */

  const tableSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      minHeight: "27px",
      height: "27px",
      border: "none",
      borderRadius: "0px",
      boxShadow: "none",
      backgroundColor: "transparent",
      fontSize: "11px",
    }),

    valueContainer: (provided: any) => ({
      ...provided,
      height: "27px",
      padding: "0 8px",
    }),

    input: (provided: any) => ({
      ...provided,
      margin: "0px",
      padding: "0px",
      fontSize: "11px",
    }),

    singleValue: (provided: any) => ({
      ...provided,
      fontSize: "11px",
      color: "#334155",
    }),

    placeholder: (provided: any) => ({
      ...provided,
      fontSize: "11px",
      color: "#64748b",
    }),

    indicatorsContainer: (provided: any) => ({
      ...provided,
      height: "27px",
    }),

    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: "3px",
    }),

    clearIndicator: (provided: any) => ({
      ...provided,
      padding: "3px",
    }),

    menu: (provided: any) => ({
      ...provided,
      zIndex: 9999,
      fontSize: "11px",
    }),

    option: (provided: any) => ({
      ...provided,
      fontSize: "11px",
      padding: "5px 8px",
    }),
  };

  /* =========================================================
     JSX
  ========================================================= */

  return (
    <div className="min-h-screen flex items-center">
      <div className="mx-auto lg:w-[50%] w-[55%] flex justify-center items-center bg-white p-0">
        {/* =====================================================
            MAIN CONTAINER
        ===================================================== */}

        <div className="mx-auto w-full border border-slate-400">
          {/* ===================================================
              HEADER
          =================================================== */}

          <div className="flex h-[30px] items-center border-b border-slate-400 bg-[#a3dfc0]">
            <span
              className="
                rounded-[3px]
                px-2
              
                text-[18px]
                font-semibold
                text-slate-800
              "
            >
              Item
            </span>
          </div>

          {/* ===================================================
              FORM
          =================================================== */}

          <div className="px-5 py-4">
            {/* =================================================
                ITEM ID
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtItemID" className={labelClass}>
                <span className="text-red-500">*</span> Item ID :
              </label>

              <input
                id="txtItemID"
                name="txtItemID"
                type="text"
                value={txtItemID}
                onChange={(e) => setTxtItemID(e.target.value)}
                className="
                  h-[28px]
                  w-[225px]
                  border
                  border-slate-300
                  px-2
                  text-[12px]
                  outline-none
                  focus:border-blue-500
                "
              />
            </div>

            {/* =================================================
                ITEM NAME
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtItemName" className={labelClass}>
                <span className="text-red-500">*</span> Item Name :
              </label>

              <input
                id="txtItemName"
                name="txtItemName"
                type="text"
                value={txtItemName}
                onChange={(e) => setTxtItemName(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtItemDescription" className={labelClass}>
                Description :
              </label>

              <input
                id="txtItemDescription"
                name="txtItemDescription"
                type="text"
                value={txtItemDescription}
                onChange={(e) => setTxtItemDescription(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* =================================================
                UNIT
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_155px]
                items-center
                gap-2
              "
            >
              <label htmlFor="lkpUnit" className={labelClass}>
                <span className="text-red-500">*</span> Unit :
              </label>

              <Select
                inputId="lkpUnit"
                name="lkpUnit"
                options={unitOptions}
                value={
                  unitOptions.find((option) => option.value === lkpUnit) || null
                }
                onChange={(option) => setLkpUnit(option?.value || "")}
                styles={reactSelectStyles}
                isClearable
              />
            </div>

            {/* =================================================
                PACKING + CBM
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_155px_65px_90px]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtPacking" className={labelClass}>
                Packing :
              </label>

              <input
                id="txtPacking"
                name="txtPacking"
                type="text"
                value={txtPacking}
                onChange={(e) => setTxtPacking(e.target.value)}
                className={inputClass}
              />

              <label htmlFor="txtCBM" className={labelClass}>
                CBM :
              </label>

              <input
                id="txtCBM"
                name="txtCBM"
                type="text"
                value={txtCBM}
                onChange={(e) => setTxtCBM(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* =================================================
                ITEM GROUP
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_155px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="lkpItemGroupID" className={labelClass}>
                <span className="text-red-500">*</span> Item Group :
              </label>

              <Select
                inputId="lkpItemGroupID"
                name="lkpItemGroupID"
                options={itemGroupIDOptions}
                value={
                  itemGroupIDOptions.find(
                    (option) => option.value === lkpItemGroupID,
                  ) || null
                }
                onChange={(option) => setLkpItemGroupID(option?.value || "")}
                styles={reactSelectStyles}
                isClearable
              />

              <Select
                inputId="lkpItemGroupName"
                name="lkpItemGroupName"
                options={itemGroupNameOptions}
                value={
                  itemGroupNameOptions.find(
                    (option) => option.value === lkpItemGroupName,
                  ) || null
                }
                onChange={(option) => setLkpItemGroupName(option?.value || "")}
                styles={reactSelectStyles}
                isClearable
              />
            </div>

            {/* =================================================
                SUPPLIER
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_155px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="lkpSupplierID" className={labelClass}>
                Supplier :
              </label>

              <Select
                inputId="lkpSupplierID"
                name="lkpSupplierID"
                options={supplierIDOptions}
                value={
                  supplierIDOptions.find(
                    (option) => option.value === lkpSupplierID,
                  ) || null
                }
                onChange={(option) => setLkpSupplierID(option?.value || "")}
                styles={reactSelectStyles}
                isClearable
              />

              <Select
                inputId="lkpSupplierName"
                name="lkpSupplierName"
                options={supplierNameOptions}
                value={
                  supplierNameOptions.find(
                    (option) => option.value === lkpSupplierName,
                  ) || null
                }
                onChange={(option) => setLkpSupplierName(option?.value || "")}
                styles={reactSelectStyles}
                isClearable
              />
            </div>

            {/* =================================================
                SUPPLIER ITEM ID
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtSupplierItemID" className={labelClass}>
                Supplier Item ID :
              </label>

              <input
                id="txtSupplierItemID"
                name="txtSupplierItemID"
                type="text"
                value={txtSupplierItemID}
                onChange={(e) => setTxtSupplierItemID(e.target.value)}
                className="
                  h-[28px]
                  w-[275px]
                  border
                  border-slate-300
                  px-2
                  text-[12px]
                  outline-none
                  focus:border-blue-500
                "
              />
            </div>

            {/* =================================================
                REORDER LEVEL
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[85px_155px]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtReorderLevel" className={labelClass}>
                Reorder Level :
              </label>

              <input
                id="txtReorderLevel"
                name="txtReorderLevel"
                type="text"
                value={txtReorderLevel}
                onChange={(e) => setTxtReorderLevel(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* =================================================
                REORDER QTY + ALL BRANCHES
            ================================================= */}

            <div
              className="
                mb-3
                grid
                grid-cols-[85px_155px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtReoderQty" className={labelClass}>
                Reorder Qty :
              </label>

              <input
                id="txtReoderQty"
                name="txtReoderQty"
                type="text"
                value={txtReorderQty}
                onChange={(e) => setTxtReorderQty(e.target.value)}
                className={inputClass}
              />

              {/* ALL BRANCHES */}

              <div
                className="
                  ml-[33px]
                  flex
                  items-center
                  gap-2
                  border-gray-300
                   border
                   w-[155px]
                   p-1
                  whitespace-nowrap
                "
              >
                <input
                  id="chkAllBranches"
                  name="chkAllBranches"
                  type="checkbox"
                  checked={chkAllBranches}
                  onChange={(e) => setChkAllBranches(e.target.checked)}
                  className="
                    h-[15px]
                    w-[15px]
                    accent-blue-600
                  "
                />

                <label
                  htmlFor="chkAllBranches"
                  className="
                    text-[12px]
                   
                    text-slate-700
                  "
                >
                  All Branches
                </label>
              </div>
            </div>

            {/* =================================================
                BRANCH OPTIONS
            ================================================= */}

            <div className="mt-2 ">
              <table
                className="
                  w-full
                  table-fixed
                  border-collapse
                  border
                  border-slate-300
                  text-[11px]
                "
              >
                <thead>
                  <tr
                    className="
                      h-[28px]
                      bg-slate-100
                    "
                  >
                    <th
                      className="
                        w-[29%]
                        border
                        border-slate-300
                        px-2
                        text-left
                        font-normal
                      "
                    >
                      Branch
                    </th>

                    <th
                      className="
                        w-[34%]
                        border
                        border-slate-300
                        px-2
                        text-left
                        font-normal
                      "
                    >
                      Item Location
                    </th>

                    <th
                      className="
                        w-[14%]
                        border
                        border-slate-300
                        px-2
                        text-center
                        font-normal
                        whitespace-nowrap
                      "
                    >
                      Allow Sale Below Cost
                    </th>

                    <th
                      className="
                        w-[14%]
                        border
                        border-slate-300
                        px-2
                        text-center
                        font-normal
                        whitespace-nowrap
                      "
                    >
                      Is Active
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="h-[32px]">
                      {/* =====================================
                          BRANCH
                      ===================================== */}

                      <td
                        className="
                          border
                          border-slate-300
                          p-0
                        "
                      >
                        <Select
                          inputId={`lkpBranch_${row.id}`}
                          name={`lkpBranch_${row.id}`}
                          options={branchOptions}
                          value={
                            branchOptions.find(
                              (option) => option.value === row.lkpBranch,
                            ) || null
                          }
                          onChange={(option) =>
                            updateRow(row.id, "lkpBranch", option?.value || "")
                          }
                          styles={tableSelectStyles}
                          isClearable
                        />
                      </td>

                      {/* =====================================
                          ITEM LOCATION
                      ===================================== */}

                      <td
                        className="
                          border
                          border-slate-300
                          p-0
                        "
                      >
                        <input
                          id={`txtItemLocation_${row.id}`}
                          name={`txtItemLocation_${row.id}`}
                          type="text"
                          value={row.txtItemLocation}
                          onChange={(e) =>
                            updateRow(row.id, "txtItemLocation", e.target.value)
                          }
                          className="h-[27px] w-full border-0 px-2 text-[11px] outline-none"
                        />
                      </td>

                      {/* =====================================
                          ALLOW SALE BELOW COST
                      ===================================== */}

                      <td className="border border-slate-300 text-center">
                        <input
                          id={`chkAllowSaleBelowCost_${row.id}`}
                          name={`chkAllowSaleBelowCost_${row.id}`}
                          type="checkbox"
                          checked={row.chkAllowSaleBelowCost}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "chkAllowSaleBelowCost",
                              e.target.checked,
                            )
                          }
                          className="h-[14px] w-[14px] accent-blue-600"
                        />
                      </td>

                      {/* =====================================
                          IS ACTIVE
                      ===================================== */}

                      <td className="border border-slate-300 text-center">
                        <input
                          id={`chkIsActive_${row.id}`}
                          name={`chkIsActive_${row.id}`}
                          type="checkbox"
                          checked={row.chkIsActive}
                          onChange={(e) =>
                            updateRow(row.id, "chkIsActive", e.target.checked)
                          }
                          className="h-3.5 w-3.5 accent-blue-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================================================
              ACTION BUTTONS
          =================================================== */}

          <div className="my-5 flex w-full flex-wrap items-center justify-center gap-2.75">
            <button
              type="button"
              className={buttonClass}
              onClick={handleSave}
              id="Savebtn"
              name="Savebtn"
            >
              <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  S
                </span>
                ave
              </span>
            </button>

            {/* =====================================================
      FIND
  ===================================================== */}

            <button
              type="button"
              className={buttonClass}
              onClick={handleFind}
              id="Findbtn"
              name="Findbtn"
            >
              <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  F
                </span>
                ind
              </span>
            </button>

            {/* =====================================================
      DELETE
  ===================================================== */}

            <button
              type="button"
              className={buttonClass}
              onClick={handleDelete}
              id="Deletebtn"
              name="Deletebtn"
            >
              <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  D
                </span>
                elete
              </span>
            </button>

            {/* =====================================================
      CLEAR
  ===================================================== */}

            <button
              type="button"
              className={buttonClass}
              onClick={handleClear}
              id="Clearbtn"
              name="Clearbtn"
            >
              <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  C
                </span>
                lear
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemPage;
