import React, { useState } from "react";

const PurchaseInoviceMiscsup: React.FC = () => {
  const [miscSupId, setMiscSupId] = useState("");
  const [miscSupName, setMiscSupName] = useState("");
  const [vatNo, setVatNo] = useState("");

  const inputClassmiscId =
    " w-[110px] input-style";
      const inputClassmiscName =
    " w-[300px] input-style";
      const inputClassvat =
    " w-[220px] input-style";

  const buttonClass =
    "btn-style";

  const handleSave = () => {
    console.log({
      miscSupId,
      miscSupName,
      vatNo,
    });
  };

  const handleClose = () => {
    console.log("Close");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100">
      <div className="w-[500px] overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800">

        {/* TITLE */}
        <div className="flex h-[30px] w-full shrink-0 items-center border-b border-slate-300 bg-[#a5e0c3]">
        <h1 className="ml-[20px] text-[17px] font-semibold text-slate-700">
         Misc. Supplier

        </h1>
      </div>

        {/* FORM */}
        <div className="px-[25px] py-[22px]">

          {/* Misc. Sup.ID */}
          <div className="mb-[12px] flex items-center">
            <label
              htmlFor="txtMiscSupID"
              className="w-[125px] shrink-0 text-right text-[13px] text-slate-700"
            >
              Misc. Sup.ID :
            </label>

            <input
              id="txtMiscSupID"
              type="text"
              value={miscSupId}
              maxLength={12}
              onChange={(e) => setMiscSupId(e.target.value)}
              autoComplete="off"
              className={`${inputClassmiscId} ml-[10px]`}
            />
          </div>

          {/* Misc. Sup.Name */}
          <div className="mb-[12px] flex items-center">
            <label
              htmlFor="txtMiscSupName"
              className="w-[125px] shrink-0 text-right text-[13px] text-slate-700"
            >
              Misc. Sup.Name :
            </label>

            <input
              id="txtMiscSupName"
              type="text"
              value={miscSupName}
              maxLength={100}
              onChange={(e) => setMiscSupName(e.target.value)}
              autoComplete="off"
              className={`${inputClassmiscName} ml-[10px]`}
            />
          </div>

          {/* VAT No */}
          <div className="flex items-center">
            <label
              htmlFor="txtVatNo"
              className="w-[125px] shrink-0 text-right text-[13px] text-slate-700"
            >
              Vat No. :
            </label>

            <input
              id="txtVatNo"
              type="text"
              value={vatNo}
              maxLength={15}
              onChange={(e) => setVatNo(e.target.value)}
              autoComplete="off"
              className={`${inputClassvat} ml-[10px]`}
            />
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-center gap-[6px]  border-slate-300 bg-white px-[25px] py-[12px]">
          <button
            id="btnSave"
            type="button"
            onClick={handleSave}
            className={buttonClass}
          >
            Save
          </button>

          <button
            id="btnClose"
            type="button"
            onClick={handleClose}
            className={buttonClass}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInoviceMiscsup;