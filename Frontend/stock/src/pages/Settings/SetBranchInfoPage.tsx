import React, { useEffect, useState } from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";

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
}) => {
  const rowGrid =
    "grid grid-cols-[120px_460px_460px_80px] items-center gap-3";

  const inputClass = `
    h-[32px]
    rounded-[6px]
    border
    border-slate-300
    bg-white
    px-3
    text-[13px]
    text-slate-700
    outline-none
    focus:border-blue-500
    focus:ring-2
    focus:ring-blue-100
  `;

  const labelEnglishClass = `
    whitespace-nowrap
    text-left
    text-[13px]
    text-slate-600
  `;

  const labelArabicClass = `
    whitespace-nowrap
    text-right
    text-[13px]
    text-slate-600
  `;



  return (
    <div
      className={`
        ${rowGrid}
        mb-3
      `}
    >
      <label
        htmlFor={idEn}
        className={labelEnglishClass}
      >
        {labelEn} :
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

const SetBranchInfo: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();

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
          `${import.meta.env.VITE_API_URL}/BranchInfo/getBranchList?CoID=${CoID}&userId=${userId}`
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
     PREFILL FORM WHEN A BRANCH IS SELECTED (mode 'G')
  ========================================================= */

  useEffect(() => {
    if (!lkpBranch) {
      handleClear(false);
      return;
    }

    const loadBranchInfo = async () => {
      try {
        const CoID = localStorage.getItem("CoID");

        if (!CoID) {
          toast.error("getBranchInfo: no CoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/BranchInfo/getBranchInfo?CoID=${CoID}&lkpBranch=${lkpBranch}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Branch info not found.");
          return;
        }

        const data = result.data;

        setTxtBrName_AR(data.fbrname_ar || "");
        setTxtBuildingNo(data.fbuildingno || "");
        setTxtBuildingNo_AR(data.fbuildingno_ar || "");
        setTxtStreetName(data.fstreetname || "");
        setTxtStreetName_AR(data.fstreetname_ar || "");
        setTxtDistrict(data.fdistrict || "");
        setTxtDistrict_AR(data.fdistrict_ar || "");
        setTxtCity(data.fcity || "");
        setTxtCity_AR(data.fcity_ar || "");
        setTxtCountry(data.fcountry || "");
        setTxtCountry_AR(data.fcountry_ar || "");
        setTxtPostalCode(data.fpostalcode || "");
        setTxtPostalCode_AR(data.fpostalcode_ar || "");
        setTxtAdditionalNo(data.fadditionalno || "");
        setTxtAdditionalNo_AR(data.fadditionalno_ar || "");
        setTxtCRNo(data.fcrno || "");
        setTxtCRNo_AR(data.fcrno_ar || "");
        setTxtLicenseNo(data.flicenseno || "");
        setTxtLicenseNo_AR(data.flicenseno_ar || "");
        setTxtLicenseCategory(data.flicensecategory || "");
        setTxtLicenseCategory_AR(data.flicensecategory_ar || "");
        setTxtBrAddress1(data.fbraddress1 || "");
        setTxtBrAddress1_AR(data.fbraddress1_ar || "");
        setTxtBrAddress2(data.fbraddress2 || "");
        setTxtBrAddress2_AR(data.fbraddress2_ar || "");
        setTxtBrAddress3(data.fbraddress3 || "");
        setTxtBrAddress3_AR(data.fbraddress3_ar || "");
        setTxtBrAddress4(data.fbraddress4 || "");
        setTxtBrAddress4_AR(data.fbraddress4_ar || "");
        setChkHo(!!data.fho);
      } catch (error) {
        console.error("getBranchInfo error:", error);
        toast.error(`getBranchInfo error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadBranchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lkpBranch]);

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
    "grid grid-cols-[120px_460px_460px_80px] items-center gap-3";

  /* =========================================================
     INPUT CLASS
  ========================================================= */

  const inputClass = `
    h-[32px]
    rounded-[6px]
    border
    border-slate-300
    bg-white
    px-3
    text-[13px]
    text-slate-700
    outline-none
    focus:border-blue-500
    focus:ring-2
    focus:ring-blue-100
  `;

  /* =========================================================
     LABEL CLASSES
  ========================================================= */

  const labelEnglishClass = `
    whitespace-nowrap
    text-left
    text-[13px]
    text-slate-600
  `;

  const labelArabicClass = `
    whitespace-nowrap
    text-right
    text-[13px]
    text-slate-600
  `;

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

  const handleSave = async () => {
    if (!lkpBranch) {
      toast.warning("Branch is required.");
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
        `${import.meta.env.VITE_API_URL}/BranchInfo/saveBranchInfo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            CoID,
            userId,
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
      setLkpBranch("");
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
     JSX
  ========================================================= */

  return (
   <div
  onKeyDown={handleEnterAsTab}
  className="
    flex
    min-h-screen
    w-full
    items-center
    justify-center
    overflow-x-auto
    bg-white
    px-4
  "
>

      {/* =====================================================
          MAIN CONTAINER

          Fixed width prevents the layout from moving
          when the sidebar is displayed.
      ===================================================== */}

      <div
        className="
          w-[1220px]
          min-w-[1120px]
          shrink-0
          border
          border-slate-300
          bg-white
        "
      >

        {/* ===================================================
            TITLE
        ==================================================== */}

        <div
          className="
            flex
            h-[36px]
            items-center
            border-b
            border-slate-300
            bg-[#a3dfc0]
          "
        >

          <span
            className="
              px-3
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
            Set Branch Info.
          </span>

        </div>

        {/* ===================================================
            FORM
        ==================================================== */}

        <div className="px-5 py-5">

          {/* =================================================
              BRANCH
          ================================================= */}

          <div
            className={`
              ${rowGrid}
              mb-3
            `}
          >

            {/* ENGLISH LABEL */}

            <label
              htmlFor="lkpBranch"
              className={labelEnglishClass}
            >
              Branch :
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
                styles={
                  branchSelectStyles
                }
                isSearchable={false}
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
            labelAr="رقم السجل"
            idEn="txtCRNo"
            idAr="txtCRNo_AR"
            valueEn={txtCRNo}
            setValueEn={setTxtCRNo}
            valueAr={txtCRNo_AR}
            setValueAr={setTxtCRNo_AR}
            maxLength={20}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              LICENSE NO - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="License No."
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

          <div className="mt-4 ml-[133px]">

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

        </div>

        {/* ===================================================
            BUTTONS
        ==================================================== */}

    <div
  className="
    relative
    -top-[20px]
    mb-0
    flex
    w-full
    items-start
    justify-center
    gap-4
  "
>
  <button
    type="button"
    onClick={handleSave}
    className={buttonClass}
  >
     <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  S
                </span>
                ave
              </span>
  </button>

  <button
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
  );
};

export default SetBranchInfo;
