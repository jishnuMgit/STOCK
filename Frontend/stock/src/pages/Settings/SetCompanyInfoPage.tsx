import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Select from "react-select";
import type { SelectOption } from "../../types/receiptypes";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import {
  makeNameIdMenuComponents,
  branchMenuStyles,
} from "../../components/BranchSelect/branchSelectParts";

// Company list: "Company | ID", same layout as the Branch dropdown.
const companyMenuComponents = makeNameIdMenuComponents("Company");

interface CompanyOption {
  lkpCoID: string;
  txtCoName: string;
}

/* =========================================================
   SELECT STYLING — same look as the Branch select on
   Transaction/Receipt (ReceitComp.tsx selectStylesLocal)
========================================================= */

const companySelectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: "28px",
    height: "28px",
    borderColor: "#d7dee7",
    borderRadius: "4px",
    boxShadow: "none",
    fontSize: "12px",
    cursor: "text",

    "&:hover": {
      borderColor: "#9fdfbc",
    },
  }),

  valueContainer: (base: any) => ({
    ...base,
    height: "28px",
    padding: "0 8px",
  }),

  singleValue: (base: any) => ({
    ...base,
    color: "#344054",
    fontSize: "12px",
  }),

  placeholder: (base: any) => ({
    ...base,
    color: "#808080",
    fontSize: "12px",
  }),

  input: (base: any) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "12px",
    color: "#344054",
  }),

  indicatorsContainer: (base: any) => ({
    ...base,
    height: "28px",
  }),

  dropdownIndicator: (base: any) => ({
    ...base,
    color: "#aeb8c2",
    padding: "4px",

    "&:hover": {
      color: "#808080",
    },
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  clearIndicator: (base: any) => ({
    ...base,
    color: "#aeb8c2",
    padding: "4px",

    "&:hover": {
      color: "#808080",
    },
  }),

  menu: (base: any) => ({
    ...base,
    fontSize: "12px",
    zIndex: 100,
    marginTop: "2px",
    borderRadius: "4px",
    overflow: "hidden",
  }),

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

    backgroundColor:
      state.isSelected || state.isFocused ? "#eefbf4" : "#ffffff",

    color: "#344054",
    padding: "7px 10px",

    "&:active": {
      backgroundColor: "#dff5e9",
    },
  }),
};

const companyFilterOption = (
  option: { label: string; value: string; data: SelectOption },
  inputValue: string
) => {
  const search = inputValue.toLowerCase().trim();

  if (!search) {
    return true;
  }

  return (
    option.data.label.toLowerCase().includes(search) ||
    option.data.value.toLowerCase().includes(search)
  );
};

interface CompanyFormData {
  txtCoName_AR: string;
  txtCoName_QR: string;
  txtCoName_Short: string;
  txtCoVATNo: string;
  txtCoVATNo_AR: string;
}

const emptyFormData: CompanyFormData = {
  txtCoName_AR: "",
  txtCoName_QR: "",
  txtCoName_Short: "",
  txtCoVATNo: "",
  txtCoVATNo_AR: "",
};

// dbo.tblmenu fmenuid for the Set Company Info page.
const MENU_ID = "9199";

