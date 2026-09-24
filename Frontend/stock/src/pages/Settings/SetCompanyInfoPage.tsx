import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Select from "react-select";
import type { SelectOption } from "../../types/receiptypes";

interface CompanyOption {
  fcoid: string;
  fconame: string;
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
  txtCoAddress1: string;
  txtCoAddress2: string;
  txtCoAddress3: string;
  txtCoAddress4: string;
  txtCoAddress1_AR: string;
  txtCoAddress2_AR: string;
  txtCoAddress3_AR: string;
  txtCoAddress4_AR: string;
}

const emptyFormData: CompanyFormData = {
  txtCoName_AR: "",
  txtCoName_QR: "",
  txtCoName_Short: "",
  txtCoVATNo: "",
  txtCoVATNo_AR: "",
  txtCoAddress1: "",
  txtCoAddress2: "",
  txtCoAddress3: "",
  txtCoAddress4: "",
  txtCoAddress1_AR: "",
  txtCoAddress2_AR: "",
  txtCoAddress3_AR: "",
  txtCoAddress4_AR: "",
};

const SetCompanyInfo = () => {
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [lkpCoName, setLkpCoName] = useState("");
  const [formData, setFormData] = useState<CompanyFormData>(emptyFormData);

  const companySelectOptions = useMemo<SelectOption[]>(
    () =>
      companyOptions.map((company) => ({
        value: company.fcoid,
        label: `${company.fcoid} - ${company.fconame}`,
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
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/CompanyInfo/getCompanyList`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getCompanyList failed:", result.message);
          return;
        }

        setCompanyOptions(result.data || []);
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
          txtCoName_AR: data.fconame_ar || "",
          txtCoName_QR: data.fconame_qr || "",
          txtCoName_Short: data.fconame_short || "",
          txtCoVATNo: data.fcovatno || "",
          txtCoVATNo_AR: data.fcovatno_ar || "",
          txtCoAddress1: data.fcoaddress1 || "",
          txtCoAddress2: data.fcoaddress2 || "",
          txtCoAddress3: data.fcoaddress3 || "",
          txtCoAddress4: data.fcoaddress4 || "",
          txtCoAddress1_AR: (data.fcoaddress1_ar || "").trim(),
          txtCoAddress2_AR: (data.fcoaddress2_ar || "").trim(),
          txtCoAddress3_AR: (data.fcoaddress3_ar || "").trim(),
          txtCoAddress4_AR: data.fcoaddress4_ar || "",
        });
      } catch (error) {
        console.error("getCompanyDetails error:", error);
        setFormData(emptyFormData);
      }
    };

    loadCompanyDetails();
  }, [lkpCoName]);

  /* =======================================================
     SAVE COMPANY DETAILS (mode 'M')
  ======================================================= */

  const handleSave = async () => {
    if (!lkpCoName) {
      toast.warning("Please select a company first.");
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
            ...formData,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Company info could not be saved.");
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
    setLkpCoName("");
    setFormData(emptyFormData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-[850px]  bg-white border-[0.5px] shadow-md">

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
                styles={companySelectStyles}
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
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              Company Name (AR) :
            </label>

            <div className="relative">
              <input
                id="txtCoName_AR"
                maxLength={100}
                name="txtCoName_AR"
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
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              Company Name (QR) :
            </label>

            <div className="relative">
              <input
              maxLength={30}
                id="txtCoName_QR"
                name="txtCoName_QR"
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
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              Company Name (Short) :
            </label>

            <div className="relative">
              <input
              maxLength={30}
                id="txtCoName_Short"
                name="txtCoName_Short"
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
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              VAT No. :
            </label>

            <div className="relative">
              <input
              maxLength={15}
                id="txtCoVATNo"
                name="txtCoVATNo"
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
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              VAT No. (AR) :
            </label>

            <div className="relative">
              <input
              maxLength={15}
                id="txtCoVATNo_AR"
                name="txtCoVATNo_AR"
                type="text"
                value={formData.txtCoVATNo_AR}
                onChange={(event) =>
                  handleFieldChange("txtCoVATNo_AR", event.target.value)
                }
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none text-right"
              />
            </div>
          </div>

          {/* ================= ADDRESS SECTION ================= */}
          <div className="mt-[10px]">

            {/* Address Headers */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center mb-[6px]">

              <div></div>

              <div className="text-[11px] font-semibold text-gray-600 text-center">
                Address (EN)
              </div>

              <div className="text-[11px] font-semibold text-gray-600 text-center">
                Address (AR)
              </div>

            </div>

            {/* Address 1 */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center mb-[8px]">

              <label
                htmlFor="txtCoAddress1"
                className="text-[11px] text-gray-600 text-right pr-3"
              >
                Address  Line 1 :
              </label>

              {/* English */}
              <input
                id="txtCoAddress1"
                name="txtCoAddress1"
                maxLength={80}
                type="text"
                value={formData.txtCoAddress1}
                onChange={(event) =>
                  handleFieldChange("txtCoAddress1", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none mr-[5px]"
              />

              {/* Arabic */}
              <input
                id="txtCoAddress1_AR"
                name="txtCoAddress1_AR"
                maxLength={80}
                type="text"
                dir="rtl"
                value={formData.txtCoAddress1_AR}
                onChange={(event) =>
                  handleFieldChange("txtCoAddress1_AR", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none ml-[5px]"
              />

            </div>

            {/* Address 2 */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center mb-[8px]">

              <label
                htmlFor="txtCoAddress2"
                className="text-[11px] text-gray-600 text-right pr-3"
              >
                Address  Line 2 :
              </label>

              {/* English */}
              <input
                id="txtCoAddress2"
                name="txtCoAddress2"
                maxLength={80}
                type="text"
                value={formData.txtCoAddress2}
                onChange={(event) =>
                  handleFieldChange("txtCoAddress2", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none mr-[5px]"
              />

              {/* Arabic */}
              <input
                id="txtCoAddress2_AR"
                name="txtCoAddress2_AR"
                maxLength={80}
                type="text"
                dir="rtl"
                value={formData.txtCoAddress2_AR}
                onChange={(event) =>
                  handleFieldChange("txtCoAddress2_AR", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none ml-[5px]"
              />

            </div>

            {/* Address 3 */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center mb-[8px]">

              <label
                htmlFor="txtCoAddress3"
                className="text-[11px] text-gray-600 text-right pr-3"
              >
                Address  line 3 :
              </label>

              {/* English */}
              <input
                id="txtCoAddress3"
                name="txtCoAddress3"
                maxLength={80}
                type="text"
                value={formData.txtCoAddress3}
                onChange={(event) =>
                  handleFieldChange("txtCoAddress3", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none mr-[5px]"
              />

              {/* Arabic */}
              <input
                id="txtCoAddress3_AR"
                name="txtCoAddress3_AR"
                maxLength={80}
                type="text"
                dir="rtl"
                value={formData.txtCoAddress3_AR}
                onChange={(event) =>
                  handleFieldChange("txtCoAddress3_AR", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none ml-[5px]"
              />

            </div>

            {/* Address 4 */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center">

              <label
                htmlFor="txtCoAddress4"
                className="text-[11px] text-gray-600 text-right pr-3"
              >
                Address Line 4 :
              </label>

              {/* English */}
              <input
                id="txtCoAddress4"
                name="txtCoAddress4"
                maxLength={80}
                type="text"
                value={formData.txtCoAddress4}
                onChange={(event) =>
                  handleFieldChange("txtCoAddress4", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none mr-[5px]"
              />

              {/* Arabic */}
              <input
                id="txtCoAddress4_AR"
                name="txtCoAddress4_AR"
                maxLength={80}
                type="text"
                dir="rtl"
                value={formData.txtCoAddress4_AR}
                onChange={(event) =>
                  handleFieldChange("txtCoAddress4_AR", event.target.value)
                }
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none ml-[5px]"
              />

            </div>

          </div>

          {/* ================= BUTTONS ================= */}
          <div className="flex justify-center gap-3 mt-[14px] mb-[12px]">

            <button
              id="btnSave"
              name="btnSave"
              type="button"
              onClick={handleSave}
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
                underline
              "
            >
              Save
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
                underline
              "
            >
              Clear
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default SetCompanyInfo;