import React from "react";

// ============================================================
// TYPES
// ============================================================

interface SupplierFooterProps {
    chkCustomer: boolean;
    setChkCustomer: React.Dispatch<React.SetStateAction<boolean>>;

    chkSupplier: boolean;
    setChkSupplier: React.Dispatch<React.SetStateAction<boolean>>;

    chkInterCompany: boolean;
    setChkInterCompany: React.Dispatch<React.SetStateAction<boolean>>;

    chkInactiveSupplier: boolean;
    setChkInactiveSupplier: React.Dispatch<React.SetStateAction<boolean>>;

    chkExcludeFromAgeing: boolean;
    setChkExcludeFromAgeing: React.Dispatch<React.SetStateAction<boolean>>;

    saveLabel?: string;
    saveDisabled?: boolean;
    deleteDisabled?: boolean;
    clearDisabled?: boolean;

    onSave: () => void;
    onDelete: () => void;
    onClear: () => void;
}

const buttonClass = `h-9 w-23.75 rounded-[3px] border border-slate-400 bg-linear-to-b from-white to-slate-100 text-[14px]
    text-green-600 shadow-sm transition hover:from-slate-50 hover:to-slate-100 active:translate-y-px
    disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0`;

const checkLabelClass =
    "flex cursor-pointer items-center gap-2 text-[12px] text-slate-700";
const checkInputClass = "h-3.5 w-3.5 cursor-pointer accent-blue-600";

// ============================================================
// COMPONENT
// ============================================================

const SupplierFooter: React.FC<SupplierFooterProps> = ({
    saveLabel = "Save",

    chkCustomer,
    setChkCustomer,

    chkSupplier,
    setChkSupplier,

    chkInterCompany,
    setChkInterCompany,

    chkInactiveSupplier,
    setChkInactiveSupplier,

    chkExcludeFromAgeing,
    setChkExcludeFromAgeing,

    saveDisabled = false,
    deleteDisabled = false,
    clearDisabled = false,

    onSave,
    onDelete,
    onClear,
}) => {
    return (
        <div className="border-t border-slate-200 bg-white">
            {/* CHECKBOX SECTION */}

            <div className="px-3 py-1">
                <div className="ml-25 mr-[6.2rem] flex flex-wrap items-center justify-between gap-x-4 gap-y-2 whitespace-nowrap">
                    <label htmlFor="chkCustomer" className={checkLabelClass}>
                        <input
                            id="chkCustomer"
                            name="chkCustomer"
                            type="checkbox"
                            checked={chkCustomer}
                            onChange={(e) => setChkCustomer(e.target.checked)}
                            className={checkInputClass}
                        />
                        <span>Customer</span>
                    </label>

                    <label htmlFor="chkSupplier" className={checkLabelClass}>
                        <input
                            id="chkSupplier"
                            name="chkSupplier"
                            type="checkbox"
                            checked={chkSupplier}
                            onChange={(e) => setChkSupplier(e.target.checked)}
                            className={checkInputClass}
                        />
                        <span>Supplier</span>
                    </label>

                    <label htmlFor="chkInterCompany" className={checkLabelClass}>
                        <input
                            id="chkInterCompany"
                            name="chkInterCompany"
                            type="checkbox"
                            checked={chkInterCompany}
                            onChange={(e) => setChkInterCompany(e.target.checked)}
                            className={checkInputClass}
                        />
                        <span>Inter Company</span>
                    </label>

                    <label htmlFor="chkInactiveSupplier" className={checkLabelClass}>
                        <input
                            id="chkInactiveSupplier"
                            name="chkInactiveSupplier"
                            type="checkbox"
                            checked={chkInactiveSupplier}
                            onChange={(e) => setChkInactiveSupplier(e.target.checked)}
                            className={checkInputClass}
                        />
                        <span>Inactive Supplier</span>
                    </label>

                    <label htmlFor="chkExcludeFromAgeing" className={checkLabelClass}>
                        <input
                            id="chkExcludeFromAgeing"
                            name="chkExcludeFromAgeing"
                            type="checkbox"
                            checked={chkExcludeFromAgeing}
                            onChange={(e) => setChkExcludeFromAgeing(e.target.checked)}
                            className={checkInputClass}
                        />
                        <span>Exclude From Ageing</span>
                    </label>
                </div>
            </div>

            {/* BUTTON SECTION */}

            <div className="flex flex-wrap justify-center gap-2 border-t border-slate-200 px-3 py-3 sm:gap-3">
                <button
                    id="Save"
                    name="Save"
                    type="button"
                    onClick={onSave}
                    disabled={saveDisabled}
                    className={buttonClass}
                >
                    {saveLabel}
                </button>

                <button
                    id="Delete"
                    name="Delete"
                    type="button"
                    onClick={onDelete}
                    disabled={deleteDisabled}
                    className={buttonClass}
                >
                    Delete
                </button>

                <button
                    id="Clear"
                    name="Clear"
                    type="button"
                    onClick={onClear}
                    disabled={clearDisabled}
                    className={buttonClass}
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default SupplierFooter;