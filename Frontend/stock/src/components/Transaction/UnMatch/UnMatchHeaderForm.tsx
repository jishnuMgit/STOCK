import React, { useMemo, useState } from "react";
import Select, {
  components,
  type OptionProps,
  type SelectInstance,
} from "react-select";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

import {
  AdapterDayjs,
} from "@mui/x-date-pickers/AdapterDayjs";

import {
  DatePicker,
} from "@mui/x-date-pickers/DatePicker";

import "../Receipt/save/customselect.css";

dayjs.extend(customParseFormat);

/* =========================================================
   TYPES
========================================================= */

export interface SelectOption {
  value: string;
  label: string;
}

interface MatchHeaderFormProps {
  /* Customer */
  customerId: string;
  setCustomerId: (value: string) => void;

  customerName: string;
  setCustomerName: (value: string) => void;

  customerIdOptions: SelectOption[];
  customerNameOptions: SelectOption[];

  /* Division */
  divisionId: string;
  setDivisionId: (value: string) => void;

  divisionOptions: SelectOption[];

  /* Document Type */
  type: string;
  setType: (value: string) => void;

  typeOptions?: SelectOption[];

  /* Document No */
  receiptNo: string;
  setReceiptNo: (value: string) => void;

  receiptNoOptions?: SelectOption[];

  /* Branch */
  branch: string;
  setBranch: (value: string) => void;

  branchOptions: SelectOption[];

  /* Match Apply Date */
  receiptDate: string;
  setReceiptDate: (value: string) => void;

  /* Amounts */
  docAmount: number;
  matchAmount: number;
  balance: number;

  /* Search */
  onSearch: () => void;

  /* Refs */
  customerIdRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  customerNameRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  divisionRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  typeRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  receiptNoRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  branchRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  dateRef: React.RefObject<HTMLInputElement | null>;

  focusFirstAccountId: () => void;
}

/* =========================================================
   CUSTOM OPTION
========================================================= */

const CustomOption = (
  props: OptionProps<SelectOption, false>
) => {
  const { data } = props;

  return (
    <components.Option {...props}>
      <div className="flex w-full items-center justify-between">
        <span className="text-xs text-slate-700">
          {data.label}
        </span>

        <span className="ml-3 text-[11px] text-gray-400">
          {data.value}
        </span>
      </div>
    </components.Option>
  );
};

/* =========================================================
   FILTER
========================================================= */

