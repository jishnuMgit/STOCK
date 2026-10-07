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

const StockAdjustmentAction: React.FC = () => {
  return (
    <footer
      id="stock-transfer-footer"
      className="relative h-[107px] w-full pb-3 mb-3 shrink-0 overflow-hidden bg-white"
    >
      {/* ======================================================
          NOTE
      ====================================================== */}

      <div className="absolute left-[20px] top-[10px] flex h-[28px] items-center">
        <label
          htmlFor="txtNote"
          className="mr-[9px] text-[14px] text-[#202020]"
        >
          Note :
        </label>

        <input
          id="txtNote"
          type="text"
          autoComplete="off"
          className={`${inputClass} w-[540px]`}
        />
      </div>

      {/* ======================================================
          TOTAL
      ====================================================== */}

      <div className="absolute  right-[100px] top-[10px] flex h-[28px] items-center ">
       

       <div  className="absolute flex right-28">
         <input
          id="txtTotal"
          type="text"
          defaultValue="0.000"
          className={`${inputClass} ml-[7px] w-[65px] text-right`}
        />

         <input
          id="txtTotal"
          type="text"
          defaultValue="0.000"
          className={`${inputClass} ml-[7px] w-[65px] text-right`}
        />
       </div>
         <input
          id="txtTotal"
          type="text"
          defaultValue="0.000"
          className={`${inputClass} ml-[7px] w-[100px] text-right absolute -left-7`}
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

{/* SEARCH */}
         <button
          id="btnSearch"
          type="button"
          className="btn-style"
        >
          <u>S</u>earch
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

export default StockAdjustmentAction;