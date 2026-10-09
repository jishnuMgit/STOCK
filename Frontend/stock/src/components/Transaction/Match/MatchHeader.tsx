
import React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import type { SelectOption, DocumentOption } from "./types";
import type { TableField } from "./types";
import { handleKeyboardAction } from "../../../hooks/useMatchKeyboard";
import type { StylesConfig } from "react-select";

dayjs.extend(customParseFormat);

export interface MatchHeaderProps {
  branch: string;
  setBranch: React.Dispatch<React.SetStateAction<string>>;

  type: string;
  setDocType: React.Dispatch<React.SetStateAction<string>>;

  receiptNo: string;
  setReceiptNo: React.Dispatch<React.SetStateAction<string>>;

  receiptDate: string;
  setReceiptDate: React.Dispatch<React.SetStateAction<string>>;

  customerId: string;
  setCustomerId: React.Dispatch<React.SetStateAction<string>>;

  customerName: string;
  setCustomerName: React.Dispatch<React.SetStateAction<string>>;

  divisionId: string;
  setDivisionId: React.Dispatch<React.SetStateAction<string>>;

  branchOptions: SelectOption[];
  customerOptions: SelectOption[];
  customerNameOptions: SelectOption[];
  divisionOptions: SelectOption[];
  documentOptions: SelectOption[];
  documentNoOptions: DocumentOption[];

  documentAmount: number;
  totalMatchAmount: number;
  balance: number;

  customerIdRef: React.RefObject<HTMLDivElement | null>;
  customerNameRef: React.RefObject<HTMLDivElement | null>;
  divisionRef: React.RefObject<HTMLDivElement | null>;
  creditDocumentRef: React.RefObject<HTMLDivElement | null>;
  documentNoRef: React.RefObject<HTMLDivElement | null>;
  dateRef: React.RefObject<HTMLInputElement | null>;

  divisionLoading: boolean;

  handleCustomerIdChange: (id: string) => void | Promise<void>;
  handleCustomerNameChange: (name: string) => void | Promise<void>;
  handleSearch: () => void | Promise<void>;

  renderSelect: (
    id: string,
    value: string,
    options: SelectOption[],
    onChange: (value: string) => void,
    next: () => void,
    selectRef: React.RefObject<HTMLDivElement | null>,
    reverseDropdown?: boolean,
    columnHeaders?: [string, string],
    customStyles?: StylesConfig<SelectOption, false>,
    disabled?: boolean,
    documentMode?: boolean,
    swapColumns?: boolean
  ) => React.ReactNode;

  handleKeyboardAction: (
    ...args: Parameters<
      typeof import("../../../hooks/useMatchKeyboard").handleKeyboardAction
    >
  ) => void;
}

