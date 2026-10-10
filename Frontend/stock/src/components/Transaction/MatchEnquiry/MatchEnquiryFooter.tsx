
import React from "react";
import { handleKeyboardAction } from "../../../hooks/useMatchKeyboard";

interface MatchFooterProps {
  noteRef: React.RefObject<HTMLInputElement | null>;

  focusSave: () => void;

  documentAmount: number;
  totalMatchAmount: number;
  balance: number;

  buttons: string[];

  actionRefs: React.MutableRefObject<
    (HTMLButtonElement | null)[]
  >;

  setActiveButton: React.Dispatch<
    React.SetStateAction<number>
  >;

  handleActionKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => void;

  executeAction: (index: number) => void;
}

const MatchEnquiryFooter: React.FC<MatchFooterProps> = ({
  noteRef,
  focusSave,
  documentAmount,
  totalMatchAmount,
  balance,
  buttons,
  actionRefs,
  setActiveButton,
  handleActionKeyDown,
  executeAction,
}) => {
  return (
    <>
      {/* =================================================
          NOTE + TOTAL
      ================================================= */}

    <div
  className="
    flex
    items-center
    justify-end
    px-6.75
    pt-2.5
    mr-33
    gap-3
    max-[900px]:flex-wrap
    max-[900px]:px-2
  "
>
  {/* TOTALS */}
  <div
    className="
      flex
      items-center
      gap-1.75
    "
  >
    <div className="flex items-center gap-2">
      {/* TOTAL LABEL */}
      <div
        className="
          mr-1
          flex
          h-6.5
          w-25
          items-center
          justify-center
          border
          border-[#c8c8c8]
        "
      >
        Total
      </div>

      {/* DEBIT AMOUNT */}
      <div
        className="
          flex
          h-6.5
          w-27.5
          items-center
          justify-end
          border
          border-[#c8c8c8]
          px-2
        "
      >
        {totalMatchAmount.toFixed(2)}
      </div>
    </div>

    {/* CREDIT AMOUNT */}
    <div
      className="
        ml-0
        flex
        h-6.5
        w-27.5
        items-center
        justify-end
        border
        border-[#c8c8c8]
        px-2
      "
    >
      {balance.toFixed(2)}
    </div>
  </div>
</div>

      {/* =================================================
          DIFFERENCE
      ================================================= */}

     

      {/* =================================================
          ACTION BUTTONS
      ================================================= */}

     

<div
  className="
    flex
    items-center
    justify-center
    gap-3.25
    pt-2.25
    pb-6
    flex-wrap
    px-2
  "
>
  {buttons.map((label, index) => (
    <button
      key={label}
      id={
        label === "Print"
          ? "btnPrint"
          : label === "Delete"
            ? "btnDelete"
            : "btnClear"
      }
      ref={(element) => {
        actionRefs.current[index] = element;
      }}
      type="button"
      className="btn-style"
      onFocus={() => setActiveButton(index)}
      onKeyDown={handleActionKeyDown}
      onClick={() => executeAction(index)}
    >
      <span
        className="
          bg-linear-to-b
          from-[#145c34]
          via-[#20884e]
          to-[#8fd9ad]
          bg-clip-text
          font-medium
          text-transparent
        "
      >
        <span className="underline decoration-2 underline-offset-1">
          {label.charAt(0)}
        </span>
        {label.slice(1)}
      </span>
    </button>
  ))}
</div>
    </>
  );
};

export default MatchEnquiryFooter;
