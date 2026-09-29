import React, { useState } from "react";

// ============================================================
// TYPES
// ============================================================

interface AccountFormData {
  txtAccountGroupID: string;
  txtAccountGroupName: string;
  txtAccountGroupLevel: string;
  txtAccountID: string;
  txtAccountName: string;
  txtAccountName_AR: string;
  txtAccountLevel: string;
  lkpAccountGroupOrHead: string;
  lkpGPH: string;
  newAccountID: "Auto" | "Manual";
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const COAPage: React.FC = () => {
  // ============================================================
  // STATE
  // ============================================================

  const [formData, setFormData] = useState<AccountFormData>({
    txtAccountGroupID: "1102000",
    txtAccountGroupName: "BANK",
    txtAccountGroupLevel: "3",
    txtAccountID: "1102007",
    txtAccountName: "",
    txtAccountName_AR: "",
    txtAccountLevel: "4",
    lkpAccountGroupOrHead: "H",
    lkpGPH: "No",
    newAccountID: "Auto",
  });

  // ============================================================
  // INPUT CHANGE
  // ============================================================

  const handleChange = (
    field: keyof AccountFormData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = () => {
    console.log("Save:", formData);
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = () => {
    console.log("Delete:", formData);
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setFormData({
      txtAccountGroupID: "",
      txtAccountGroupName: "",
      txtAccountGroupLevel: "",
      txtAccountID: "",
      txtAccountName: "",
      txtAccountName_AR: "",
      txtAccountLevel: "",
      lkpAccountGroupOrHead: "",
      lkpGPH: "No",
      newAccountID: "Auto",
    });
  };

  // ============================================================
  // COMMON STYLES
  // ============================================================

  const inputClass = `
    h-[29px]
    rounded-[2px]
    border
    border-slate-300
    bg-white
    px-2
    text-[13px]
    text-slate-700
    outline-none
    focus:border-slate-400
    focus:ring-0
  `;

  const smallInputClass = `
    h-[29px]
    rounded-[2px]
    border
    border-slate-300
    bg-white
    px-2
    text-[13px]
    text-slate-700
    outline-none
    focus:border-slate-400
    focus:ring-0
  `;

  const labelClass = `
    text-[13px]
    text-slate-600
    whitespace-nowrap
  `;

  return (
    <div className="flex min-h-fit items-start w-full justify-center bg-[#a3dfc0]">
      {/* ========================================================
          MAIN PAGE
      ======================================================== */}

      <div
        className="
          mt-[2px]
          w-full
        
                  bg-white
        "
      >
        {/* ======================================================
            TITLE
        ====================================================== */}

        <div
              className="
                flex
                h-7
                w-full
                items-center
                border-b
                border-slate-400
                bg-[#a3dfc0]
              "
            >
              <h1
                id="ChartOfAccount"
                className="
                  ml-[10px]
                  text-[17px]
                  font-semibold
                  text-slate-700
                "
              >
                Chart Of Account
              </h1>
            </div>

        {/* ======================================================
            FORM
        ====================================================== */}

        <div className="px-[38px] pb-[25px] pt-[10px]">
          {/* ====================================================
              ACCOUNT GROUP
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_125px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountGroupID"
              className={`${labelClass} text-right`}
            >
              Account Group :
            </label>

            <input
              id="txtAccountGroupID"
              type="text"
              value={formData.txtAccountGroupID}
              onChange={(e) =>
                handleChange(
                  "txtAccountGroupID",
                  e.target.value
                )
              }
              className={inputClass}
            />

            <input
              id="txtAccountGroupName"
              type="text"
              value={formData.txtAccountGroupName}
              onChange={(e) =>
                handleChange(
                  "txtAccountGroupName",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>

          {/* ====================================================
              ACCOUNT GROUP LEVEL + NEW ACCOUNT ID
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_125px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountGroupLevel"
              className={`${labelClass} text-right`}
            >
              Account Group Level :
            </label>

            <input
              id="txtAccountGroupLevel"
              type="text"
              value={formData.txtAccountGroupLevel}
              onChange={(e) =>
                handleChange(
                  "txtAccountGroupLevel",
                  e.target.value
                )
              }
              className={smallInputClass}
            />

            {/* NEW ACCOUNT ID */}

            <fieldset
              className="
                relative
                ml-[5px]
                flex
                h-[55px]
                items-center
                gap-[25px]
                rounded-[7px]
                border
                border-slate-200
                px-[17px]
                pt-[5px]
              "
            >
              <legend
                className="
                  px-[5px]
                  text-[12px]
                  text-slate-500
                "
              >
                New Account ID
              </legend>

              {/* AUTO */}

              <label
                htmlFor="autoAccountID"
                className="
                  flex
                  cursor-pointer
                  items-center
                  gap-[7px]
                  text-[13px]
                  text-slate-600
                "
              >
                <input
                  id="autoAccountID"
                  type="radio"
                  name="newAccountID"
                  value="Auto"
                  checked={
                    formData.newAccountID === "Auto"
                  }
                  onChange={() =>
                    handleChange(
                      "newAccountID",
                      "Auto"
                    )
                  }
                  className="
                    h-[16px]
                    w-[16px]
                    accent-blue-600
                  "
                />

                <span>Auto</span>
              </label>

              {/* MANUAL */}

              <label
                htmlFor="manualAccountID"
                className="
                  flex
                  cursor-pointer
                  items-center
                  gap-[7px]
                  text-[13px]
                  text-slate-600
                "
              >
                <input
                  id="manualAccountID"
                  type="radio"
                  name="newAccountID"
                  value="Manual"
                  checked={
                    formData.newAccountID === "Manual"
                  }
                  onChange={() =>
                    handleChange(
                      "newAccountID",
                      "Manual"
                    )
                  }
                  className="
                    h-[16px]
                    w-[16px]
                    accent-blue-600
                  "
                />

                <span>Manual</span>
              </label>
            </fieldset>
          </div>

          {/* ====================================================
              ACCOUNT ID
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_125px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountID"
              className={`${labelClass} text-right`}
            >
              Account ID :
            </label>

            <input
              id="txtAccountID"
              type="text"
              value={formData.txtAccountID}
              onChange={(e) =>
                handleChange(
                  "txtAccountID",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>

          {/* ====================================================
              ACCOUNT NAME
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountName"
              className={`${labelClass} text-right`}
            >
              Account Name :
            </label>

            <input
              id="txtAccountName"
              type="text"
              value={formData.txtAccountName}
              onChange={(e) =>
                handleChange(
                  "txtAccountName",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>

          {/* ====================================================
              ACCOUNT NAME ARABIC
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountName_AR"
              className={`${labelClass} text-right`}
            >
              Account Name (AR) :
            </label>

            <input
              id="txtAccountName_AR"
              type="text"
              dir="rtl"
              value={formData.txtAccountName_AR}
              onChange={(e) =>
                handleChange(
                  "txtAccountName_AR",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>

          {/* ====================================================
              ACCOUNT LEVEL + HAVE COST CENTER
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_125px_1fr_108px_108px] items-center gap-[10px]">
            <label
              htmlFor="txtAccountLevel"
              className={`${labelClass} text-right`}
            >
              Account Level :
            </label>

            <input
              id="txtAccountLevel"
              type="text"
              value={formData.txtAccountLevel}
              onChange={(e) =>
                handleChange(
                  "txtAccountLevel",
                  e.target.value
                )
              }
              className={smallInputClass}
            />

            <div />

            <label
              htmlFor="lkpGPH"
              className={`${labelClass} text-right`}
            >
              Have Cost Center :
            </label>

            <select
              id="lkpGPH"
              value={formData.lkpGPH}
              onChange={(e) =>
                handleChange(
                  "lkpGPH",
                  e.target.value
                )
              }
              className={`
                ${inputClass}
                cursor-pointer
                pr-2
              `}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* ====================================================
              GROUP / PARENT / HEAD
          ==================================================== */}

          <div className="grid grid-cols-[155px_125px_1fr] items-center gap-[10px]">
            <label
              htmlFor="lkpAccountGroupOrHead"
              className={`${labelClass} text-right`}
            >
              Group/Parent/Head :
            </label>

            <input
              id="lkpAccountGroupOrHead"
              type="text"
              value={
                formData.lkpAccountGroupOrHead
              }
              onChange={(e) =>
                handleChange(
                  "lkpAccountGroupOrHead",
                  e.target.value
                )
              }
              className={smallInputClass}
            />
          </div>

          {/* ====================================================
              BUTTONS
          ==================================================== */}

          <div
            className="
              mt-[10px]
              flex
              justify-center
              gap-[11px]
            "
          >
            {/* SAVE */}

            <button
              id="btnSave"
              type="button"
              onClick={handleSave}
              className="
                h-[39px]
                w-[105px]
                rounded-[4px]
                border
                border-slate-300
                bg-gradient-to-b
                from-white
                to-[#e6edf3]
                text-[14px]
                text-green-600
                shadow-sm
                hover:bg-slate-100
                focus:outline-none
              "
            >
              <span className="underline">
                S
              </span>
              ave
            </button>

            {/* DELETE */}

            <button
              id="btnDelete"
              type="button"
              onClick={handleDelete}
              className="
                h-[39px]
                w-[105px]
                rounded-[4px]
                border
                border-slate-300
                bg-gradient-to-b
                from-white
                to-[#e6edf3]
                text-[14px]
                text-green-600
                shadow-sm
                hover:bg-slate-100
                focus:outline-none
              "
            >
              <span className="underline">
                D
              </span>
              elete
            </button>

            {/* CLEAR */}

            <button
              id="btnClear"
              type="button"
              onClick={handleClear}
              className="
                h-[39px]
                w-[105px]
                rounded-[4px]
                border
                border-slate-300
                bg-gradient-to-b
                from-white
                to-[#e6edf3]
                text-[14px]
                text-green-600
                shadow-sm
                hover:bg-slate-100
                focus:outline-none
              "
            >
              <span className="underline">
                C
              </span>
              lear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default COAPage;