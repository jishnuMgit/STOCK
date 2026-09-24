import React from "react";

// ============================================================
// TYPES
// ============================================================

interface CustomerFooterProps {
  // ==========================================================
  // CHECKBOXES
  // ==========================================================

  chkCustomer: boolean;
  setChkCustomer: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  chkSupplier: boolean;
  setChkSupplier: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  chkInterCompany: boolean;
  setChkInterCompany: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  chkInactiveCustomer: boolean;
  setChkInactiveCustomer: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  chkExcludeFromAgeing: boolean;
  setChkExcludeFromAgeing: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  // ==========================================================
  // BUTTONS
  // ==========================================================

  onSave: () => void;

  onDelete: () => void;

  onClear: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

const CustomerFooter: React.FC<CustomerFooterProps> = ({
  // CHECKBOXES
  chkCustomer,
  setChkCustomer,

  chkSupplier,
  setChkSupplier,

  chkInterCompany,
  setChkInterCompany,

  chkInactiveCustomer,
  setChkInactiveCustomer,

  chkExcludeFromAgeing,
  setChkExcludeFromAgeing,

  // BUTTONS
  onSave,
  onDelete,
  onClear,
}) => {
  return (
    <div className="border-t border-slate-200 bg-white">
      {/* ======================================================
          CHECKBOX SECTION
      ====================================================== */}

      <div
        className="
          px-3
          py-3

          sm:px-5
          lg:px-6
        "
      >
        <div
          className="
            grid
            grid-cols-1
            gap-3

            sm:grid-cols-2

            lg:grid-cols-5
            lg:gap-5
          "
        >
          {/* ==================================================
              CUSTOMER
          ================================================== */}

          <label
            htmlFor="chkCustomer"
            className="
              flex
              cursor-pointer
              items-center
              gap-2
              text-[12px]
              text-slate-700
            "
          >
            <input
              id="chkCustomer"
              name="chkCustomer"
              type="checkbox"
              checked={chkCustomer}
              onChange={(e) =>
                setChkCustomer(
                  e.target.checked
                )
              }
              className="
                h-[14px]
                w-[14px]
                cursor-pointer
                accent-blue-600
              "
            />

            <span>
              Customer
            </span>
          </label>

          {/* ==================================================
              SUPPLIER
          ================================================== */}

          <label
            htmlFor="chkSupplier"
            className="
              flex
              cursor-pointer
              items-center
              gap-2
              text-[12px]
              text-slate-700
            "
          >
            <input
              id="chkSupplier"
              name="chkSupplier"
              type="checkbox"
              checked={chkSupplier}
              onChange={(e) =>
                setChkSupplier(
                  e.target.checked
                )
              }
              className="
                h-[14px]
                w-[14px]
                cursor-pointer
                accent-blue-600
              "
            />

            <span>
              Supplier
            </span>
          </label>

          {/* ==================================================
              INTER COMPANY
          ================================================== */}

          <label
            htmlFor="chkInterCompany"
            className="
              flex
              cursor-pointer
              items-center
              gap-2
              text-[12px]
              text-slate-700
            "
          >
            <input
              id="chkInterCompany"
              name="chkInterCompany"
              type="checkbox"
              checked={chkInterCompany}
              onChange={(e) =>
                setChkInterCompany(
                  e.target.checked
                )
              }
              className="
                h-[14px]
                w-[14px]
                cursor-pointer
                accent-blue-600
              "
            />

            <span>
              Inter Company
            </span>
          </label>

          {/* ==================================================
              INACTIVE CUSTOMER
          ================================================== */}

          <label
            htmlFor="chkInactiveCustomer"
            className="
              flex
              cursor-pointer
              items-center
              gap-2
              text-[12px]
              text-slate-700
            "
          >
            <input
              id="chkInactiveCustomer"
              name="chkInactiveCustomer"
              type="checkbox"
              checked={chkInactiveCustomer}
              onChange={(e) =>
                setChkInactiveCustomer(
                  e.target.checked
                )
              }
              className="
                h-[14px]
                w-[14px]
                cursor-pointer
                accent-blue-600
              "
            />

            <span>
              Inactive Customer
            </span>
          </label>

          {/* ==================================================
              EXCLUDE FROM AGEING
          ================================================== */}

          <label
            htmlFor="chkExcludeFromAgeing"
            className="
              flex
              cursor-pointer
              items-center
              gap-2
              text-[12px]
              text-slate-700
            "
          >
            <input
              id="chkExcludeFromAgeing"
              name="chkExcludeFromAgeing"
              type="checkbox"
              checked={chkExcludeFromAgeing}
              onChange={(e) =>
                setChkExcludeFromAgeing(
                  e.target.checked
                )
              }
              className="
                h-[14px]
                w-[14px]
                cursor-pointer
                accent-blue-600
              "
            />

            <span>
              Exclude From Ageing
            </span>
          </label>
        </div>
      </div>

      {/* ======================================================
          BUTTON SECTION
      ====================================================== */}

      <div
        className="
          flex
          flex-wrap
          justify-center
          gap-2
          border-t
          border-slate-200
          px-3
          py-3

          sm:gap-3
        "
      >
        {/* ====================================================
            SAVE
        ==================================================== */}

        <button
          id="Save"
          name="Save"
          type="button"
          onClick={onSave}
          className="
            h-[36px]
            w-[95px]
            rounded-[3px]
            border
            border-slate-400
            bg-gradient-to-b
            from-white
            to-slate-100
            text-[14px]
            text-green-600
            shadow-sm
            transition

            hover:from-slate-50
            hover:to-slate-100

            active:translate-y-[1px]
          "
        >
          Save
        </button>

        {/* ====================================================
            DELETE
        ==================================================== */}

        <button
          id="Delete"
          name="Delete"
          type="button"
          onClick={onDelete}
          className="
            h-[36px]
            w-[95px]
            rounded-[3px]
            border
            border-slate-400
            bg-gradient-to-b
            from-white
            to-slate-100
            text-[14px]
            text-green-600
            shadow-sm
            transition

            hover:from-slate-50
            hover:to-slate-100

            active:translate-y-[1px]
          "
        >
          Delete
        </button>

        {/* ====================================================
            CLEAR
        ==================================================== */}

        <button
          id="Clear"
          name="Clear"
          type="button"
          onClick={onClear}
          className="
            h-[36px]
            w-[95px]
            rounded-[3px]
            border
            border-slate-400
            bg-gradient-to-b
            from-white
            to-slate-100
            text-[14px]
            text-green-600
            shadow-sm
            transition

            hover:from-slate-50
            hover:to-slate-100

            active:translate-y-[1px]
          "
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default CustomerFooter;