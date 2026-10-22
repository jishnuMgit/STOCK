import React, { useEffect, useRef } from "react";

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmModalProps extends ConfirmOptions {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const focusStyle =
  "focus:outline-2! focus:outline-offset-1! focus:outline-green-600!";

const HotLabel: React.FC<{ text: string }> = ({ text }) => (
  <>
    <span className="underline decoration-green-600 decoration-1 underline-offset-2">
      {text.charAt(0)}
    </span>
    {text.slice(1)}
  </>
);

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Cancel is selected by default
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      // Tab / Shift+Tab: move between the buttons, stay inside the modal
      if (e.key === "Tab") {
        e.preventDefault();
        const buttons = Array.from(
          dialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) ?? [],
        );
        if (buttons.length === 0) return;

        const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.shiftKey
          ? i <= 0
            ? buttons.length - 1
            : i - 1
          : i === -1 || i === buttons.length - 1
            ? 0
            : i + 1;

        buttons[next].focus();
        return;
      }

      const key = e.key.toLowerCase();
      if (e.key === "Escape" || key === cancelLabel.charAt(0).toLowerCase()) {
        e.preventDefault();
        onCancel();
      } else if (key === confirmLabel.charAt(0).toLowerCase() && !busy) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, confirmLabel, cancelLabel, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        className="w-full max-w-sm overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800 shadow-lg outline-none"
      >
        <div className="flex h-7.5 items-center border-b border-slate-300 bg-[#a5e0c3] px-3">
          <h2
            id="confirm-modal-title"
            className="text-[15px] font-semibold text-slate-700"
          >
            {title}
          </h2>
        </div>

        <p
          id="confirm-modal-message"
          className="px-4 py-5 text-center text-[14px] text-[#263449]"
        >
          {message}
        </p>

        <div className="mb-3 flex justify-center gap-[12px]">
          <button
            type="button"
            id="btnConfirmYes"
            disabled={busy}
            onClick={onConfirm}
            className={`btn-style ${focusStyle}`}
          >
            <HotLabel text={confirmLabel} />
          </button>
          <button
            ref={cancelRef}
            type="button"
            id="btnConfirmNo"
            onClick={onCancel}
            className={`btn-style ${focusStyle}`}
          >
            <HotLabel text={cancelLabel} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
