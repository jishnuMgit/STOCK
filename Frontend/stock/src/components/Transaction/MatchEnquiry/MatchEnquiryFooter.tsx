import React, { useEffect } from "react";
import ActionButton from "../../common/ActionButton";

interface MatchFooterProps {
  totalDebit: number;
  totalCredit: number;

  buttons: string[];

  actionRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;

  setActiveButton: React.Dispatch<React.SetStateAction<number>>;

  handleActionKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;

  executeAction: (index: number) => void;
}

const MatchEnquiryFooter: React.FC<MatchFooterProps> = ({
  totalDebit,
  totalCredit,
  buttons,
  actionRefs,
  setActiveButton,
  handleActionKeyDown,
  executeAction,
}) => {
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "p") {
        return;
      }

      const printIndex = buttons.indexOf("Print");
      if (printIndex === -1) return;

      event.preventDefault();
      event.stopPropagation();
      executeAction(printIndex);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [buttons, executeAction]);

  return (
    <>
      {/* TOTALS */}
      {/* The same columns as the table above (Parent/Child 10% | Br. ID 6% | Date 10% | Document No. 12% | Description |
          Debit 10% | Credit 10% | Match Date 12%), so the Debit and the Credit total sit exactly under their columns */}
      <div className="mx-6.75 grid grid-cols-[10%_6%_10%_12%_1fr_10%_10%_12%] items-center border border-transparent pt-2.5 max-[900px]:mx-2">
        {/* TOTAL: at the right end of the Description column, next to the Debit total */}
        <div className="col-start-5 mr-2 flex h-6.5 w-25 items-center justify-center justify-self-end border border-[#c8c8c8]">
          Total
        </div>

        {/* DEBIT (a small gap on each side keeps the two boxes apart; they still sit under their columns) */}
        <div className="mr-1.5 flex h-6.5 items-center justify-end border border-[#c8c8c8] px-2">
          {totalDebit.toFixed(2)}
        </div>

        {/* CREDIT */}
        <div className="ml-1.5 flex h-6.5 items-center justify-end border border-[#c8c8c8] px-2">
          {totalCredit.toFixed(2)}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-center gap-3.25 pt-2.25 pb-4 flex-wrap px-2">
        {buttons.map((label, index) => (
          <ActionButton
            key={label}
            id={label === "Print" ? "btnPrint" : "btnClear"}
            ref={(element) => {
              actionRefs.current[index] = element;
            }}
            label={label}
            underlineIndex={0}
            onFocus={() => setActiveButton(index)}
            onKeyDown={handleActionKeyDown}
            onClick={() => executeAction(index)}
          />
        ))}
      </div>
    </>
  );
};

export default MatchEnquiryFooter;
