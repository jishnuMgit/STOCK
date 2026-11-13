import React from "react";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import type { SelectOption, DocumentOption } from "./types";

import type { StylesConfig } from "react-select";
import {
  customerIdListStyles,
  customerNameListStyles,
  divisionListStyles,
  documentNoListStyles,
} from "./CustomSelectStyle";
import { useNavigate } from "react-router-dom";
import CloseButton from "../../common/CloseButton";

dayjs.extend(customParseFormat);

export interface MatchHeaderProps {
  lkpBranch: string;
  setLkpBranch: React.Dispatch<React.SetStateAction<string>>;

  lkpDocTypeNo: string;
  setLkpDocTypeNo: React.Dispatch<React.SetStateAction<string>>;

  receiptDate: string;
  setReceiptDate: React.Dispatch<React.SetStateAction<string>>;

  lkpCsAccountID: string;
  setLkpCsAccountID: React.Dispatch<React.SetStateAction<string>>;

  lkpCsAccountName: string;
  setLkpCsAccountName: React.Dispatch<React.SetStateAction<string>>;

  lkpDivision: string;
  setLkpDivision: React.Dispatch<React.SetStateAction<string>>;

  branchOptions: SelectOption[];
  customerOptions: SelectOption[];
  customerNameOptions: SelectOption[];
  divisionOptions: SelectOption[];
  documentNoOptions: DocumentOption[];

  customerIdRef: React.RefObject<HTMLDivElement | null>;
  customerNameRef: React.RefObject<HTMLDivElement | null>;
  divisionRef: React.RefObject<HTMLDivElement | null>;
  creditDocumentRef: React.RefObject<HTMLDivElement | null>;
  documentNoRef: React.RefObject<HTMLDivElement | null>;
  dateRef: React.RefObject<HTMLInputElement | null>;

  divisionLoading: boolean;

  handleCustomerIdChange: (id: string) => void | Promise<void>;
  handleCustomerNameChange: (name: string) => void | Promise<void>;
  handleDocumentNoChange: (docKey: string) => void;

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
    swapColumns?: boolean,
    idColumnHang?: number,
    alignToBox?: boolean,
  ) => React.ReactNode;

  handleKeyboardAction: (
    ...args: Parameters<
      typeof import("../../../hooks/useMatchKeyboard").handleKeyboardAction
    >
  ) => void;
}

const MatchEnquiryHeader: React.FC<MatchHeaderProps> = ({
  // branch,
  lkpCsAccountID,
  lkpCsAccountName,
  lkpDivision,
  lkpDocTypeNo,
  // receiptDate,

  setLkpDivision,

  customerOptions,
  customerNameOptions,
  divisionOptions,
  documentNoOptions,

  divisionLoading,

  customerIdRef,
  customerNameRef,
  divisionRef,
  creditDocumentRef,
  documentNoRef,
  dateRef,

  handleCustomerIdChange,
  handleCustomerNameChange,
  handleDocumentNoChange,

  renderSelect,
}) => {

  const navigate = useNavigate();

  return (
    <>
      {/* TITLE */}
      <div
        className="
          flex
          h-7.5
          items-center
          border-b
          border-slate-300
          bg-[#a3dfc0]
          pr-2
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
          Match Enquiry
        </span>

        <div className="ml-auto">
          <CloseButton onClose={() => navigate("/")} />
        </div>
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
            "lkpCsAccountID",
            lkpCsAccountID,
            customerOptions,
            handleCustomerIdChange,
            () => customerNameRef.current?.focus(),
            customerIdRef,
            false,
            ["Account ID", "Account Name"],
            customerIdListStyles, // the list runs under the ID box and the Name box
            false,
            false,
            false,
            undefined,
            true, // alignToBox: "Account Name" starts exactly under the Name box
          )}

          {/* CUSTOMER NAME */}
          {renderSelect(
            "lkpCsAccountName",
            lkpCsAccountName,
            customerNameOptions,
            handleCustomerNameChange,
            () => divisionRef.current?.focus(),
            customerNameRef,
            false,
            ["Account Name", "Account ID"],
            customerNameListStyles, // the box's width plus the hanging ID column
            false,
            false,
            false,
            120, // the ID column hangs out past the box's right edge
          )}

          {/* DOCUMENT AMOUNT */}
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
              lkpDivision,
              divisionOptions,
              setLkpDivision,
              () => creditDocumentRef.current?.focus(),
              divisionRef,
              false,
              // swapColumns shows the headers in the reverse order of this pair: "Division Name | Division ID"
              ["Division ID", "Division Name"],
              divisionListStyles, // the box's width plus the hanging ID column
              !lkpCsAccountID || divisionLoading || divisionOptions.length === 0,
              false,
              true, // swapColumns: the name first, then the ID
              80, // the ID column (a division id is short) hangs out past the box's right edge
            )}
          </div>





          {/* MATCH AMOUNT */}
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
              "lkpDocTypeNo.",
              lkpDocTypeNo,
              documentNoOptions,
              handleDocumentNoChange, // was setReceiptNo
              () => dateRef.current?.focus(),
              documentNoRef,
              false,
              undefined,
              documentNoListStyles, // only the document type and number, as wide as the box
              false,
              true,
            )}
          </div>

          <div />

          {/* BALANCE */}
        </div>
      </div>
    </>
  );
};

export default MatchEnquiryHeader;
