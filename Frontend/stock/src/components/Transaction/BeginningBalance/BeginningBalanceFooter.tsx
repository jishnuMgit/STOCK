import React from "react";

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass =
  "input-style ";

// ============================================================
// BUTTON STYLE
// ============================================================


// ============================================================
// FOOTER
// ============================================================

const BeginningBalanceFooter: React.FC = () => {
  return (
    <footer
      id="beginning-balance-footer"
      className="
        relative
        h-[160px]
        w-full
        shrink-0
        overflow-hidden
        bg-white
      "
    >

      {/* ======================================================
          TOTALS
      ====================================================== */}

      
      <div
        className="
          absolute
          right-[91px]
          top-[10px]
          flex
          
          h-[25px]
          items-center
        "
      >
        {/* Debit Total */}

        <input
          id="txtDebitTotal"
          type="text"
          defaultValue="50,000.00"
          readOnly
          className={`${inputClass} w-[153px] text-right border `}
        />

        {/* Credit Total */}

        <input
          id="txtCreditTotal"
          type="text"
          defaultValue="50,000.00"
          readOnly
          className={`${inputClass} ml-0 w-[166px] text-right`}
        />
      </div>

      {/* ======================================================
          DIFFERENCE
      ====================================================== */}

      <div
        className="
          absolute
          right-[82px]
          top-[48px]
          flex
          h-[25px]
          items-center
        "
      >
        <label
          htmlFor="txtDifference"
          className="
            mr-[8px]
            whitespace-nowrap
            text-[13px]
            text-[#505050]
          "
        >
          Diff. : (Dr.- Cr.) :
        </label>

        <input
          id="txtDifference"
          type="text"
          defaultValue="0.00"
          readOnly
          className="
            h-[30px]
            w-[100px]
            border
            border-[#cbd5e1]
            bg-white
            px-2
            text-right
            text-[14px]
            text-red-600
            outline-none
          "
        />
      </div>

      {/* ======================================================
          ACTION BUTTONS
      ====================================================== */}

      <div
        className="
          absolute
          bottom-[8px]
          left-1/2
          flex
          -translate-x-1/2
          gap-[15px]
        "
      >

        {/* MODIFY */}

        <button
          id="btnModify"
          type="button"
          className={`btn-style `}
        >
        Modify
        </button>

        {/* DELETE */}

        <button
          id="btnDelete"
          type="button"
          className={`btn-style `}
        >
         Delete
        </button>

        {/* PRINT */}

        <button
          id="btnPrint"
          type="button"
          className={`btn-style `}
        >
          Print
        </button>

        {/* POST */}

        <button
          id="btnPost"
          type="button"
          className={`btn-style `}
        >
          Post
        </button>

        {/* CLEAR */}

        <button
          id="btnClear"
          type="button"
          className={`btn-style `}
        >
          <u>C</u>lear
        </button>
      </div>
    </footer>
  );
};

export default BeginningBalanceFooter;