import React from "react";

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass =
  "input-style";

// ============================================================
// BUTTON STYLE
// ============================================================


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

      <div className="absolute left-[25px] top-[10px] flex h-[28px] items-center">
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
          className={`${inputClass} w-[740px]`}
        />
      </div>

      {/* ======================================================
          TOTAL
      ====================================================== */}

      <div className="absolute right-28 top-[10px] flex h-[28px] items-center">
        <input
          id="txtTotalLabel"
          type="text"
          value="Total"
          readOnly
          className="
          
            w-[68px]
            input-style
            
          "
        />

        <input
          id="txtTotal"
          type="text"
          defaultValue="0.000"
          className={`${inputClass} ml-[7px] w-[70px] text-right`}
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