const SetCompanyInfo = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [lkpCoName, setLkpCoName] = useState("");
  // forces the company details to be loaded again (used by Clear)
  const [reloadKey, setReloadKey] = useState(0);
  const [formData, setFormData] = useState<CompanyFormData>(emptyFormData);

  const companySelectOptions = useMemo<SelectOption[]>(
    () =>
      companyOptions.map((company) => ({
        value: company.lkpCoID,
        label: company.txtCoName,
      })),
    [companyOptions]
  );

  const selectedCompanyOption =
    companySelectOptions.find(
      (option) => option.value === lkpCoName
    ) || null;

  const handleFieldChange = (
    field: keyof CompanyFormData,
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* =======================================================
     LOAD COMPANY LIST (lkpCoName dropdown)
  ======================================================= */

  useEffect(() => {
    const loadCompanyList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("Company ID not found. Please log in again.");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/CompanyInfo/getCompanyList?PstrCoID=${encodeURIComponent(PstrCoID)}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getCompanyList failed:", result.message);
          return;
        }

        const companies: CompanyOption[] = result.data || [];

        setCompanyOptions(companies);

        // preselect the logged-in company; the details effect below
        // then fills the form
        if (companies.some((company) => company.lkpCoID === PstrCoID)) {
          setLkpCoName(PstrCoID);
        }
      } catch (error) {
        console.error("getCompanyList error:", error);
      }
    };

    loadCompanyList();
  }, []);

  /* =======================================================
     PREFILL FORM WHEN A COMPANY IS SELECTED (mode 'G')
  ======================================================= */

  useEffect(() => {
    if (!lkpCoName) {
      setFormData(emptyFormData);
      return;
    }

    const loadCompanyDetails = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/CompanyInfo/getCompanyDetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lkpCoName }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          console.error("getCompanyDetails failed:", result.message);
          setFormData(emptyFormData);
          return;
        }

        const data = result.data;

        setFormData({
          txtCoName_AR: data.txtCoName_AR || "",
          txtCoName_QR: data.txtCoName_QR || "",
          txtCoName_Short: data.txtCoName_Short || "",
          txtCoVATNo: data.txtCoVATNo || "",
          txtCoVATNo_AR: data.txtCoVATNo_AR || "",
        });
      } catch (error) {
        console.error("getCompanyDetails error:", error);
        setFormData(emptyFormData);
      }
    };

    loadCompanyDetails();
  }, [lkpCoName, reloadKey]);

  /* =======================================================
     SAVE COMPANY DETAILS (mode 'M')
  ======================================================= */

  // Runs before every Save (the old form's ValidateMe): shows the message,
  // moves the cursor to the field and returns false as soon as ONE rule fails.
  // For now it only covers the fields marked with a red * in the form.
  const validateMe = (): boolean => {
    const fail = (message: string, fieldId: string): boolean => {
      toast.warning(message);
      document.getElementById(fieldId)?.focus();
      return false;
    };

    if (!lkpCoName) {
      return fail("Please select a 'Company'", "lkpCoName");
    }

    if (!formData.txtCoName_AR.trim()) {
      return fail("Please input 'Company Name (AR)'", "txtCoName_AR");
    }

    if (!formData.txtCoName_QR.trim()) {
      return fail("Please input a 'Company Name in QR Code'", "txtCoName_QR");
    }

    if (!formData.txtCoName_Short.trim()) {
      return fail("Please input 'Company Name (Short)'", "txtCoName_Short");
    }

    return true;
  };

  // This screen only ever edits an existing company, so it works with the
  // MODIFY right (letter M of the menu's buttons), not Save.
  const handleModify = async () => {
    if (!perms.modify) {
      toast.error("You do not have permission to Modify.");
      return;
    }

    if (!validateMe()) {
      return;
    }

    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrUserID) {
      toast.error("User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/CompanyInfo/saveCompanyDetails`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lkpCoName,
            PstrUserID,
            ...formData,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Company info could not be saved.");

        // the backend validator names the field that failed - same name as
        // the element id, so the cursor goes straight into it
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "Company info saved successfully.");
    } catch (error) {
      console.error("saveCompanyDetails error:", error);
      toast.error("Cannot connect to Company Info API.");
    }
  };

  /* =======================================================
     CLEAR FORM
  ======================================================= */

  const handleClear = () => {
    // back to the page-open state: the logged-in company, reloaded
    setLkpCoName(localStorage.getItem("PstrCoID") ?? "");
    setFormData(emptyFormData);
    setReloadKey((previous) => previous + 1);
  };

  /* =======================================================
     KEYBOARD SHORTCUTS
     Alt+M -> Modify, Alt+C -> Clear (matches the underlined
     accelerator letters on the buttons).
  ======================================================= */

  useAltShortcuts({
    m: handleModify,
    c: handleClear,
  });

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="min-h-screen flex items-center justify-center "
    >
      <div className="w-[600px]  bg-white border-[0.5px] shadow-md  min-h-[200px]">

        {/* Header */}
        <div className="h-[30px] bg-[#a7dfc0] flex ">
          <h2 className="text-[17px] font-semibold text-[#374151] ml-[5px]">
            Set Company Info.
          </h2>
        </div>

        {/* Form */}
        <div className="px-[5px] pr-[30px] py-[5px] pt-[15px]">

          {/* Company Name */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="lkpCoName"
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              Company Name :
            </label>

            <div className="relative">
              <Select<SelectOption, false>
                inputId="lkpCoName"
                name="lkpCoName"
                value={selectedCompanyOption}
                onChange={(option) => setLkpCoName(option?.value || "")}
                options={companySelectOptions}
                filterOption={companyFilterOption}
                styles={{ ...companySelectStyles, ...branchMenuStyles }}
                components={companyMenuComponents}
                placeholder="Select"
                isSearchable
                isClearable={false}
                noOptionsMessage={() => "No Company Found"}
              />
            </div>
          </div>

          {/* Company Name AR */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoName_AR"
              className="relative text-[11px] text-gray-600 text-right pr-3"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              Company Name (AR) :
            </label>

            <div className="relative">
              <input
                id="txtCoName_AR"
                maxLength={100}
                name="txtCoName_AR"
                aria-required="true"
                type="text"
                dir="rtl"
                value={formData.txtCoName_AR}
                onChange={(event) =>
                  handleFieldChange("txtCoName_AR", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              />
            </div>
          </div>

          {/* Company Name QR */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoName_QR"
              className="relative text-[11px] text-gray-600 text-right pr-3"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              Company Name (QR) :
            </label>

            <div className="relative">
              <input
              maxLength={30}
                id="txtCoName_QR"
                name="txtCoName_QR"
                aria-required="true"
                type="text"
                value={formData.txtCoName_QR}
                onChange={(event) =>
                  handleFieldChange("txtCoName_QR", event.target.value)
                }
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              />
            </div>
          </div>


          {/* Company Name short */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoName_Short"
              className="relative text-[11px] text-gray-600 text-right pr-3"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              Company Name (Short) :
            </label>

            <div className="relative">
              <input
              maxLength={30}
                id="txtCoName_Short"
                name="txtCoName_Short"
                aria-required="true"
                type="text"
                value={formData.txtCoName_Short}
                onChange={(event) =>
                  handleFieldChange("txtCoName_Short", event.target.value)
                }
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              />
            </div>
          </div>

          {/* VAT No */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoVATNo"
              className="relative text-[11px] text-gray-600 text-right pr-3"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              VAT No. :
            </label>

            <div className="relative">
              <input
              maxLength={15}
                id="txtCoVATNo"
                name="txtCoVATNo"
                aria-required="true"
                type="text"
                value={formData.txtCoVATNo}
                onChange={(event) =>
                  handleFieldChange("txtCoVATNo", event.target.value)
                }
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              />
            </div>
          </div>

          {/* VAT No AR */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoVATNo_AR"
              className="relative text-[11px] text-gray-600 text-right pr-3"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              VAT No. (AR) :
            </label>

            <div className="relative">
              <input
              maxLength={15}
                id="txtCoVATNo_AR"
                name="txtCoVATNo_AR"
                aria-required="true"
                type="text"
                value={formData.txtCoVATNo_AR}
                onChange={(event) =>
                  handleFieldChange("txtCoVATNo_AR", event.target.value)
                }
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none text-right"
              />
            </div>
          </div>

          {/* ================= BUTTONS ================= */}
          <div className="flex justify-center gap-3 mt-[14px] mb-[12px]">

            <button
              id="btnModify"
              name="btnModify"
              type="button"
              onClick={handleModify}
              disabled={!perms.modify}
              className="
                w-[105px]
                h-[34px]
                border
                border-gray-400
                rounded-md
                bg-gradient-to-b
                from-white
                to-[#e5eef5]
                text-green-600
                text-[15px]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <span className="underline underline-offset-2">M</span>odify
            </button>

            <button
              id="btnClear"
              name="btnClear"
              type="button"
              onClick={handleClear}
              className="
                w-[105px]
                h-[34px]
                border
                border-gray-400
                rounded-md
                bg-gradient-to-b
                from-white
                to-[#e5eef5]
                text-green-600
                text-[15px]
              "
            >
              <span className="underline underline-offset-2">C</span>lear
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default SetCompanyInfo;