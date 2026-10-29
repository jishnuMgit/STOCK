import { useEffect } from "react";

/* =========================================================
   CTRL+KEY SHORTCUTS

   The twin of useAltShortcuts, for the Ctrl keys of the old VB forms: Ctrl+P = Print on the report
   screens. Ctrl+P is also the browser's own "print this page", so the default is cancelled - the
   report screen decides what is printed.

   Window-level for the same reason as useAltShortcuts: react-select renders its open menu into a portal
   outside the page's DOM, so the key must be heard on window to work wherever focus is.

   No dependency array: runs after every render, so it always attaches with the latest handlers.

   Usage:
     useCtrlShortcuts({ p: handlePrint });
========================================================= */

type ShortcutMap = Record<string, () => void>;

export function useCtrlShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl alone (not Ctrl+Alt, not Ctrl+Shift), and not while a key is held down
      if (!event.ctrlKey || event.altKey || event.shiftKey || event.repeat) {
        return;
      }

      const handler = shortcuts[event.key.toLowerCase()];

      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
}
