import React from "react";

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass =
  "h-[28px] border border-[#cbd5e1] bg-white px-2 text-[13px] text-[#202020] outline-none focus:border-blue-400 focus:bg-blue-50";

// ============================================================
// BUTTON STYLE
// ============================================================

const buttonClass =
  "h-[40px] rounded-[4px] border border-[#8ba7bd] bg-gradient-to-b from-white to-[#edf3f7] text-[14px] text-green-600 shadow-sm hover:bg-[#f5f5f5] focus:outline-none";

// ============================================================
// FOOTER
// ============================================================

const StockTransferFooter: React.FC = () => {
  return (
    <footer
      id="stock-transfer-footer"
      className="relative h-[107px] w-full shrink-0 overflow-hidden bg-white"
    >
      {/* ======================================================
          NOTE
      ====================================================== */}

      <div className="absolute left-[20px] top-[10px] flex h-[28px] items-center">
        <label
          htmlFor="txtNote"
          className="mr-[9px] text-[13px] text-[#202020]"
        >
          Note :
        </label>

        <input
          id="txtNote"
          type="text"
          autoComplete="off"
          className={`${inputClass} w-[780px]`}
        />
      </div>

      {/* ======================================================
          TOTAL
      ====================================================== */}

      <div className="absolute right-[92px] top-[10px] flex h-[28px] items-center">
        <input
          id="txtTotalLabel"
          type="text"
          value="Total"
          readOnly
          className="
            h-[28px]
            w-[68px]
            border
            border-[#cbd5e1]
            bg-white
            text-center
            text-[13px]
            text-[#202020]
            outline-none
          "
        />

        <input
          id="txtTotal"
          type="text"
          defaultValue="0.00"
          className={`${inputClass} ml-[7px] w-[65px] text-right`}
        />
      </div>

      {/* ======================================================
          ACTION BUTTONS
      ====================================================== */}

      <div className="absolute bottom-[15px] left-1/2 flex -translate-x-1/2 gap-[13px]">

        {/* SAVE */}

        <button
          id="btnSave"
          type="button"
          className="btn-style"
        >
          <u>S</u>ave
        </button>

        {/* DELETE */}

        <button
          id="btnDelete"
          type="button"
          className="btn-style"
        >
          <u>D</u>elete
        </button>

        {/* PRINT */}

        <button
          id="btnPrint"
          type="button"
          className="btn-style"
        >
          <u>P</u>rint
        </button>

        {/* POST */}

        <button
          id="btnPost"
          type="button"
          className="btn-style"
        >
          <u>P</u>ost
        </button>

        {/* CLEAR */}

        <button
          id="btnClear"
          type="button"
          className="btn-style"
        >
          <u>C</u>lear
        </button>
      </div>
    </footer>
  );
};

export default StockTransferFooter;