const filterOption = (
  option: {
    label: string;
    value: string;
    data: SelectOption;
  },
  inputValue: string
) => {
  const search = inputValue.toLowerCase().trim();

  if (!search) {
    return true;
  }

  return (
    option.data.label
      .toLowerCase()
      .includes(search) ||
    option.data.value
      .toLowerCase()
      .includes(search)
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const UnMatchHeaderForm: React.FC<MatchHeaderFormProps> = ({
  customerId,
  setCustomerId,

  customerName,
  setCustomerName,

  customerIdOptions,
  customerNameOptions,

  divisionId: division,
  setDivisionId,

  divisionOptions,

  type,
  setType,

  typeOptions,

  receiptNo,
  setReceiptNo,

  receiptNoOptions,
//@ts-ignore
  branch,
  //@ts-ignore
  setBranch,
//@ts-ignore
  branchOptions,

  receiptDate,
  setReceiptDate,

  docAmount,
  //@ts-ignore
  matchAmount,
   //@ts-ignore
  balance,

  onSearch,

  customerIdRef,
  customerNameRef,
  divisionRef,
  typeRef,
  receiptNoRef,
  branchRef,
  dateRef,

  focusFirstAccountId,
}) => {
  /* =======================================================
     STATE
  ======================================================= */

  const [openSelect, setOpenSelect] = useState<string | null>(
    null
  );

  /* =======================================================
     DEFAULT TYPE OPTIONS
  ======================================================= */

  const defaultTypeOptions = useMemo(
    () =>
      typeOptions || [
        {
          value: "B",
          label: "B",
        },
        {
          value: "C",
          label: "C",
        },
      ],
    [typeOptions]
  );

  /* =======================================================
     SELECT STYLES
  ======================================================= */

  const selectStyles = {
    control: (base: any) => ({
      ...base,

      minHeight: "30px",
      height: "30px",
      

      border: "1px solid #cfd7df",
      borderRadius: "2px",

      backgroundColor: "#ffffff",

      boxShadow: "none",

      fontSize: "12px",

      cursor: "text",

      "&:hover": {
        borderColor: "#9db8d4",
      },
    }),

    valueContainer: (base: any) => ({
      ...base,

      height: "30px",

      padding: "0 7px",

      overflow: "hidden",
    }),

    singleValue: (base: any) => ({
      ...base,

      margin: 0,

      color: "#344054",

      fontSize: "12px",

      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }),

    placeholder: (base: any) => ({
      ...base,

      margin: 0,

      color: "#808080",

      fontSize: "12px",
    }),

    input: (base: any) => ({
      ...base,

      margin: 0,
      padding: 0,

      fontSize: "12px",
    }),

    indicatorsContainer: (base: any) => ({
      ...base,

      height: "30px",
    }),

    dropdownIndicator: (base: any) => ({
      ...base,

      padding: "3px",

      color: "#8fa0af",

      "&:hover": {
        color: "#667788",
      },
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base: any) => ({
      ...base,

      marginTop: "1px",

      borderRadius: "2px",

      zIndex: 9999,

      fontSize: "12px",
    }),

    menuList: (base: any) => ({
      ...base,

      padding: "2px 0",

      maxHeight: "180px",
    }),

    option: (base: any, state: any) => ({
      ...base,

      padding: "5px 8px",

      fontSize: "12px",

      cursor: "pointer",

      backgroundColor:
        state.isSelected || state.isFocused
          ? "#eaf3fb"
          : "#ffffff",

      color: "#344054",
    }),
  };

  /* =======================================================
     SELECTED VALUES
  ======================================================= */

  const selectedCustomerId =
    customerIdOptions.find(
      (item) => item.value === customerId
    ) || null;

  const selectedCustomerName =
    customerNameOptions.find(
      (item) => item.value === customerName
    ) || null;

  const selectedDivision =
    divisionOptions.find(
      (item) => item.value === division
    ) || null;

  const selectedType =
    defaultTypeOptions.find(
      (item) => item.value === type
    ) || null;

  const selectedReceiptNo =
    receiptNoOptions?.find(
      (item) => item.value === receiptNo
    ) || null;



  /* =======================================================
     ENTER NAVIGATION
  ======================================================= */

  const handleEnter = (
    event: React.KeyboardEvent,
    next: () => void
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    if (openSelect) {
      return;
    }

    event.preventDefault();

    next();
  };

  /* =======================================================
     AMOUNT FORMAT
  ======================================================= */

  const formatAmount = (value: number) => {
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  /* =======================================================
     RETURN
  ======================================================= */

return (
  <div className="w-full bg-white h-[150px] px-2 py-1.5 mb-3">

    <div className="relative w-full">

      {/* =====================================================
          LEFT SECTION
      ===================================================== */}

      <div className="flex w-150 flex-col gap-3">

        {/* =================================================
            CUSTOMER
        ================================================= */}

        <div className="flex h-6.75 gap-5 w-full  items-center">

          <label
            className="
          
              box-border
              w-13.75
              shrink-0
              whitespace-nowrap
              pr-2
              text-right
              mr-2
              text-[14px]
              leading-6.75
             
            "
            id="lkpCustomerId"
          >
            Customer :
          </label>


          {/* CUSTOMER ID */}

          <div className="w-26.25 shrink-0" id="lkpCustomerId">

            <Select<SelectOption, false>
              ref={customerIdRef}

              value={selectedCustomerId}

              options={customerIdOptions}

              components={{
                Option: CustomOption,
              }}

              filterOption={filterOption}

              placeholder=""

              isSearchable
              isClearable={false}

              onMenuOpen={() =>
                setOpenSelect("customerId")
              }

              onMenuClose={() =>
                setOpenSelect(null)
              }

              onChange={(option) => {
                setCustomerId(
                  option?.value || ""
                );
              }}

              onKeyDown={(event) =>
                handleEnter(
                  event,
                  () =>
                    customerNameRef.current?.focus()
                )
              }

              styles={{
                ...selectStyles,

                container: (base: any) => ({
                  ...base,

                  width: "120px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "120px",

                  minWidth: "120px",

                  minHeight: "30px",

                  height: "30px",

                  backgroundColor:
                    "white",
                }),
              }}
            />

          </div>


          {/* CUSTOMER NAME */}

          <div className="w-87.5 shrink-0" id="lkpCustomerName">

            <Select<SelectOption, false>
              ref={customerNameRef}

              value={selectedCustomerName}

              options={customerNameOptions}

              components={{
                Option: CustomOption,
              }}

              filterOption={filterOption}

              placeholder=""

              isSearchable
              isClearable={false}

              onMenuOpen={() =>
                setOpenSelect("customerName")
              }

              onMenuClose={() =>
                setOpenSelect(null)
              }

              onChange={(option) => {
                setCustomerName(
                  option?.value || ""
                );
              }}

              onKeyDown={(event) =>
                handleEnter(
                  event,
                  () =>
                    divisionRef.current?.focus()
                )
              }

              styles={{
                ...selectStyles,

                container: (base: any) => ({
                  ...base,

                  width: "450px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "450px",

                  minWidth: "450px",

                  minHeight: "30px",

                  height: "30px",
                }),
              }}
            />

          </div>

        </div>


        {/* =================================================
            DIVISION
        ================================================= */}

        <div className="flex h-6.75 w-125 gap-5 items-center">

          <label
            className="
              box-border
              w-13.75
              shrink-0
              whitespace-nowrap
              pr-2
              mr-2
              text-right
              text-[14px]
              leading-6.75
             
            "
          >
            Division :
          </label>


          <div className="w-[250px] shrink-0 " id="lkpDivision ">

            <Select<SelectOption, false>
              ref={divisionRef}

              value={selectedDivision}

              options={divisionOptions}

              components={{
                Option: CustomOption,
              }}

              filterOption={filterOption}

              placeholder=""

              isSearchable
              isClearable={false}

              onMenuOpen={() =>
                setOpenSelect("division")
              }

              onMenuClose={() =>
                setOpenSelect(null)
              }

              onChange={(option) => {
                setDivisionId(
                  option?.value || ""
                );
              }}

              onKeyDown={(event) =>
                handleEnter(
                  event,
                  () =>
                    typeRef.current?.focus()
                )
              }

              styles={{
                ...selectStyles,

                container: (base: any) => ({
                  ...base,

                  width: "250px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "250px",

                  minWidth: "250px",

                  minHeight: "30px",

                  height: "30px",
                }),
              }}
            />

          </div>
 <div className="flex h-6.75 items-center ml-3">

          <label
            className="
              mr-2
              -ml-1
              shrink-0
              whitespace-nowrap
              text-right
              text-[14px]
              leading-6.75
             
            "
          >
             Doc Type :
          </label>


          <div className="w-[140px] shrink-0">

            <Select<SelectOption, false>
              ref={typeRef}

              value={selectedType}

              options={defaultTypeOptions}

              components={{
                Option: CustomOption,
              }}

              filterOption={filterOption}

              placeholder=""

              isSearchable
              isClearable={false}

              onMenuOpen={() =>
                setOpenSelect("type")
              }

              onMenuClose={() =>
                setOpenSelect(null)
              }

              onChange={(option) => {
                setType(
                  option?.value || ""
                );
              }}

              onKeyDown={(event) =>
                handleEnter(
                  event,
                  onSearch
                )
              }

              styles={{
                ...selectStyles,

                container: (base: any) => ({
                  ...base,

                  width: "140px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "140px",

                  minWidth: "140px",

                  minHeight: "30px",

                  height: "30px",
                }),
              }}
            />

          </div>


          {/* SEARCH */}

          <button
            type="button"

            onClick={onSearch}

            className="
              ml-2
              h-6.75
              w-17.5
              shrink-0
              rounded-xs
              border
              border-[#b9c7d5]
              bg-[#f7f9fb]
              text-[14px]
             
              shadow-sm
              hover:bg-[#edf2f6]
              active:bg-[#e2e8ee]
            "
          >
            Search
          </button>

        </div>
        </div>


        {/* =================================================
            DOC NO
        ================================================= */}

        <div className="flex h-6.75 w-125 items-center gap-5 ">

          <label
            className="
              box-border
              w-13.75
              shrink-0
              mr-2
              whitespace-nowrap
              pr-2
              text-right
              text-[14px]
              leading-6.75
             
            "
          >
            Credit Document :
          </label>


          <div className="w-[250px] shrink-0 mr-8">

            <Select<SelectOption, false>
              ref={receiptNoRef}

              value={selectedReceiptNo}

              options={
                receiptNoOptions || []
              }

              components={{
                Option: CustomOption,
              }}

              filterOption={filterOption}

              placeholder=""

              isSearchable
              isClearable={false}

              onChange={(option) => {
                setReceiptNo(
                  option?.value || ""
                );
              }}

              onKeyDown={(event) =>
                handleEnter(
                  event,
                  () =>
                    branchRef.current?.focus()
                )
              }

              styles={{
                ...selectStyles,

                container: (base: any) => ({
                  ...base,

                  width: "250px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "250px",

                  minWidth: "250px",

                  minHeight: "30px",

                  height: "30px",
                }),
              }}
            />

          </div>

           <div className="flex h-6.75 items-center">

          <label
          title="Match Apply Date"
            className="
              mr-2
              shrink-0
              whitespace-nowrap
              text-right
              -ml-2
              text-[14px]
              leading-6.75
             
            "
          >
            Match Date :
          </label>


          <LocalizationProvider
            dateAdapter={AdapterDayjs}
          >

            <DatePicker
              value={
                receiptDate
                  ? dayjs(
                      receiptDate,
                      "DD/MM/YYYY"
                    )
                  : null
              }

              format="DD/MM/YYYY"

              onChange={(newValue) => {

                if (
                  newValue?.isValid()
                ) {

                  setReceiptDate(
                    newValue.format(
                      "DD/MM/YYYY"
                    )
                  );

                } else {

                  setReceiptDate("");

                }

              }}

              inputRef={dateRef}

              slotProps={{

                textField: {

                  onKeyDown: (
                    event
                  ) =>
                    handleEnter(
                      event,
                      focusFirstAccountId
                    ),

                },

                openPickerButton: {

                  sx: {

                    width: "54px",

                    height: "24px",

                    padding: "2px",

                  },

                },

              }}

               sx={{
      width: "140px",

      "& .MuiPickersTextField-root": {
        width: "120px",
      },

      /* =========================================
         MAIN INPUT
      ========================================= */
      "& .MuiPickersInputBase-root": {
        width: "140px",
        height: "28px",
        minHeight: "28px",
        boxSizing: "border-box",
        borderRadius: "4px",
        backgroundColor: "#ffffff",
        fontSize: "12px",
        padding: 0,
        overflow: "hidden",
      },

      /* =========================================
         DATE TEXT CONTAINER
         THIS IS THE IMPORTANT PART
      ========================================= */
      "& .MuiPickersInputBase-sectionsContainer": {
        paddingLeft: "10px !important",
        paddingRight: "0px !important",
        marginBottom:"-5px !important",
        marginLeft: "0px !important",
        boxSizing: "border-box",
        overflow: "hidden",
      },

      /* =========================================
         INDIVIDUAL DATE SECTIONS
      ========================================= */
      "& .MuiPickersInputBase-sectionContent": {
        fontSize: "12px",
      },

      /* =========================================
         INPUT
      ========================================= */
      "& .MuiPickersInputBase-input": {
        minWidth: 0,
        width: "100%",
        fontSize: "12px",
        padding: 0,
        height: "28px",
        boxSizing: "border-box",
      },

      /* =========================================
         INPUT ADORNMENT
      ========================================= */
      "& .MuiInputAdornment-root": {
        margin: 0,
        padding: 0,
      },

      /* =========================================
         CALENDAR BUTTON
      ========================================= */
      "& .MuiIconButton-root": {
        width: "24px",
        height: "24px",
        padding: "2px",
        margin: 0,
      },

      "& .MuiSvgIcon-root": {
        fontSize: "16px",
      },

      /* =========================================
         BORDER
      ========================================= */
      "& .MuiPickersOutlinedInput-notchedOutline": {
        borderColor: "#B7C7D7 !important",
      },

      "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
        },

      "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
          borderWidth: "1px",
        },

      "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
        },

      "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
        },

      "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
        },
    }}

            />

          </LocalizationProvider>

        </div>

        </div>


        {/* =================================================
            BRANCH
        ================================================= */}

        <div className="flex h-6.75 w-125 items-center">

        


          <div className="w-50 shrink-0">

           

          </div>

        </div>

      </div>


      {/* =====================================================
          MIDDLE SECTION
      ===================================================== */}

      <div
        className="
          absolute
          left-76.25
          top-0
          flex
          w-100
          flex-col
          gap-3
        "
      >

        {/* ROW 1 */}

        <div className="h-6.75" />


        {/* =================================================
            DOC TYPE
        ================================================= */}

       


        {/* ROW 3 */}

        <div className="h-6.75" />


        {/* =================================================
            MATCH APPLY DATE
        ================================================= */}

       

      </div>


      {/* =====================================================
          RIGHT AMOUNT SECTION
      ===================================================== */}

     {/* =====================================================
    RIGHT AMOUNT SECTION
===================================================== */}

<div
  className="
    absolute
    right-0
    top-0
    flex
    w-47.5
    flex-col
    gap-1.25
  "
>

  {/* =================================================
      DOC AMOUNT
  ================================================= */}

  <div
    className="
      flex
      h-6.75
      w-full
      items-center
    "
  >

    <span
      className="
        w-16.25
        shrink-0
        whitespace-nowrap
        text-right
        text-[14px]
       
      "
    >
      Doc. Amt. :
    </span>


    <div
      className="
        ml-2
        flex
        h-[30px]
        w-25
        shrink-0
        items-center
        justify-end
        rounded-xs
        border
        border-[#cfd7df]
        bg-white
        px-2
        box-border
      "
    >

      <span
        className="
          text-[13px]
          font-semibold
          text-green-600
        "
        id="txtDocumentAmount"
      >
        {formatAmount(docAmount)}
      </span>

    </div>


    <span
      className="
        ml-1
        w-5
        shrink-0
        whitespace-nowrap
        text-left
        text-[11px]
        font-semibold
        text-green-600
      "
    >
      Cr.
    </span>

  </div>


</div>

    </div>

  </div>
);
};

export default UnMatchHeaderForm;