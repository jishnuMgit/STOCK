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

  branch,
  setBranch,

  branchOptions,

  receiptDate,
  setReceiptDate,

  docAmount,
  matchAmount,
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

      minHeight: "27px",
      height: "27px",
      

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

      height: "27px",

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

      height: "27px",
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

  const selectedBranch =
    branchOptions.find(
      (item) => item.value === branch
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
  <div className="w-full bg-[#f5f6f8] px-2 py-1.5">

    <div className="relative w-full">

      {/* =====================================================
          LEFT SECTION
      ===================================================== */}

      <div className="flex w-150 flex-col gap-1.25">

        {/* =================================================
            CUSTOMER
        ================================================= */}

        <div className="flex h-6.75 w-150 items-center">

          <label
            className="
              box-border
              w-13.75
              shrink-0
              whitespace-nowrap
              pr-2
              text-right
              mr-2
              text-[12px]
              leading-6.75
              text-slate-700
            "
            id="lkpCustomerId"
          >
            Customer :
          </label>


          {/* CUSTOMER ID */}

          <div className="w-21.25 shrink-0" id="lkpCustomerId">

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

                  width: "85px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "85px",

                  minWidth: "85px",

                  minHeight: "27px",

                  height: "27px",

                  backgroundColor:
                    "#dff4f8",
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

                  width: "350px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "350px",

                  minWidth: "350px",

                  minHeight: "27px",

                  height: "27px",
                }),
              }}
            />

          </div>

        </div>


        {/* =================================================
            DIVISION
        ================================================= */}

        <div className="flex h-6.75 w-125 items-center">

          <label
            className="
              box-border
              w-13.75
              shrink-0
              whitespace-nowrap
              pr-2
              mr-2
              text-right
              text-[12px]
              leading-6.75
              text-slate-700
            "
          >
            Division :
          </label>


          <div className="w-50 shrink-0" id="lkpDivision">

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

                  width: "200px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "200px",

                  minWidth: "200px",

                  minHeight: "27px",

                  height: "27px",
                }),
              }}
            />

          </div>

        </div>


        {/* =================================================
            DOC NO
        ================================================= */}

        <div className="flex h-6.75 w-125 items-center">

          <label
            className="
              box-border
              w-13.75
              shrink-0
              mr-2
              whitespace-nowrap
              pr-2
              text-right
              text-[12px]
              leading-6.75
              text-slate-700
            "
          >
            Doc. No. :
          </label>


          <div className="w-108.75 shrink-0">

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

                  width: "435px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "435px",

                  minWidth: "435px",

                  minHeight: "27px",

                  height: "27px",
                }),
              }}
            />

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
          gap-1.25
        "
      >

        {/* ROW 1 */}

        <div className="h-6.75" />


        {/* =================================================
            DOC TYPE
        ================================================= */}

        <div className="flex h-6.75 items-center">

          <label
            className="
              mr-2
              -ml-1
              shrink-0
              whitespace-nowrap
              text-right
              text-[12px]
              leading-6.75
              text-slate-700
            "
          >
             Doc Type :
          </label>


          <div className="w-13.75 shrink-0">

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

                  width: "55px",
                }),

                control: (base: any) => ({
                  ...base,

                  width: "55px",

                  minWidth: "55px",

                  minHeight: "27px",

                  height: "27px",
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
              text-[12px]
              text-slate-700
              shadow-sm
              hover:bg-[#edf2f6]
              active:bg-[#e2e8ee]
            "
          >
            Search
          </button>

        </div>


        {/* ROW 3 */}

        <div className="h-6.75" />


        {/* =================================================
            MATCH APPLY DATE
        ================================================= */}

        <div className="flex h-6.75 items-center">

          <label
          title="Match Apply Date"
            className="
              mr-2
              shrink-0
              whitespace-nowrap
              text-right
              -ml-2
              text-[12px]
              leading-6.75
              text-slate-700
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

                width: "120px",

                flexShrink: 0,

                "& .MuiPickersInputBase-root":
                  {

                    width: "125px",

                    height: "27px",

                    minHeight: "27px",

                    borderRadius: "2px",

                    fontSize: "12px",

                    padding: 0,

                    backgroundColor:
                      "#ffffff",

                  },

                "& .MuiPickersInputBase-sectionContainer":
                  {

                    paddingLeft: "7px",

                  },

                "& .MuiPickersInputBase-input":
                  {

                    fontSize: "12px",

                    padding: 0,

                    height: "27px",

                  },

                "& .MuiIconButton-root":
                  {

                    width: "24px",

                    height: "24px",

                    padding: "2px",

                  },

                "& .MuiSvgIcon-root":
                  {

                    fontSize: "16px",
                    marginRight:"20px"

                  },

                "& .MuiPickersOutlinedInput-notchedOutline":
                  {

                    borderColor:
                      "#cfd7df",

                  },

                "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
                  {

                    borderColor:
                      "#9db8d4",

                  },

                "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                  {

                    borderColor:
                      "#9db8d4",

                    borderWidth: "1px",

                  },

              }}

            />

          </LocalizationProvider>

        </div>

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
        text-[12px]
        text-slate-700
      "
    >
      Doc. Amt. :
    </span>


    <div
      className="
        ml-2
        flex
        h-6
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


  {/* =================================================
      MATCH AMOUNT
  ================================================= */}

  {/* <div
    className="
      flex
      h-[27px]
      w-full
      items-center
    "
  >

    <span
      className="
        w-[65px]
        shrink-0
        whitespace-nowrap
        text-right
        text-[12px]
        text-slate-700
      "
    >
      Match Amt. :
    </span>


    <div
      className="
        ml-2
        flex
        h-[24px]
        w-[100px]
        shrink-0
        items-center
        justify-end
        rounded-[2px]
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
      >
        {formatAmount(matchAmount)}
      </span>

    </div>


    <span
      className="
        ml-1
        w-[20px]
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

  </div> */}


  {/* =================================================
      BALANCE
  ================================================= */}

  {/* <div
    className="
      flex
      h-[27px]
      w-full
      items-center
    "
  >

    <span
      className="
        w-[65px]
        shrink-0
        whitespace-nowrap
        text-right
        text-[12px]
        text-slate-700
      "
    >
      Balance :
    </span>


    <div
      className="
        ml-2
        flex
        h-[24px]
        w-[100px]
        shrink-0
        items-center
        justify-end
        rounded-[2px]
        border
        border-[#cfd7df]
        bg-white
        px-2
        box-border
      "
    >

      <span
        className={
          balance === 0
            ? `
              text-[13px]
              font-semibold
              text-green-600
            `
            : `
              text-[13px]
              font-semibold
              text-red-500
            `
        }
      >
        {formatAmount(balance)}
      </span>

    </div>


    <span
      className={
        balance === 0
          ? `
            ml-1
            w-[20px]
            shrink-0
            whitespace-nowrap
            text-left
            text-[11px]
            font-semibold
            text-green-600
          `
          : `
            ml-1
            w-[20px]
            shrink-0
            whitespace-nowrap
            text-left
            text-[11px]
            font-semibold
            text-red-500
          `
      }
    >
      Cr.
    </span>

  </div> */}

</div>

    </div>

  </div>
);
};

export default UnMatchHeaderForm;