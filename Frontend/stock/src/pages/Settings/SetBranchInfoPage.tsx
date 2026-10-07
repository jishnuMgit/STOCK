import React, { useEffect, useState } from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import {
  filterLabelOrValue,
  BranchMenuList,
  BranchOption,
  CustomDropdownIndicator,
  branchMenuStyles,
} from "../../components/BranchSelect/branchSelectParts";

/* =========================================================
   TYPES
========================================================= */

interface SelectOption {
  value: string;
  label: string;
}

/* =========================================================
   REUSABLE TEXT ROW

   IMPORTANT:
   This component is OUTSIDE SetBranchInfo so it is not
   recreated on every keystroke. This keeps the input focused
   while typing continuously.
========================================================= */

interface BranchTextRowProps {
  labelEn: string;
  labelAr: string;
  idEn: string;
  idAr: string;
  valueEn: string;
  setValueEn: (value: string) => void;
  valueAr: string;
  setValueAr: (value: string) => void;
  maxLength: number;
  inputWidth: number;
  // shows the red * after the label (both boxes of the row are mandatory)
  required?: boolean;
}

const BranchTextRow: React.FC<BranchTextRowProps> = ({
  labelEn,
  labelAr,
  idEn,
  idAr,
  valueEn,
  setValueEn,
  valueAr,
  setValueAr,
  maxLength,
  inputWidth,
  required = false,
}) => {
  const rowGrid =
    "grid grid-cols-[195px_460px_460px_90px] items-center gap-3";

  // the shared form-input look from index.css
  const inputClass = "input-style";

  const labelEnglishClass =
    "whitespace-nowrap pr-3 text-right text-[14px] text-gray-600";

  const labelArabicClass =
    "whitespace-nowrap text-right text-[14px] text-gray-600";



  return (
    <div
      className={`
        ${rowGrid}
        mb-[8px]
      `}
    >
      <label
        htmlFor={idEn}
        className={labelEnglishClass}
      >
        {labelEn}
        <span className="inline-block w-[10px] text-center text-red-500">{required ? "*" : ""}</span>:
      </label>

      <div className="flex w-[460px] justify-start">
        <input
          id={idEn}
          name={idEn}
          type="text"
          value={valueEn}
          maxLength={maxLength}
          onChange={(e) => setValueEn(e.target.value)}
          className={inputClass}
          style={{ width: `${inputWidth}px` }}
        />
      </div>

      <div className="flex w-[460px] justify-end">
        <input
          id={idAr}
          name={idAr}
          type="text"
          dir="rtl"
          value={valueAr}
          maxLength={maxLength}
          onChange={(e) => setValueAr(e.target.value)}
          className={`${inputClass} text-right`}
          style={{ width: `${inputWidth}px` }}
        />
      </div>

      <label
        htmlFor={idAr}
        dir="rtl"
        className={labelArabicClass}
      >
        {labelAr} :
      </label>
    </div>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

// dbo.tblmenu fmenuid for the Set Branch Info page.
const MENU_ID = "9115";

const SetBranchInfo: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  /* =========================================================
     STATES
  ========================================================= */

  const [lkpBranch, setLkpBranch] = useState("");
  const [txtBrName_AR, setTxtBrName_AR] = useState("");

  const [txtBuildingNo, setTxtBuildingNo] = useState("");
  const [txtBuildingNo_AR, setTxtBuildingNo_AR] = useState("");

  const [txtStreetName, setTxtStreetName] = useState("");
  const [txtStreetName_AR, setTxtStreetName_AR] = useState("");

  const [txtDistrict, setTxtDistrict] = useState("");
  const [txtDistrict_AR, setTxtDistrict_AR] = useState("");

  const [txtCity, setTxtCity] = useState("");
  const [txtCity_AR, setTxtCity_AR] = useState("");

  const [txtCountry, setTxtCountry] = useState("");
  const [txtCountry_AR, setTxtCountry_AR] = useState("");

  const [txtPostalCode, setTxtPostalCode] = useState("");
  const [txtPostalCode_AR, setTxtPostalCode_AR] = useState("");

  const [txtAdditionalNo, setTxtAdditionalNo] = useState("");
  const [txtAdditionalNo_AR, setTxtAdditionalNo_AR] = useState("");

  const [txtCRNo, setTxtCRNo] = useState("");
  const [txtCRNo_AR, setTxtCRNo_AR] = useState("");

  const [txtLicenseNo, setTxtLicenseNo] = useState("");
  const [txtLicenseNo_AR, setTxtLicenseNo_AR] = useState("");

  const [txtLicenseCategory, setTxtLicenseCategory] = useState("");
  const [txtLicenseCategory_AR, setTxtLicenseCategory_AR] = useState("");

  const [txtBrAddress1, setTxtBrAddress1] = useState("");
  const [txtBrAddress1_AR, setTxtBrAddress1_AR] = useState("");

  const [txtBrAddress2, setTxtBrAddress2] = useState("");
  const [txtBrAddress2_AR, setTxtBrAddress2_AR] = useState("");

  const [txtBrAddress3, setTxtBrAddress3] = useState("");
  const [txtBrAddress3_AR, setTxtBrAddress3_AR] = useState("");

  const [txtBrAddress4, setTxtBrAddress4] = useState("");
  const [txtBrAddress4_AR, setTxtBrAddress4_AR] = useState("");

  const [chkHo, setChkHo] = useState(false);

  /* =========================================================
     LOAD BRANCH LIST (lkpBranch dropdown, filtered by
     dbo.userbranches — same as SetDocumentNo / ItemPage)
  ========================================================= */

  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);

  // the branch the page opened with, and a counter that forces the
  // branch info to be loaded again (used by Clear)
  const [defaultBranch, setDefaultBranch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadBranchList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrUserID = localStorage.getItem("PstrUserID");

        if (!PstrCoID || !PstrUserID) {
          toast.error("getBranchList: no PstrCoID/PstrUserID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/BranchInfo/getBranchList?PstrCoID=${PstrCoID}&PstrUserID=${PstrUserID}`
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
          (row: { lkpBranch: string; txtBranchName: string }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
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
     LOAD DEFAULT BRANCH (lkpBranch pre-select, live lookup
     via dbo.getuserdefbranch — same as SetDocumentNo)
  ========================================================= */

  useEffect(() => {
    const loadDefaultBranch = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrUserID = localStorage.getItem("PstrUserID");

        if (!PstrCoID || !PstrUserID) {
          toast.error("getDefaultBranch: no PstrCoID/PstrUserID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/BranchInfo/getDefaultBranch?PstrCoID=${PstrCoID}&PstrUserID=${PstrUserID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getDefaultBranch failed:", result.message);
          toast.error(`getDefaultBranch failed: ${result.message}`);
          return;
        }

        if (result.data) {
          setDefaultBranch(result.data);
          setLkpBranch(result.data);
        }
      } catch (error) {
        console.error("getDefaultBranch error:", error);
        toast.error(`getDefaultBranch error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadDefaultBranch();
  }, []);

  /* =========================================================
     PREFILL FORM WHEN A BRANCH IS SELECTED (mode 'G')
  ========================================================= */

  useEffect(() => {
    if (!lkpBranch) {
      handleClear(false);
      return;
    }

    const loadBranchInfo = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getBranchInfo: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/BranchInfo/getBranchInfo?PstrCoID=${PstrCoID}&lkpBranch=${lkpBranch}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Branch info not found.");
          return;
        }

        const data = result.data;

        setTxtBrName_AR(data.txtBrName_AR || "");
        setTxtBuildingNo(data.txtBuildingNo || "");
        setTxtBuildingNo_AR(data.txtBuildingNo_AR || "");
        setTxtStreetName(data.txtStreetName || "");
        setTxtStreetName_AR(data.txtStreetName_AR || "");
        setTxtDistrict(data.txtDistrict || "");
        setTxtDistrict_AR(data.txtDistrict_AR || "");
        setTxtCity(data.txtCity || "");
        setTxtCity_AR(data.txtCity_AR || "");
        setTxtCountry(data.txtCountry || "");
        setTxtCountry_AR(data.txtCountry_AR || "");
        setTxtPostalCode(data.txtPostalCode || "");
        setTxtPostalCode_AR(data.txtPostalCode_AR || "");
        setTxtAdditionalNo(data.txtAdditionalNo || "");
        setTxtAdditionalNo_AR(data.txtAdditionalNo_AR || "");
        setTxtCRNo(data.txtCRNo || "");
        setTxtCRNo_AR(data.txtCRNo_AR || "");
        setTxtLicenseNo(data.txtLicenseNo || "");
        setTxtLicenseNo_AR(data.txtLicenseNo_AR || "");
        setTxtLicenseCategory(data.txtLicenseCategory || "");
        setTxtLicenseCategory_AR(data.txtLicenseCategory_AR || "");
        setTxtBrAddress1(data.txtBrAddress1 || "");
        setTxtBrAddress1_AR(data.txtBrAddress1_AR || "");
        setTxtBrAddress2(data.txtBrAddress2 || "");
        setTxtBrAddress2_AR(data.txtBrAddress2_AR || "");
        setTxtBrAddress3(data.txtBrAddress3 || "");
        setTxtBrAddress3_AR(data.txtBrAddress3_AR || "");
        setTxtBrAddress4(data.txtBrAddress4 || "");
        setTxtBrAddress4_AR(data.txtBrAddress4_AR || "");
        setChkHo(!!data.chkHo);
      } catch (error) {
        console.error("getBranchInfo error:", error);
        toast.error(`getBranchInfo error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadBranchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lkpBranch, reloadKey]);

  const buttonClass = "btn-style";

  const textClass = "";

  /* =========================================================
     FIELD WIDTHS

     IMPORTANT:
     These are the ACTUAL input widths.
  ========================================================= */

  const WIDTH_BRANCH = 300;
  const WIDTH_GENERAL = 460;
  const WIDTH_NUMBERS = 368;
  const WIDTH_ADDRESS = 460;

  /* =========================================================
     FIXED GRID

     DO NOT CHANGE THESE COLUMNS.

     120px = English label
     460px = English input area
     460px = Arabic input area
     100px = Arabic label
  ========================================================= */

  const rowGrid =
    "grid grid-cols-[195px_460px_460px_90px] items-center gap-3";

  /* =========================================================
     INPUT CLASS
  ========================================================= */

  // the shared form-input look from index.css
  const inputClass = "input-style";

  /* =========================================================
     LABEL CLASSES
  ========================================================= */

  const labelEnglishClass =
    "whitespace-nowrap pr-3 text-right text-[14px] text-gray-600";

  const labelArabicClass =
    "whitespace-nowrap text-right text-[14px] text-gray-600";

  /* =========================================================
     SELECT STYLES
  ========================================================= */

  const getSelectStyles = (
    width: number,
    direction: "ltr" | "rtl",
  ): StylesConfig<SelectOption, false> => ({
    container: (base) => ({
      ...base,
      width: `${width}px`,
      minWidth: `${width}px`,
    }),

    control: (base, state) => ({
      ...base,

      width: `${width}px`,
      minHeight: "32px",
      height: "32px",

      borderRadius: "6px",

      borderColor: state.isFocused
        ? "#3b82f6"
        : "#cbd5e1",

      boxShadow: "none",

      backgroundColor: "#ffffff",

      fontSize: "13px",

      cursor: "pointer",

      "&:hover": {
        borderColor: state.isFocused
          ? "#3b82f6"
          : "#94a3b8",
      },
    }),

    valueContainer: (base) => ({
      ...base,

      height: "32px",

      padding:
        direction === "rtl"
          ? "0 8px 0 4px"
          : "0 4px 0 8px",

      justifyContent:
        direction === "rtl"
          ? "flex-end"
          : "flex-start",
    }),

    input: (base) => ({
      ...base,

      margin: 0,
      padding: 0,

      fontSize: "13px",

      textAlign:
        direction === "rtl"
          ? "right"
          : "left",
    }),

    singleValue: (base) => ({
      ...base,

      width: "100%",

      color: "#334155",

      fontSize: "13px",

      textAlign:
        direction === "rtl"
          ? "right"
          : "left",

      direction,
    }),

    placeholder: (base) => ({
      ...base,

      color: "#64748b",

      fontSize: "13px",

      textAlign:
        direction === "rtl"
          ? "right"
          : "left",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: "32px",
    }),

    dropdownIndicator: (base) => ({
      ...base,

      padding: "4px 7px",

      color: "#64748b",
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base) => ({
      ...base,

      zIndex: 9999,

      width: `${width}px`,

      fontSize: "13px",
    }),

    menuList: (base) => ({
      ...base,
      padding: "3px 0",
    }),

    option: (base, state) => ({
      ...base,

      minHeight: "32px",

      padding: "7px 10px",

      fontSize: "13px",

      textAlign:
        direction === "rtl"
          ? "right"
          : "left",

      direction,

      backgroundColor:
        state.isSelected
          ? "#dbeafe"
          : state.isFocused
            ? "#eff6ff"
            : "#ffffff",

      color: "#334155",

      cursor: "pointer",
    }),
  });

  /* =========================================================
     SELECT STYLES
  ========================================================= */

  const branchSelectStyles =
    getSelectStyles(
      WIDTH_BRANCH,
      "ltr",
    );

  /* =========================================================
     SAVE
  ========================================================= */

  // This screen only ever edits an existing branch, so it works with the
  // MODIFY right (letter M of the menu's buttons), not Save.
  const handleModify = async () => {
    if (!perms.modify) {
      toast.error("You do not have permission to Modify.");
      return;
    }

    if (!lkpBranch) {
      toast.warning("Branch is required.");
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrUserID) {
      toast.error("Company ID / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/BranchInfo/saveBranchInfo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrUserID,
            lkpBranch,
            txtBrName_AR: txtBrName_AR || null,
            txtBuildingNo: txtBuildingNo || null,
            txtBuildingNo_AR: txtBuildingNo_AR || null,
            txtStreetName: txtStreetName || null,
            txtStreetName_AR: txtStreetName_AR || null,
            txtDistrict: txtDistrict || null,
            txtDistrict_AR: txtDistrict_AR || null,
            txtCity: txtCity || null,
            txtCity_AR: txtCity_AR || null,
            txtCountry: txtCountry || null,
            txtCountry_AR: txtCountry_AR || null,
            txtPostalCode: txtPostalCode || null,
            txtPostalCode_AR: txtPostalCode_AR || null,
            txtAdditionalNo: txtAdditionalNo || null,
            txtAdditionalNo_AR: txtAdditionalNo_AR || null,
            txtCRNo: txtCRNo || null,
            txtCRNo_AR: txtCRNo_AR || null,
            txtLicenseNo: txtLicenseNo || null,
            txtLicenseNo_AR: txtLicenseNo_AR || null,
            txtLicenseCategory: txtLicenseCategory || null,
            txtLicenseCategory_AR: txtLicenseCategory_AR || null,
            txtBrAddress1: txtBrAddress1 || null,
            txtBrAddress1_AR: txtBrAddress1_AR || null,
            txtBrAddress2: txtBrAddress2 || null,
            txtBrAddress2_AR: txtBrAddress2_AR || null,
            txtBrAddress3: txtBrAddress3 || null,
            txtBrAddress3_AR: txtBrAddress3_AR || null,
            txtBrAddress4: txtBrAddress4 || null,
            txtBrAddress4_AR: txtBrAddress4_AR || null,
            chkHo,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Branch info could not be saved.");

        // the backend validator names the field that failed - same name as
        // the element id, so the cursor goes straight into it
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "Branch info saved successfully.");
    } catch (error) {
      console.error("saveBranchInfo error:", error);
      toast.error("Cannot connect to Branch Info API.");
    }
  };

  /* =========================================================
     CLEAR
  ========================================================= */

  const handleClear = (clearBranch: boolean = true) => {
    if (clearBranch) {
      // back to the page-open state: the default branch, reloaded
      setLkpBranch(defaultBranch);
      setReloadKey((previous) => previous + 1);
    }

    setTxtBrName_AR("");

    setTxtBuildingNo("");
    setTxtBuildingNo_AR("");

    setTxtStreetName("");
    setTxtStreetName_AR("");

    setTxtDistrict("");
    setTxtDistrict_AR("");

    setTxtCity("");
    setTxtCity_AR("");

    setTxtCountry("");
    setTxtCountry_AR("");

    setTxtPostalCode("");
    setTxtPostalCode_AR("");

    setTxtAdditionalNo("");
    setTxtAdditionalNo_AR("");

    setTxtCRNo("");
    setTxtCRNo_AR("");

    setTxtLicenseNo("");
    setTxtLicenseNo_AR("");

    setTxtLicenseCategory("");
    setTxtLicenseCategory_AR("");

    setTxtBrAddress1("");
    setTxtBrAddress1_AR("");

    setTxtBrAddress2("");
    setTxtBrAddress2_AR("");

    setTxtBrAddress3("");
    setTxtBrAddress3_AR("");

    setTxtBrAddress4("");
    setTxtBrAddress4_AR("");

    setChkHo(false);
  };

  /* =========================================================
     KEYBOARD SHORTCUTS
     Alt+M -> Modify, Alt+C -> Clear (matches the underlined
     accelerator letters on the buttons).
  ========================================================= */

  useAltShortcuts({
    m: handleModify,
    c: () => handleClear(true),
  });

  /* =========================================================
     JSX
  ========================================================= */

  return (
   <div
  onKeyDown={handleEnterAsTab}
  className="flex min-h-screen w-full items-center justify-center overflow-x-auto bg-white"
>

      {/* =====================================================
          MAIN CONTAINER

          Fixed width prevents the layout from moving
          when the sidebar is displayed.
      ===================================================== */}

      <div className="w-[1300px] shrink-0 overflow-hidden border border-slate-400 bg-white shadow-sm">

        {/* ===================================================
            TITLE
        ==================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Set Branch Info.
          </h1>
        </div>

        {/* ===================================================
            FORM
        ==================================================== */}

        <div className="p-[12px] m-[12px]">

          {/* =================================================
              BRANCH
          ================================================= */}

          <div
            className={`
              ${rowGrid}
              mb-[8px]
            `}
          >

            {/* ENGLISH LABEL */}

            <label
              htmlFor="lkpBranch"
              className={labelEnglishClass}
            >
              Branch
              <span className="inline-block w-[10px] text-center text-red-500">*</span>:
            </label>

            {/* BRANCH SELECT - 300px */}

            <div className="flex w-[460px] justify-start">

              <Select
                inputId="lkpBranch"
                name="lkpBranch"
                options={branchOptions}
                value={
                  branchOptions.find(
                    (option) =>
                      option.value ===
                      lkpBranch,
                  ) || null
                }
                onChange={(
                  option: SingleValue<SelectOption>,
                ) =>
                  setLkpBranch(
                    option?.value || "",
                  )
                }
                styles={{
                  ...branchSelectStyles,
                  ...branchMenuStyles,
                }}
                components={{
                  DropdownIndicator:
                    CustomDropdownIndicator,
                  Option: BranchOption,
                  MenuList: BranchMenuList,
                }}
                filterOption={filterLabelOrValue}
                noOptionsMessage={() => "No Branch Found"}
                isSearchable
                placeholder="Select..."
              />

            </div>

            {/* ARABIC BRANCH NAME - free text, matches
                SP_BranchInfo's fBrName_AR (not a lookup) */}

            <div
              className="
                flex
                w-[460px]
                justify-end
              "
            >
              <input
                id="txtBrName_AR"
                name="txtBrName_AR"
                type="text"
                dir="rtl"
                value={txtBrName_AR}
                maxLength={40}
                onChange={(e) => setTxtBrName_AR(e.target.value)}
                className={`${inputClass} text-right`}
                style={{ width: `${WIDTH_GENERAL}px` }}
              />
            </div>

            {/* ARABIC LABEL */}

            <label
              htmlFor="txtBrName_AR"
              dir="rtl"
              className={labelArabicClass}
            >
              فرع المكتب :
            </label>

          </div>

          {/* =================================================
              BUILDING NO - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Building No."
            required
            labelAr="رقم المبنى"
            idEn="txtBuildingNo"
            idAr="txtBuildingNo_AR"
            valueEn={txtBuildingNo}
            setValueEn={setTxtBuildingNo}
            valueAr={txtBuildingNo_AR}
            setValueAr={setTxtBuildingNo_AR}
            maxLength={4}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              STREET NAME - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Street Name"
            required
            labelAr="اسم الشارع"
            idEn="txtStreetName"
            idAr="txtStreetName_AR"
            valueEn={txtStreetName}
            setValueEn={setTxtStreetName}
            valueAr={txtStreetName_AR}
            setValueAr={setTxtStreetName_AR}
            maxLength={30}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              DISTRICT - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="District"
            required
            labelAr="الحي"
            idEn="txtDistrict"
            idAr="txtDistrict_AR"
            valueEn={txtDistrict}
            setValueEn={setTxtDistrict}
            valueAr={txtDistrict_AR}
            setValueAr={setTxtDistrict_AR}
            maxLength={30}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              CITY - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="City"
            required
            labelAr="مدينة"
            idEn="txtCity"
            idAr="txtCity_AR"
            valueEn={txtCity}
            setValueEn={setTxtCity}
            valueAr={txtCity_AR}
            setValueAr={setTxtCity_AR}
            maxLength={30}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              COUNTRY - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Country"
            required
            labelAr="دولة"
            idEn="txtCountry"
            idAr="txtCountry_AR"
            valueEn={txtCountry}
            setValueEn={setTxtCountry}
            valueAr={txtCountry_AR}
            setValueAr={setTxtCountry_AR}
            maxLength={30}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              POSTAL CODE - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="Postal Code"
            required
            labelAr="رمز بريدي"
            idEn="txtPostalCode"
            idAr="txtPostalCode_AR"
            valueEn={txtPostalCode}
            setValueEn={setTxtPostalCode}
            valueAr={txtPostalCode_AR}
            setValueAr={setTxtPostalCode_AR}
            maxLength={5}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              ADDITIONAL NO - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="Additional No."
            labelAr="رقم إضافي"
            idEn="txtAdditionalNo"
            idAr="txtAdditionalNo_AR"
            valueEn={txtAdditionalNo}
            setValueEn={setTxtAdditionalNo}
            valueAr={txtAdditionalNo_AR}
            setValueAr={
              setTxtAdditionalNo_AR
            }
            maxLength={4}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              CR NO - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="CR No."
            required
            labelAr="رقم السجل"
            idEn="txtCRNo"
            idAr="txtCRNo_AR"
            valueEn={txtCRNo}
            setValueEn={setTxtCRNo}
            valueAr={txtCRNo_AR}
            setValueAr={setTxtCRNo_AR}
            maxLength={10}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              LICENSE NO - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="License No."
            required
            labelAr="رقم الترخيص"
            idEn="txtLicenseNo"
            idAr="txtLicenseNo_AR"
            valueEn={txtLicenseNo}
            setValueEn={setTxtLicenseNo}
            valueAr={txtLicenseNo_AR}
            setValueAr={setTxtLicenseNo_AR}
            maxLength={15}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              LICENSE CATEGORY - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="License Category"
            required
            labelAr="فئة"
            idEn="txtLicenseCategory"
            idAr="txtLicenseCategory_AR"
            valueEn={txtLicenseCategory}
            setValueEn={
              setTxtLicenseCategory
            }
            valueAr={
              txtLicenseCategory_AR
            }
            setValueAr={
              setTxtLicenseCategory_AR
            }
            maxLength={60}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              DIVIDER
          ================================================= */}

          <div
            className="
              my-4
              border-t
              border-slate-200
            "
          />

          {/* =================================================
              ADDRESS 1 - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Address-Line 1"
            labelAr="سطر العنوان 1"
            idEn="txtBrAddress1"
            idAr="txtBrAddress1_AR"
            valueEn={txtBrAddress1}
            setValueEn={setTxtBrAddress1}
            valueAr={txtBrAddress1_AR}
            setValueAr={setTxtBrAddress1_AR}
            maxLength={80}
            inputWidth={WIDTH_ADDRESS}
          />

          {/* =================================================
              ADDRESS 2 - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Address-Line 2"
            labelAr="سطر العنوان 2"
            idEn="txtBrAddress2"
            idAr="txtBrAddress2_AR"
            valueEn={txtBrAddress2}
            setValueEn={setTxtBrAddress2}
            valueAr={txtBrAddress2_AR}
            setValueAr={setTxtBrAddress2_AR}
            maxLength={80}
            inputWidth={WIDTH_ADDRESS}
          />

          {/* =================================================
              ADDRESS 3 - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Address-Line 3"
            labelAr="سطر العنوان 3"
            idEn="txtBrAddress3"
            idAr="txtBrAddress3_AR"
            valueEn={txtBrAddress3}
            setValueEn={setTxtBrAddress3}
            valueAr={txtBrAddress3_AR}
            setValueAr={setTxtBrAddress3_AR}
            maxLength={80}
            inputWidth={WIDTH_ADDRESS}
          />

          {/* =================================================
              ADDRESS 4 - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Address-Line 4"
            labelAr="سطر العنوان 4"
            idEn="txtBrAddress4"
            idAr="txtBrAddress4_AR"
            valueEn={txtBrAddress4}
            setValueEn={setTxtBrAddress4}
            valueAr={txtBrAddress4_AR}
            setValueAr={setTxtBrAddress4_AR}
            maxLength={80}
            inputWidth={WIDTH_ADDRESS}
          />

          {/* =================================================
              HEAD OFFICE
          ================================================= */}

          <div className="mt-4 ml-[207px]">

            <label
              htmlFor="chkHo"
              className="
                inline-flex
                items-center
                gap-2
                rounded-md
                border
                border-emerald-200
                bg-emerald-50
                px-3
                py-1.5
                text-[13px]
                text-slate-700
              "
            >

              <input
                id="chkHo"
                name="chkHo"
                type="checkbox"
                checked={chkHo}
                onChange={(e) =>
                  setChkHo(
                    e.target.checked,
                  )
                }
                className="
                  h-[15px]
                  w-[15px]
                  accent-emerald-500
                "
              />

              Head Office

            </label>

          </div>

        {/* ===================================================
            BUTTONS
        ==================================================== */}

    <div className="mt-[14px] flex justify-center gap-3">
  <button
    id="btnModify"
    name="btnModify"
    type="button"
    onClick={handleModify}
    disabled={!perms.modify}
    className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
  >
     <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  M
                </span>
                odify
              </span>
  </button>

  <button
    id="btnClear"
    name="btnClear"
    type="button"
    onClick={() => handleClear(true)}
    className={buttonClass}
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

export default SetBranchInfo;
