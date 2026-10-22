import React, { useCallback, useEffect, useRef, useState } from "react";

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

/* First letter underlined, same as the footer buttons */
const HotLabel: React.FC<{ text: string }> = ({ text }) => (
  <>
    <span className="underline decoration-green-600 decoration-1 underline-offset-2">
      {text.charAt(0)}
    </span>
    {text.slice(1)}
  </>
);

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        className="w-full max-w-sm overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800 shadow-lg"
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
            ref={confirmRef}
            type="button"
            id="btnConfirmYes"
            disabled={busy}
            onClick={onConfirm}
            className="btn-style"
          >
            <HotLabel text={confirmLabel} />
          </button>
          <button
            type="button"
            id="btnConfirmNo"
            onClick={onCancel}
            className="btn-style"
          >
            <HotLabel text={cancelLabel} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* Promise based helper:  if (!(await confirm({ message: "..." }))) return; */
export const useConfirm = () => {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ options, resolve })),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      state?.resolve(result);
      setState(null);
    },
    [state],
  );

  const dialog = (
    <ConfirmModal
      open={state !== null}
      title={state?.options.title}
      message={state?.options.message}
      confirmLabel={state?.options.confirmLabel}
      cancelLabel={state?.options.cancelLabel}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, dialog };
};

export default ConfirmModal;
