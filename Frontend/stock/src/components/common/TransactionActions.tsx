import { useCallback, useRef } from "react";

import ActionButton from "./ActionButton";

// THE ACTION BUTTONS OF A TRANSACTION SCREEN - the same buttons as the Payment screen (components/common/ActionButton.tsx:
// the green text with the underlined letter), and the same keyboard:
//
//   Ctrl+S Save / Modify   Ctrl+F Find   Ctrl+D Delete   Ctrl+P Print   Alt+T Post
//
// (Payment uses Ctrl+T for Post, but Chrome keeps Ctrl+T for "new tab" and never gives it to the page, so Post is Alt+T.)
// The underlined letter of each button is its letter in that list (Post has its T underlined). The keys are
// handled by the page itself (hooks/useCtrlShortcuts.ts: Ctrl+P must print the open Print Preview, Save and Delete are
// off while it is open ...); this part draws the buttons and moves between them with the arrow keys, as Payment does.

export interface TransactionAction {
  id: string;
  label: string;
  // the letter to underline (its place in the label): 0 = the first letter. Leave it out for none.
  underlineIndex?: number;
  onClick: () => void;
  disabled?: boolean;
}

interface TransactionActionsProps {
  actions: TransactionAction[];
  className?: string;
}

const TransactionActions = ({
  actions,
  className = "mt-[14px] flex shrink-0 flex-wrap items-center justify-center gap-3",
}: TransactionActionsProps) => {
  const rowRef = useRef<HTMLDivElement | null>(null);

  // the arrow keys move from button to button (the buttons that are switched off are skipped); Enter presses the one
  // the cursor is on - and is not taken by the page's Enter-as-Tab
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    const move = (step: number) => {
      const buttons = Array.from(rowRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const at = buttons.indexOf(event.currentTarget);
      if (buttons.length === 0 || at < 0) return;

      event.preventDefault();
      event.stopPropagation();
      buttons[(at + step + buttons.length) % buttons.length].focus();
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        move(1);
        break;

      case "ArrowLeft":
      case "ArrowUp":
        move(-1);
        break;

      case "Enter":
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.click();
        break;

      default:
        break;
    }
  }, []);

  return (
    <div ref={rowRef} className={className}>
      {actions.map((action) => (
        <ActionButton
          key={action.id}
          id={action.id}
          label={action.label}
          underlineIndex={action.underlineIndex}
          disabled={action.disabled}
          onKeyDown={handleKeyDown}
          onClick={action.onClick}
        />
      ))}
    </div>
  );
};

export default TransactionActions;
