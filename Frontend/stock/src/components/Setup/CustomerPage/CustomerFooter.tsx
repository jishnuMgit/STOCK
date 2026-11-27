import React from "react";
import ActionButton from "../../common/ActionButton";
import { useCtrlShortcuts } from "../../../hooks/useCtrlShortcuts";

// ============================================================
// TYPES
// ============================================================

interface CustomerFooterProps {
  // ==========================================================
  // CHECKBOXES
  // ==========================================================

  chkCustomer: boolean;
  setChkCustomer: React.Dispatch<React.SetStateAction<boolean>>;

  chkSupplier: boolean;
  setChkSupplier: React.Dispatch<React.SetStateAction<boolean>>;

  chkInterCompany: boolean;
  setChkInterCompany: React.Dispatch<React.SetStateAction<boolean>>;

  chkInactiveCustomer: boolean;
  setChkInactiveCustomer: React.Dispatch<React.SetStateAction<boolean>>;

  chkExcludeFromAgeing: boolean;
  setChkExcludeFromAgeing: React.Dispatch<React.SetStateAction<boolean>>;
  saveLabel?: string;
  saveDisabled?: boolean;
  deleteDisabled?: boolean;
  clearDisabled?: boolean;

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
  saveLabel = "Save",
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
  saveDisabled = false,
  deleteDisabled = false,
  clearDisabled = false,

  // BUTTONS
  onSave,
  onDelete,
  onClear,
}) => {
  useCtrlShortcuts({
    s: () => {
      if (!saveDisabled) onSave();
    },
    d: () => {
      if (!deleteDisabled) onDelete();
    },
  });

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* ======================================================
          CHECKBOX SECTION
      ====================================================== */}

      <div className="px-3 py-1">
        <div className="ml-25 mr-[6.2rem] flex flex-wrap items-center justify-between gap-x-4 gap-y-2 whitespace-nowrap">
          <label
            htmlFor="chkCustomer"
            className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-700"
          >
            <input
              id="chkCustomer"
              name="chkCustomer"
              type="checkbox"
              checked={chkCustomer}
              onChange={(e) => setChkCustomer(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
            />
            <span>Customer</span>
          </label>

          <label
            htmlFor="chkSupplier"
            className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-700"
          >
            <input
              id="chkSupplier"
              name="chkSupplier"
              type="checkbox"
              checked={chkSupplier}
              onChange={(e) => setChkSupplier(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
            />
            <span>Supplier</span>
          </label>

          <label
            htmlFor="chkInterCompany"
            className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-700"
          >
            <input
              id="chkInterCompany"
              name="chkInterCompany"
              type="checkbox"
              checked={chkInterCompany}
              onChange={(e) => setChkInterCompany(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
            />
            <span>Inter Company</span>
          </label>

          <label
            htmlFor="chkInactiveCustomer"
            className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-700"
          >
            <input
              id="chkInactiveCustomer"
              name="chkInactiveCustomer"
              type="checkbox"
              checked={chkInactiveCustomer}
              onChange={(e) => setChkInactiveCustomer(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
            />
            <span>Inactive Customer</span>
          </label>

          <label
            htmlFor="chkExcludeFromAgeing"
            className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-700"
          >
            <input
              id="chkExcludeFromAgeing"
              name="chkExcludeFromAgeing"
              type="checkbox"
              checked={chkExcludeFromAgeing}
              onChange={(e) => setChkExcludeFromAgeing(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
            />
            <span>Exclude From Ageing</span>
          </label>
        </div>
      </div>

      {/* ======================================================
          BUTTON SECTION
      ====================================================== */}

      <div className="flex flex-wrap justify-center gap-2 border-t border-slate-200 px-3 py-3 sm:gap-3">
        <ActionButton
          id="Save"
          label={saveLabel}
          underlineIndex={0}
          onClick={onSave}
          disabled={saveDisabled}
        />

        <ActionButton
          id="Delete"
          label="Delete"
          underlineIndex={0}
          onClick={onDelete}
          disabled={deleteDisabled}
        />

        <ActionButton
          id="Clear"
          label="Clear"
          // underlineIndex={0}
          onClick={onClear}
          disabled={clearDisabled}
        />
      </div>
    </div>
  );
};

export default CustomerFooter;