const MatchHeader: React.FC<MatchHeaderProps> = ({
    branch,
  customerId,
  customerName,
  divisionId,
  type,
  receiptNo,
  receiptDate,

  setDivisionId,
  setDocType,
  setReceiptNo,
  setReceiptDate,
  setBranch,

  customerOptions,
  customerNameOptions,
  divisionOptions,
  documentOptions,
  documentNoOptions,

  divisionLoading,

  documentAmount,
  totalMatchAmount,
  balance,

  customerIdRef,
  customerNameRef,
  divisionRef,
  creditDocumentRef,
  documentNoRef,
  dateRef,

  handleCustomerIdChange,
  handleCustomerNameChange,
  handleSearch,

  renderSelect,
}) => {
  return (
    <>
      {/* TITLE */}
      <div
        className="
          flex
          h-[36px]
          items-center
          border-b
          border-slate-300
          bg-[#a3dfc0]
        "
      >
        <span
          className="
            px-3
            text-[17px]
            font-semibold
            text-slate-700
          "
        >
          Match
        </span>
      </div>

      {/* HEADER */}
      <div
        className="
          px-6.75
          pt-6
          pb-3
        "
      >
        {/* HEADER ROW 1 */}
        <div
          className="
            grid
            grid-cols-[100px_154px_520px_1fr]
            items-center
            gap-x-2.75
            mb-1.25
            max-[1200px]:grid-cols-[100px_minmax(154px,1fr)_minmax(300px,1fr)]
            max-[1200px]:gap-x-2
            max-[900px]:grid-cols-1
            max-[900px]:gap-y-1.5
          "
        >
          <label className="text-right text-black font-semibold text-[14px] whitespace-nowrap">
            Customer :
          </label>

          {/* CUSTOMER ID */}
          {renderSelect(
            "lkpCustomerID",
            customerId,
            customerOptions,
            handleCustomerIdChange,
            () => customerNameRef.current?.focus(),
            customerIdRef,
            false,
            ["Account ID", "Account Name"]
          )}

          {/* CUSTOMER NAME */}
          {renderSelect(
            "lkpCustomerName",
            customerName,
            customerNameOptions,
            handleCustomerNameChange,
            () => divisionRef.current?.focus(),
            customerNameRef,
            true,
            ["Account Name", "Account ID"]
          )}

          {/* DOCUMENT AMOUNT */}
          <div className="flex items-center justify-end gap-2">
            <label className="whitespace-nowrap text-black font-semibold text-[14px]">
              Document Amt. :
            </label>

            <div
              id="txtDocAmt"
              className="
                flex
                h-7.25
                w-28.75
                shrink-0
                items-center
                justify-end
                rounded-xs
                border
                border-[#aebdca]
                bg-white
                px-2
                text-[13px]
                text-[#00a83b]
              "
            >
              {documentAmount.toFixed(2)}
            </div>

            <span className="text-[#00a83b]">Cr.</span>
          </div>
        </div>

        {/* HEADER ROW 2 */}
        <div
          className="
            grid
            grid-cols-[100px_300px_145px_140px_75px_1fr]
            items-center
            gap-x-2.25
            mb-1.25
            max-[1200px]:grid-cols-[100px_minmax(180px,1fr)_120px_140px_75px_minmax(220px,1fr)]
            max-[1200px]:gap-x-2
            max-[900px]:grid-cols-1
            max-[900px]:gap-y-1.5
          "
        >
          {/* DIVISION */}
          <label className="text-right text-black font-semibold text-[14px]">
            Division :
          </label>

          <div className="ml-0.5">
            {renderSelect(
              "lkpDivision",
              divisionId,
              divisionOptions,
              setDivisionId,
              () => creditDocumentRef.current?.focus(),
              divisionRef,
              true,
              ["Division Name", "Division ID"],
              undefined,
              !customerId ||
                divisionLoading ||
                divisionOptions .length === 0,
              false,
              true
            )}
          </div>

          {/* DOCUMENT TYPE */}
          <label className="whitespace-nowrap text-right text-black font-semibold text-[14px]">
            Document Type :
          </label>

          {renderSelect(
            "lkpDocType",
            type,
            documentOptions,
            setDocType,
            () => documentNoRef.current?.focus(),
            creditDocumentRef,
            true,
            ["DocumentType ID", "DocumentType Name"]
          )}

          {/* SEARCH */}
          <button
            id="Searchbtn"
            type="button"
            className="
              h-7.25
              rounded-[3px]
              border
              border-[#b7c7d7]
              bg-linear-to-b
              from-white
              to-[#e7eef5]
              px-3.5
              text-[13px]
              text-slate-700
              hover:from-white
              hover:to-[#dce8f1]
              focus:border-[#20884e]
              focus:outline-none
              focus:ring-0
            "
            onClick={handleSearch}
            onKeyDown={(event) =>
              handleKeyboardAction(event, {
                onEnter: () => documentNoRef.current?.focus(),
              })
            }
          >
            Search
          </button>

          {/* MATCH AMOUNT */}
          <div className="flex items-center justify-end gap-2">
            <label className="whitespace-nowrap text-black font-semibold text-[14px]">
              Match Amt. :
            </label>

            <div
              id="txtMatchAmt"
              className="
                flex
                h-7.25
                w-28.75
                shrink-0
                items-center
                justify-end
                rounded-xs
                border
                border-[#aebdca]
                bg-white
                px-2
                text-[13px]
                text-[#00a83b]
              "
            >
              {totalMatchAmount.toFixed(2)}
            </div>

            <span className="text-[#00a83b]">Dr.</span>
          </div>
        </div>

        {/* HEADER ROW 3 */}
        <div
          className="
            grid
            grid-cols-[100px_300px_142px_140px_1fr_235px]
            items-center
            gap-x-2.5
            max-[1200px]:grid-cols-[100px_minmax(180px,1fr)_120px_140px_minmax(180px,1fr)]
            max-[1200px]:gap-x-2
            max-[900px]:grid-cols-1
            max-[900px]:gap-y-1.5
          "
        >
          {/* DOCUMENT NO */}
          <label className="text-right whitespace-nowrap text-black font-semibold text-[14px]">
            Document No. :
          </label>

          <div className="ml-px">
            {renderSelect(
              "lkpDocNo.",
              receiptNo,
              documentNoOptions,
              setReceiptNo,
              () => dateRef.current?.focus(),
              documentNoRef,
              false,
              undefined,
              undefined,
              false,
              true
            )}
          </div>

          {/* MATCH DATE */}
          <label className="whitespace-nowrap text-right text-black font-semibold text-[14px]">
            Match Date :
          </label>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={
                receiptDate
                  ? dayjs(receiptDate, "DD-MM-YYYY", true)
                  : null
              }
              onChange={(newValue) => {
                if (newValue?.isValid()) {
                  setReceiptDate(newValue.format("DD-MM-YYYY"));
                } else {
                  setReceiptDate("");
                }
              }}
              format="DD-MM-YYYY"
              inputRef={dateRef}
              slotProps={{
                textField: {
                  id: "dtpMatchDate",
                },
                openPickerButton: {
                  sx: {
                    padding: "2px",
                    margin: 0,
                  },
                },
                inputAdornment: {
                  sx: {
                    margin: 0,
                    padding: 0,
                  },
                },
              }}
              sx={{
                width: "140px",

                "& .MuiPickersTextField-root": {
                  width: "120px",
                },

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

                "& .MuiPickersInputBase-sectionsContainer": {
                  paddingLeft: "10px !important",
                  paddingRight: "0px !important",
                  marginBottom: "-5px !important",
                  marginLeft: "0px !important",
                  boxSizing: "border-box",
                  overflow: "hidden",
                },

                "& .MuiPickersInputBase-sectionContent": {
                  fontSize: "12px",
                },

                "& .MuiPickersInputBase-input": {
                  minWidth: 0,
                  width: "100%",
                  fontSize: "12px",
                  padding: 0,
                  height: "28px",
                  boxSizing: "border-box",
                },

                "& .MuiInputAdornment-root": {
                  margin: 0,
                  padding: 0,
                },

                "& .MuiIconButton-root": {
                  width: "24px",
                  height: "24px",
                  padding: "2px",
                  margin: 0,
                },

                "& .MuiSvgIcon-root": {
                  fontSize: "16px",
                },

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

          <div />

          {/* BALANCE */}
          <div className="flex items-center justify-end gap-2">
            <label className="whitespace-nowrap text-black font-semibold text-[14px]">
              Balance Amt. :
            </label>

            <div
              id="txtBalanceAmt"
              className="
                flex
                h-7.25
                w-28.75
                shrink-0
                items-center
                justify-end
                rounded-xs
                border
                border-[#aebdca]
                bg-white
                px-2
                text-[13px]
                text-[#ff0000]
              "
            >
              {balance.toFixed(2)}
            </div>

            <span className="text-[#00a83b]">Cr.</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default MatchHeader;
