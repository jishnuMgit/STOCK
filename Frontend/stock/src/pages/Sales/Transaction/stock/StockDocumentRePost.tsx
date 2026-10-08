import React, { useState } from "react";

const StockDocumentRePost: React.FC = () => {
  const [fromTxnNo, setFromTxnNo] =
    useState("");

  const [toTxnNo, setToTxnNo] =
    useState("");

  // ============================================================
  // POST
  // ============================================================

  const handlePost = () => {
    console.log({
      fromTxnNo,
      toTxnNo,
    });
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setFromTxnNo("");
    setToTxnNo("");
  };

  return (
    <div
      className="
        flex
        min-h-full
        w-full
        items-center
        justify-center
        bg-white
        pt-0
      "
    >
      {/* ======================================================
          MAIN CONTAINER
      ====================================================== */}

      <div
        className="
          w-[360px]
          border
          border-[#707070]
          bg-white
        "
      >
        {/* ====================================================
            TITLE
        ==================================================== */}

       <header
            className="
              flex
              h-[36px]
              items-center
              justify-start
              bg-[#9fdfbc]
              pl-[12px]
              text-[18px]
              font-semibold
              text-slate-700
            "
          >
            Stock  Document Re-Post 
          </header>

        {/* ====================================================
            FORM
        ==================================================== */}

        <div
          className="
            px-[7px]
            pt-[12px]
            pb-[10px]
          "
        >
          {/* ==================================================
              FROM TXN NO.
          ================================================== */}

          <div
            className="
              flex
              h-[27px]
              items-center
              mb-[10px]
            "
          >
            <label
              className="
                w-[104px]
                shrink-0
                pr-[7px]
                text-right
                text-[14px]
                
                whitespace-nowrap
              "
            >
              From Txn No. :
            </label>

            <div className="relative w-[214px]">
              <input
                id="txtFromTxnNo"
                type="text"
                value={fromTxnNo}
                onChange={(event) =>
                  setFromTxnNo(
                    event.target.value,
                  )
                }
                className="
                  h-[27px]
                  w-full
                  rounded-[3px]
                  border
                  border-[#aeb8c2]
                  bg-white
                  px-[8px]
                  text-[13px]
                  text-[#344054]
                  outline-none
                  focus:border-[#8fa3b5]
                  focus:ring-0
                "
              />
              {/* Field reference */}
            </div>
          </div>

          {/* ==================================================
              TO TXN NO.
          ================================================== */}

          <div
            className="
              flex
              h-[27px]
              items-center
            "
          >
            <label
              className="
                 w-[104px]
                shrink-0
                pr-[7px]
                text-right
                text-[14px]
                whitespace-nowrap
              "
            >
              To Txn No. :
            </label>

            <div className="relative w-[214px]">
              <input
                id="txtToTxnNo"
                type="text"
                value={toTxnNo}
                onChange={(event) =>
                  setToTxnNo(
                    event.target.value,
                  )
                }
                className="
                  h-[27px]
                  w-full
                  rounded-[3px]
                  border
                  border-[#aeb8c2]
                  bg-white
                  px-[8px]
                  text-[13px]
                  text-[#344054]
                  outline-none
                  focus:border-[#8fa3b5]
                  focus:ring-0
                "
              />

              {/* Field reference */}
            </div>
          </div>

          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div
            className="
              mt-[9px]
              flex
              justify-center
              gap-[13px]
            "
          >
            {/* POST */}

            <button
              type="button"
              onClick={handlePost}
              className="
                btn-style
              "
            >
              Post
            </button>

            {/* CLEAR */}

            <button
              type="button"
              onClick={handleClear}
              className="
               btn-style
              "
            >
              <u>C</u>lear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDocumentRePost;