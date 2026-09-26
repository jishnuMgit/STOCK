import React, { useEffect, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { X } from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

interface BranchRow {
  id: number;
  lkpBranch: string;
  txtItemLocation: string;
  chkInactive: boolean;
  chkAllowSaleBelowCost: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

/* =========================================================
   BUTTON CLASS
========================================================= */

const buttonClass = `
  min-w-[120px]
      h-[40px]
      rounded-[4px]
      border-l
      border-r
      border-b
      border-[#9db8d4]
      border-t-0
      bg-gradient-to-b
      from-[#ffffff]
      to-[#e7eef5]
      px-4
      text-[18px]
      shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
      transition-colors
      duration-100
      hover:border-l-[#7f9fbd]
      hover:border-r-[#7f9fbd]
      hover:border-b-[#7f9fbd]
      hover:bg-gradient-to-b
      hover:from-[#ffffff]
      hover:to-[#dce8f1]
      focus:border-l-[#20884e]
      focus:border-r-[#20884e]
      focus:border-b-[#20884e]
      focus:border-t-0
      focus:bg-gradient-to-b
      focus:from-[#ffffff]
      focus:to-[#dcefe5]
      focus:outline-none
      focus:ring-0
`;

const textClass = `
  text-[18px] text-green-600
`;

/* =========================================================
   ITEM PAGE
========================================================= */

const ItemPage: React.FC = () => {
  /* =========================================================
     FORM STATE
  ========================================================= */

  const [txtItemID, setTxtItemID] = useState("");
  const [txtItemName, setTxtItemName] = useState("");
  const [txtItemDescription, setTxtItemDescription] =
    useState("");

  const [lkpUnit, setLkpUnit] = useState("");

  const [txtPacking, setTxtPacking] =
    useState("0");

  const [txtCBM, setTxtCBM] =
    useState("0.0000");

  const [lkpItemGroupID, setLkpItemGroupID] =
    useState("");

  const [lkpItemGroupName, setLkpItemGroupName] =
    useState("");

  const [lkpSupplierID, setLkpSupplierID] =
    useState("");

  const [lkpSupplierName, setLkpSupplierName] =
    useState("");

  const [txtSupplierItemID, setTxtSupplierItemID] =
    useState("");

  const [txtReorderLevel, setTxtReorderLevel] =
    useState("0");

  const [txtReorderQty, setTxtReorderQty] =
    useState("0");

  const [chkAllBranches, setChkAllBranches] = useState(false);

  /* =========================================================
     BRANCH TABLE
  ========================================================= */

  const [rows, setRows] = useState<BranchRow[]>([
    {
      id: 1,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 2,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 3,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 4,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 5,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
  ]);

  /* =========================================================
     SELECT OPTIONS
  ========================================================= */

  const [unitOptions, setUnitOptions] = useState<SelectOption[]>([]);

  /* =========================================================
     LOAD UNIT LIST (lkpUnit dropdown)
  ========================================================= */

  useEffect(() => {
    const loadUnitList = async () => {
      try {
        const CoID = localStorage.getItem("CoID");

        if (!CoID) {
          toast.error("getUnitList: no CoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Item/getUnitList?CoID=${CoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getUnitList failed:", result.message);
          toast.error(`getUnitList failed: ${result.message}`);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { funit: string }) => ({
            value: row.funit,
            label: row.funit,
          })
        );

        setUnitOptions(options);
      } catch (error) {
        console.error("getUnitList error:", error);
        toast.error(`getUnitList error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadUnitList();
  }, []);

  /* =========================================================
     LOAD ITEM GROUP LIST (lkpItemGroupID dropdown; selecting
     an ID fills lkpItemGroupName automatically)
  ========================================================= */

  const [itemGroupList, setItemGroupList] = useState<
    { fitemgroupid: string; fitemgroupname: string }[]
  >([]);

  useEffect(() => {
    const loadItemGroupList = async () => {
      try {
        const CoID = localStorage.getItem("CoID");

        if (!CoID) {
          toast.error("getItemGroupList: no CoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Item/getItemGroupList?CoID=${CoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getItemGroupList failed:", result.message);
          toast.error(`getItemGroupList failed: ${result.message}`);
          return;
        }

        setItemGroupList(result.data || []);
      } catch (error) {
        console.error("getItemGroupList error:", error);
        toast.error(`getItemGroupList error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadItemGroupList();
  }, []);

  const itemGroupIDOptions: SelectOption[] = itemGroupList.map(
    (group) => ({
      value: group.fitemgroupid,
      label: group.fitemgroupid,
    })
  );

  const itemGroupNameOptions: SelectOption[] = itemGroupList.map(
    (group) => ({
      value: group.fitemgroupname,
      label: group.fitemgroupname,
    })
  );

  /* =========================================================
     LOAD SUPPLIER LIST (lkpSupplierID dropdown; selecting
     an ID fills lkpSupplierName automatically)
  ========================================================= */

  const [supplierList, setSupplierList] = useState<
    { fcsaccountid: string; fcsaccountname: string }[]
  >([]);

  useEffect(() => {
    const loadSupplierList = async () => {
      try {
        const CoID = localStorage.getItem("CoID");

        if (!CoID) {
          toast.error("getSupplierList: no CoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Item/getSupplierList?CoID=${CoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getSupplierList failed:", result.message);
          toast.error(`getSupplierList failed: ${result.message}`);
          return;
        }

        setSupplierList(result.data || []);
      } catch (error) {
        console.error("getSupplierList error:", error);
        toast.error(`getSupplierList error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadSupplierList();
  }, []);

  const supplierIDOptions: SelectOption[] = supplierList.map(
    (supplier) => ({
      value: supplier.fcsaccountid,
      label: supplier.fcsaccountid,
    })
  );

  const supplierNameOptions: SelectOption[] = supplierList.map(
    (supplier) => ({
      value: supplier.fcsaccountname,
      label: supplier.fcsaccountname,
    })
  );

  /* =========================================================
     LOAD BRANCH LIST (lkpBranch dropdown, grid rows)
  ========================================================= */

  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    const loadBranchList = async () => {
      try {
        const CoID = localStorage.getItem("CoID");
        const userId = localStorage.getItem("userID");

        if (!CoID || !userId) {
          toast.error("getBranchList: no CoID/userId in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Item/getBranchList?CoID=${CoID}&userId=${userId}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getBranchList failed:", result.message);
          toast.error(`getBranchList failed: ${result.message}`);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { fbrid: string; fbrname: string }) => ({
            value: row.fbrid,
            label: row.fbrname,
          })
        );

        setBranchOptions(options);
      } catch (error) {
        console.error("getBranchList error:", error);
        toast.error(`getBranchList error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadBranchList();
  }, []);

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

  const handleSave = async () => {
    if (!txtItemID || !txtItemName || !lkpUnit || !lkpItemGroupID || !txtSupplierItemID) {
      toast.warning("Item ID, Item Name, Unit, Item Group and Supplier Item ID are required.");
      return;
    }

    const validRows = rows.filter((row) => row.lkpBranch);

    if (validRows.length === 0) {
      toast.warning("At least one Branch row is required.");
      return;
    }

    const CoID = localStorage.getItem("CoID");
    const userId = localStorage.getItem("userID");

    if (!CoID || !userId) {
      toast.error("Company ID / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Item/saveItem`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            CoID,
            userId,
            txtItemID,
            txtItemName,
            txtItemDescription: txtItemDescription || null,
            lkpUnit,
            txtPacking,
            txtCBM,
            lkpItemGroupID,
            lkpSupplierID: lkpSupplierID || null,
            txtSupplierItemID,
            txtReorderLevel,
            txtReorderQty,
            rows: validRows.map((row) => ({
              lkpBranch: row.lkpBranch,
              txtItemLocation: row.txtItemLocation || null,
              chkAllowSaleBelowCost: row.chkAllowSaleBelowCost,
              chkInactive: row.chkInactive,
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Item could not be saved.");
        return;
      }

      toast.success(result.message || "Item saved successfully.");
    } catch (error) {
      console.error("saveItem error:", error);
      toast.error("Cannot connect to Item API.");
    }
  };

  const handleFind = async () => {
    if (!txtItemID) {
      toast.warning("Item ID is required.");
      return;
    }

    const CoID = localStorage.getItem("CoID");

    if (!CoID) {
      toast.error("Company ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Item/getItem?CoID=${CoID}&txtItemID=${txtItemID}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Item not found.");
        return;
      }

      const header = result.header;

      setTxtItemName(header.fitemname || "");
      setTxtItemDescription(header.fitemdescription || "");
      setLkpUnit(header.funit || "");
      setTxtPacking(String(header.fpacking ?? "0"));
      setTxtCBM(String(header.fcbm ?? "0.0000"));

      setLkpItemGroupID(header.fitemgroupid || "");
      setLkpItemGroupName(
        itemGroupList.find((group) => group.fitemgroupid === header.fitemgroupid)
          ?.fitemgroupname || ""
      );

      setLkpSupplierID(header.fsupplierid || "");
      setLkpSupplierName(
        supplierList.find((supplier) => supplier.fcsaccountid === header.fsupplierid)
          ?.fcsaccountname || ""
      );

      setTxtSupplierItemID(header.fsupplieritemid || "");
      setTxtReorderLevel(String(header.freorderlevel ?? "0"));
      setTxtReorderQty(String(header.freorderqty ?? "0"));

      const foundRows: BranchRow[] = (result.rows || []).map(
        (row: {
          fbrid: string;
          fitemlocation: string | null;
          fallowsalebelowcost: boolean;
          finactive: boolean;
        }, index: number) => ({
          id: index + 1,
          lkpBranch: row.fbrid,
          txtItemLocation: row.fitemlocation || "",
          chkAllowSaleBelowCost: row.fallowsalebelowcost,
          chkInactive: row.finactive,
        })
      );

      const blankRowsNeeded = Math.max(0, 5 - foundRows.length);
      const blankRows: BranchRow[] = Array.from(
        { length: blankRowsNeeded },
        (_, index) => ({
          id: foundRows.length + index + 1,
          lkpBranch: "",
          txtItemLocation: "",
          chkInactive: false,
          chkAllowSaleBelowCost: false,
        })
      );

      setRows([...foundRows, ...blankRows]);

      toast.success("Item loaded.");
    } catch (error) {
      console.error("getItem error:", error);
      toast.error("Cannot connect to Item API.");
    }
  };

  const handleDelete = async () => {
    if (!txtItemID) {
      toast.warning("Item ID is required.");
      return;
    }

    const shouldDelete = window.confirm(
      "Are you sure you want to delete this item?"
    );

    if (!shouldDelete) {
      return;
    }

    const CoID = localStorage.getItem("CoID");
    const userId = localStorage.getItem("userID");

    if (!CoID || !userId) {
      toast.error("Company ID / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Item/deleteItem`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ CoID, userId, txtItemID }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Item could not be deleted.");
        return;
      }

      toast.success(result.message || "Item deleted successfully.");
      handleClear();
    } catch (error) {
      console.error("deleteItem error:", error);
      toast.error("Cannot connect to Item API.");
    }
  };

  const handleDeleteBranchRow = async (row: BranchRow) => {
    if (!txtItemID) {
      toast.warning("Item ID is required.");
      return;
    }

    if (!row.lkpBranch) {
      return;
    }

    const shouldDelete = window.confirm(
      "Are you sure you want to delete this branch row?"
    );

    if (!shouldDelete) {
      return;
    }

    const CoID = localStorage.getItem("CoID");
    const userId = localStorage.getItem("userID");

    if (!CoID || !userId) {
      toast.error("Company ID / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Item/deleteItemBranchRow`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            CoID,
            userId,
            txtItemID,
            lkpBranch: row.lkpBranch,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Branch row could not be deleted.");
        return;
      }

      toast.success(result.message || "Branch row deleted successfully.");

      updateRow(row.id, "lkpBranch", "");
      updateRow(row.id, "txtItemLocation", "");
      updateRow(row.id, "chkAllowSaleBelowCost", false);
      updateRow(row.id, "chkInactive", false);
    } catch (error) {
      console.error("deleteItemBranchRow error:", error);
      toast.error("Cannot connect to Item API.");
    }
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

    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        lkpBranch: "",
        txtItemLocation: "",
        chkInactive: false,
        chkAllowSaleBelowCost: false,
      })),
    );
  };

  /* =========================================================
     COMMON INPUT CLASS
  ========================================================= */

  const inputClass = `
    h-[28px]
    w-full
    rounded-none
    border
    border-slate-300
    bg-white
    px-2
    text-[12px]
    text-slate-700
    outline-none
    focus:border-blue-500
  `;

  /* =========================================================
     LABEL CLASS
  ========================================================= */

  const labelClass = `
    relative
    flex
    items-center
    justify-end
    text-right
    text-[12px]
    text-slate-700
    whitespace-nowrap
  `;

  /* =========================================================
     REQUIRED RED DOT
  ========================================================= */

  const requiredDot = (
    <span
      className="
        absolute
        right-[5px]
        -top-[3px]
        h-[4px]
        w-[4px]
        rounded-full
        
        bg-red-500
      "
    />
  );

  /* =========================================================
     REACT SELECT - FORM
  ========================================================= */

  const reactSelectStyles: StylesConfig<
    SelectOption,
    false
  > = {
    control: (provided) => ({
      ...provided,
      minHeight: "28px",
      height: "28px",
      borderRadius: "0px",
      borderColor: "#cbd5e1",
      boxShadow: "none",
      fontSize: "12px",
    }),

    valueContainer: (provided) => ({
      ...provided,
      height: "28px",
      padding: "0 8px",
    }),

    input: (provided) => ({
      ...provided,
      margin: "0px",
      padding: "0px",
      fontSize: "12px",
    }),

    singleValue: (provided) => ({
      ...provided,
      fontSize: "12px",
      color: "#334155",
    }),

    placeholder: (provided) => ({
      ...provided,
      fontSize: "12px",
      color: "#64748b",
    }),

    indicatorsContainer: (provided) => ({
      ...provided,
      height: "28px",
    }),

    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "4px",
    }),

    clearIndicator: (provided) => ({
      ...provided,
      padding: "4px",
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (provided) => ({
      ...provided,
      zIndex: 100,
      fontSize: "12px",
    }),

    menuList: (provided) => ({
      ...provided,
      padding: "3px 0",
    }),

    option: (provided, state) => ({
      ...provided,
      fontSize: "12px",
      padding: "6px 8px",

      backgroundColor: state.isSelected
        ? "#dbeafe"
        : state.isFocused
          ? "#eff6ff"
          : "#ffffff",

      color: "#475569",
      cursor: "pointer",
    }),
  };

  /* =========================================================
     REACT SELECT - TABLE
  ========================================================= */

  const tableSelectStyles: StylesConfig<
    SelectOption,
    false
  > = {
    ...reactSelectStyles,

    control: (base) => ({
      ...base,
      minHeight: "28px",
      height: "28px",
      width: "100%",
      border: "none",
      borderRadius: "0px",
      boxShadow: "none",
      backgroundColor: "transparent",
      fontSize: "12px",
      cursor: "pointer",

      "&:hover": {
        border: "none",
      },
    }),

    valueContainer: (base) => ({
      ...base,
      height: "28px",
      minWidth: 0,
      padding: "0 8px",
      overflow: "hidden",
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "12px",
    }),

    singleValue: (base) => ({
      ...base,
      color: "#334155",
      fontSize: "12px",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),

    placeholder: (base) => ({
      ...base,
      color: "#64748b",
      fontSize: "12px",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: "28px",
      flexShrink: 0,
    }),

    dropdownIndicator: (base) => ({
      ...base,
      padding: "4px",
      color: "#64748b",
    }),

    clearIndicator: (base) => ({
      ...base,
      padding: "4px",
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base) => ({
      ...base,
      zIndex: 9999,
      fontSize: "12px",
    }),

    menuList: (base) => ({
      ...base,
      padding: "3px 0",
    }),

    option: (base, state) => ({
      ...base,
      minHeight: "30px",
      padding: "6px 8px",
      fontSize: "12px",

      backgroundColor: state.isSelected
        ? "#dbeafe"
        : state.isFocused
          ? "#eff6ff"
          : "#ffffff",

      color: "#475569",
      cursor: "pointer",
    }),
  };

  /* =========================================================
     JSX
  ========================================================= */

  return (
    /*
      IMPORTANT:
      Do not use mx-auto or percentage width here.

      The Item form is kept at a fixed 960px width so
      opening/closing the sidebar does not resize or
      recenter this page.
    */
    <div
      className="
        min-h-screen
        w-full
        overflow-x-auto
        flex
        justify-center
        items-center
        bg-white
      "
    >

      {/* =====================================================
          FIXED CONTENT WIDTH
      ====================================================== */}

      <div
        className="
          w-[960px]
          min-w-[960px]
          max-w-[960px]
          ml-[4px]
          mt-[0px]
          bg-white
          p-0
        "
      >

        {/* =====================================================
            MAIN CONTAINER
        ====================================================== */}

        <div
          className="
            w-full
            border
            border-slate-400
          "
        >

          {/* ===================================================
              HEADER
          =================================================== */}

          <div
            className="
              flex
              h-[30px]
              items-center
              border-b
              border-slate-400
              bg-[#a3dfc0]
            "
          >
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
              <label
                htmlFor="txtItemID"
                className={labelClass}
              >
                {requiredDot}
                Item ID :
              </label>

              <input
                required
                id="txtItemID"
                name="txtItemID"
                type="text"
                value={txtItemID}
                onChange={(e) =>
                  setTxtItemID(e.target.value)
                }
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
              <label
                htmlFor="txtItemName"
                className={labelClass}
              >
                {requiredDot}
                Item Name :
              </label>

              <input
                required
                id="txtItemName"
                name="txtItemName"
                type="text"
                value={txtItemName}
                onChange={(e) =>
                  setTxtItemName(e.target.value)
                }
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
              <label
                htmlFor="txtItemDescription"
                className={labelClass}
              >
                Description :
              </label>

              <input
                id="txtItemDescription"
                name="txtItemDescription"
                type="text"
                value={txtItemDescription}
                onChange={(e) =>
                  setTxtItemDescription(
                    e.target.value,
                  )
                }
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
              <label
                htmlFor="lkpUnit"
                className={labelClass}
              >
                {requiredDot}
                Unit :
              </label>

              <Select
                required
                inputId="lkpUnit"
                name="lkpUnit"
                options={unitOptions}
                value={
                  unitOptions.find(
                    (option) =>
                      option.value === lkpUnit,
                  ) || null
                }
                onChange={(option) =>
                  setLkpUnit(
                    option?.value || "",
                  )
                }
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
                grid-cols-[85px_155px_65px_120px]
                items-center
                gap-2
              "
            >
              <label
                htmlFor="txtPacking"
                className={labelClass}
              >
                Packing :
              </label>

              <input
                id="txtPacking"
                name="txtPacking"
                type="text"
                value={txtPacking}
                style={{
                  textAlign: "right",
                }}
                onChange={(e) =>
                  setTxtPacking(e.target.value)
                }
                className={inputClass}
              />

              <label
                htmlFor="txtCBM"
                className={labelClass}
              >
                CBM :
              </label>

              <input
                id="txtCBM"
                name="txtCBM"
                
                type="text"
                value={txtCBM}
                style={{
                  textAlign: "right",
                  width:'85%'
                }}
                onChange={(e) =>
                  setTxtCBM(e.target.value)
                }
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
              <label
                htmlFor="lkpItemGroupID"
                className={labelClass}
              >
                {requiredDot}
                Item Group :
              </label>

              <Select
                required
                inputId="lkpItemGroupID"
                name="lkpItemGroupID"
                options={itemGroupIDOptions}
                value={
                  itemGroupIDOptions.find(
                    (option) =>
                      option.value ===
                      lkpItemGroupID,
                  ) || null
                }
                onChange={(option) => {
                  setLkpItemGroupID(
                    option?.value || "",
                  );

                  const matchedGroup = itemGroupList.find(
                    (group) =>
                      group.fitemgroupid ===
                      option?.value,
                  );

                  setLkpItemGroupName(
                    matchedGroup?.fitemgroupname || "",
                  );
                }}
                styles={reactSelectStyles}
                isClearable
              />

              <Select
                inputId="lkpItemGroupName"
                name="lkpItemGroupName"
                options={itemGroupNameOptions}
                value={
                  itemGroupNameOptions.find(
                    (option) =>
                      option.value ===
                      lkpItemGroupName,
                  ) || null
                }
                isDisabled
                styles={reactSelectStyles}
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
              <label
                htmlFor="lkpSupplierID"
                className={labelClass}
              >
                Supplier :
              </label>

              <Select
                inputId="lkpSupplierID"
                name="lkpSupplierID"
                options={supplierIDOptions}
                value={
                  supplierIDOptions.find(
                    (option) =>
                      option.value ===
                      lkpSupplierID,
                  ) || null
                }
                onChange={(option) => {
                  setLkpSupplierID(
                    option?.value || "",
                  );

                  const matchedSupplier = supplierList.find(
                    (supplier) =>
                      supplier.fcsaccountid ===
                      option?.value,
                  );

                  setLkpSupplierName(
                    matchedSupplier?.fcsaccountname || "",
                  );
                }}
                styles={reactSelectStyles}
                isClearable
              />

              <Select
                inputId="lkpSupplierName"
                name="lkpSupplierName"
                options={supplierNameOptions}
                value={
                  supplierNameOptions.find(
                    (option) =>
                      option.value ===
                      lkpSupplierName,
                  ) || null
                }
                isDisabled
                styles={reactSelectStyles}
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
              <label
                htmlFor="txtSupplierItemID"
                className={labelClass}
                style={{
                  marginLeft: "-10px",
                }}
              >
                {requiredDot}
                Supplier Item ID :
              </label>

              <input
                id="txtSupplierItemID"
                name="txtSupplierItemID"
                type="text"
                value={txtSupplierItemID}
                onChange={(e) =>
                  setTxtSupplierItemID(
                    e.target.value,
                  )
                }
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
              <label
                htmlFor="txtReorderLevel"
                className={labelClass}
              >
                Reorder Level :
              </label>

              <input
                id="txtReorderLevel"
                name="txtReorderLevel"
                type="text"
                value={txtReorderLevel}
                onChange={(e) =>
                  setTxtReorderLevel(
                    e.target.value,
                  )
                }
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
              <label
                htmlFor="txtReoderQty"
                className={labelClass}
              >
                Reorder Qty :
              </label>

              <input
                id="txtReoderQty"
                name="txtReoderQty"
                type="text"
                value={txtReorderQty}
                onChange={(e) =>
                  setTxtReorderQty(
                    e.target.value,
                  )
                }
                className={inputClass}
              />

              {/* ALL BRANCHES */}

              <div
                className="
                  ml-[35px]
                  flex
                  w-[145px]
                  items-center
                  gap-2
                  border
                  border-gray-300
                  p-1
                  whitespace-nowrap
                "
              >
                <input
                  id="chkAllBranches"
                  name="chkAllBranches"
                  type="checkbox"
                  checked={chkAllBranches}
                  onChange={(e) =>
                    setChkAllBranches(
                      e.target.checked,
                    )
                  }
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

            <div className="mt-2">

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

                    {/* =========================================
                        BRANCH
                    ========================================== */}

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
                      <span className="relative inline-block">
                        Branch

                        <span
                          className="
                            absolute
                            -right-[7px]
                            -top-[3px]
                            h-[4px]
                            w-[4px]
                            rounded-full
                            bg-red-500
                          "
                        />
                      </span>
                    </th>

                    {/* =========================================
                        ITEM LOCATION
                    ========================================== */}

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

                    {/* =========================================
                        ALLOW SALE BELOW COST
                    ========================================== */}

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

                    {/* =========================================
                        INACTIVE
                    ========================================== */}

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
                      Inactive
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {rows.map((row) => (

                    <tr
                      key={row.id}
                      className="h-[32px]"
                    >

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
                        <div className="flex h-[32px] items-stretch">
                          <div className="flex-1 overflow-hidden">
                            <Select
                              inputId={`lkpBranch_${row.id}`}
                              name={`lkpBranch_${row.id}`}
                              options={branchOptions}
                              value={
                                branchOptions.find(
                                  (option) =>
                                    option.value ===
                                    row.lkpBranch,
                                ) || null
                              }
                              onChange={(option) =>
                                updateRow(
                                  row.id,
                                  "lkpBranch",
                                  option?.value || "",
                                )
                              }
                              styles={tableSelectStyles}
                              menuPortalTarget={
                                document.body
                              }
                              menuPosition="fixed"
                            />
                          </div>

                          {row.lkpBranch && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteBranchRow(row)
                              }
                              className="
                                h-full
                                w-[20px]
                                self-stretch
                                flex
                                items-center
                                justify-center
                                text-slate-400
                                hover:text-red-500
                              "
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
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
                          value={
                            row.txtItemLocation
                          }
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "txtItemLocation",
                              e.target.value,
                            )
                          }
                          className="
                            h-[27px]
                            w-full
                            border-0
                            px-2
                            text-[11px]
                            outline-none
                          "
                        />
                      </td>

                      {/* =====================================
                          ALLOW SALE BELOW COST
                      ===================================== */}

                      <td
                        className="
                          border
                          border-slate-300
                          text-center
                        "
                      >
                        <input
                          id={`chkAllowSaleBelowCost_${row.id}`}
                          name={`chkAllowSaleBelowCost_${row.id}`}
                          type="checkbox"
                          checked={
                            row.chkAllowSaleBelowCost
                          }
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "chkAllowSaleBelowCost",
                              e.target.checked,
                            )
                          }
                          className="
                            h-[14px]
                            w-[14px]
                            accent-blue-600
                          "
                        />
                      </td>

                      {/* =====================================
                          INACTIVE
                      ===================================== */}

                      <td
                        className="
                          border
                          border-slate-300
                          text-center
                        "
                      >
                        <input
                          id={`chkInactive_${row.id}`}
                          name={`chkInactive_${row.id}`}
                          type="checkbox"
                          checked={
                            row.chkInactive
                          }
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "chkInactive",
                              e.target.checked,
                            )
                          }
                          className="
                            h-[14px]
                            w-[14px]
                            accent-blue-600
                          "
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

          <div
            className="
              my-5
              flex
              w-full
              flex-wrap
              items-center
              justify-center
              gap-2.75
            "
          >

            {/* SAVE */}

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

            {/* FIND */}

            <button
              type="button"
              className={buttonClass}
              onClick={handleFind}
              id="Findbtn"
              name="Findbtn"
            >
              <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  S
                </span>
                earch
              </span>
            </button>

            {/* DELETE */}

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

            {/* CLEAR */}

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