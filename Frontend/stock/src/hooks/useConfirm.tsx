import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* =========================================================
   CONFIRM DIALOG

   Looks like the browser's own window.confirm popup, but
   opens with Cancel focused (window.confirm always focuses
   OK and the browser gives no way to change that).

   Usage:
     const { confirm, confirmDialog } = useConfirm();
     const ok = await confirm("Are you sure you want to delete?");
     ...
     return (<div> ... {confirmDialog} </div>);
========================================================= */

export function useConfirm() {
  const [message, setMessage] = useState<string | null>(null);

  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const okButtonRef = useRef<HTMLButtonElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback(
    (text: string) =>
      new Promise<boolean>((resolve) => {
        previousFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        resolverRef.current = resolve;
        setMessage(text);
      }),
    []
  );

  const close = (result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setMessage(null);

    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keep keys inside the dialog: the page behind it has its own
    // Enter-as-Tab handler that would otherwise see these events.
    e.stopPropagation();

    if (e.key === "Escape") {
      e.preventDefault();
      close(false);
      return;
    }

    // Only two buttons: Tab / Shift+Tab just toggles between them.
    if (e.key === "Tab") {
      e.preventDefault();

      if (document.activeElement === cancelButtonRef.current) {
        okButtonRef.current?.focus();
      } else {
        cancelButtonRef.current?.focus();
      }
    }
  };

  const buttonBase = `
    h-[40px]
    rounded-full
    px-6
    text-[14px]
    font-medium
    focus:outline
    focus:outline-2
    focus:outline-offset-2
    focus:outline-[#67508a]
  `;

  const confirmDialog =
    message !== null
      ? createPortal(
          <div
            className="fixed inset-0 z-[100000] flex items-start justify-center bg-black/30 pt-3"
            onKeyDown={handleKeyDown}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={message}
              className="w-[420px] max-w-[92vw] rounded-[24px] bg-[#fdf8ff] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
            >
              <p className="text-[16px] font-semibold text-[#1d1b20]">
                {window.location.host} says
              </p>

              <p className="mt-3 text-[14px] text-[#1d1b20]">{message}</p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  ref={okButtonRef}
                  type="button"
                  onClick={() => close(true)}
                  className={`${buttonBase} bg-[#67508a] text-white hover:bg-[#5a4479]`}
                >
                  OK
                </button>

                <button
                  ref={cancelButtonRef}
                  type="button"
                  autoFocus
                  onClick={() => close(false)}
                  className={`${buttonBase} bg-[#eddcff] text-[#4a3268] hover:bg-[#e2cdfa]`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return { confirm, confirmDialog };
}
