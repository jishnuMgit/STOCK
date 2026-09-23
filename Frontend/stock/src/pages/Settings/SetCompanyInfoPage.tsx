const SetCompanyInfo = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-[850px]  bg-white border-[0.5px] shadow-md">

        {/* Header */}
        <div className="h-[30px] bg-[#a7dfc0] flex ">
          <h2 className="text-[17px] font-semibold text-[#374151] ml-[5px]">
            Set Company Info.
          </h2>
        </div>

        {/* Form */}
        <div className="px-[5px] pr-[30px] py-[5px] pt-[15px]">

          {/* Company Name */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="lkpCoName"
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              Company Name :
            </label>

            <div className="relative">
              <select
                id="lkpCoName"
                name="lkpCoName"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              >
                <option>
                  CARAVAN TOURS & TRAVEL COMPANY
                </option>
              </select>
            </div>
          </div>

          {/* Company Name AR */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoName_AR"
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              Company Name (AR) :
            </label>

            <div className="relative">
              <input
                id="txtCoName_AR"
                maxLength={100}
                name="txtCoName_AR"
                type="text"
                dir="rtl"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              />
            </div>
          </div>

          {/* Company Name QR */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoName_QR"
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              Company Name (QR) :
            </label>

            <div className="relative">
              <input
              maxLength={30}
                id="txtCoName_QR"
                name="txtCoName_QR"
                type="text"
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              />
            </div>
          </div>


          {/* Company Name short */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoName_QR"
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              Company Name (Short) :
            </label>

            <div className="relative">
              <input
              maxLength={30}
                id="txtCoName_QR"
                name="txtCoName_QR"
                type="text"
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              />
            </div>
          </div>

          {/* VAT No */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoVATNo"
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              VAT No. :
            </label>

            <div className="relative">
              <input
              maxLength={15}
                id="txtCoVATNo"
                name="txtCoVATNo"
                type="text"
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none"
              />
            </div>
          </div>

          {/* VAT No AR */}
          <div className="grid grid-cols-[145px_1fr] items-center mb-[8px]">
            <label
              htmlFor="txtCoVATNo_AR"
              className="text-[11px] text-gray-600 text-right pr-3"
            >
              VAT No. (AR) :
            </label>

            <div className="relative">
              <input
              maxLength={15}
                id="txtCoVATNo_AR"
                name="txtCoVATNo_AR"
                type="text"
                className="w-[50%] h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none text-right"
              />
            </div>
          </div>

          {/* ================= ADDRESS SECTION ================= */}
          <div className="mt-[10px]">

            {/* Address Headers */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center mb-[6px]">

              <div></div>

              <div className="text-[11px] font-semibold text-gray-600 text-center">
                Address (EN)
              </div>

              <div className="text-[11px] font-semibold text-gray-600 text-center">
                Address (AR)
              </div>

            </div>

            {/* Address 1 */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center mb-[8px]">

              <label
                htmlFor="txtCoAddress1"
                className="text-[11px] text-gray-600 text-right pr-3"
              >
                Address 1 :
              </label>

              {/* English */}
              <input
                id="txtCoAddress1"
                name="txtCoAddress1"
                maxLength={80}
                type="text"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none mr-[5px]"
              />

              {/* Arabic */}
              <input
                id="txtCoAddress1_AR"
                name="txtCoAddress1_AR"
                maxLength={80}
                type="text"
                dir="rtl"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none ml-[5px]"
              />

            </div>

            {/* Address 2 */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center mb-[8px]">

              <label
                htmlFor="txtCoAddress2"
                className="text-[11px] text-gray-600 text-right pr-3"
              >
                Address 2 :
              </label>

              {/* English */}
              <input
                id="txtCoAddress2"
                name="txtCoAddress2"
                maxLength={80}
                type="text"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none mr-[5px]"
              />

              {/* Arabic */}
              <input
                id="txtCoAddress2_AR"
                name="txtCoAddress2_AR"
                maxLength={80}
                type="text"
                dir="rtl"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none ml-[5px]"
              />

            </div>

            {/* Address 3 */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center mb-[8px]">

              <label
                htmlFor="txtCoAddress3"
                className="text-[11px] text-gray-600 text-right pr-3"
              >
                Address 3 :
              </label>

              {/* English */}
              <input
                id="txtCoAddress3"
                name="txtCoAddress3"
                maxLength={80}
                type="text"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none mr-[5px]"
              />

              {/* Arabic */}
              <input
                id="txtCoAddress3_AR"
                name="txtCoAddress3_AR"
                maxLength={80}
                type="text"
                dir="rtl"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none ml-[5px]"
              />

            </div>

            {/* Address 4 */}
            <div className="grid grid-cols-[145px_1fr_1fr] items-center">

              <label
                htmlFor="txtCoAddress4"
                className="text-[11px] text-gray-600 text-right pr-3"
              >
                Address 4 :
              </label>

              {/* English */}
              <input
                id="txtCoAddress4"
                name="txtCoAddress4"
                maxLength={80}
                type="text"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none mr-[5px]"
              />

              {/* Arabic */}
              <input
                id="txtCoAddress4_AR"
                name="txtCoAddress4_AR"
                maxLength={80}
                type="text"
                dir="rtl"
                className="w-full h-[23px] border border-gray-300 rounded-sm px-2 text-[11px] outline-none ml-[5px]"
              />

            </div>

          </div>

          {/* ================= BUTTONS ================= */}
          <div className="flex justify-center gap-3 mt-[14px] mb-[12px]">

            <button
              id="btnSave"
              name="btnSave"
              type="button"
              className="
                w-[105px]
                h-[34px]
                border
                border-gray-400
                rounded-md
                bg-gradient-to-b
                from-white
                to-[#e5eef5]
                text-green-600
                text-[15px]
                underline
              "
            >
              Save
            </button>

            <button
              id="btnClear"
              name="btnClear"
              type="button"
              className="
                w-[105px]
                h-[34px]
                border
                border-gray-400
                rounded-md
                bg-gradient-to-b
                from-white
                to-[#e5eef5]
                text-green-600
                text-[15px]
                underline
              "
            >
              Clear
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default SetCompanyInfo;