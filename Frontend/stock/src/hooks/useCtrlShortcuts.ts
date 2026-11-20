import { useEffect } from "react";

/* =========================================================
   CTRL+KEY SHORTCUTS

   The same as useAltShortcuts (hooks/useAltShortcuts.ts), but for
   Ctrl+key: Ctrl+S Save / Modify, Ctrl+D Delete, Ctrl+P Print.

   Window-level, so it works wherever the focus is (also inside an
   open react-select list). The browser's own meaning of the key
   (save the page, bookmark, print) is stopped with preventDefault.
   Alt and Meta must not be held, so Alt+Ctrl keys are left alone.

   No dependency array: runs after every render, so it always
   attaches with the latest handlers passed in.

   Usage:
     useCtrlShortcuts({ s: handleSave, d: handleDelete, p: handlePrint });
========================================================= */

type ShortcutMap = Record<string, () => void>;

export function useCtrlShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.metaKey) {
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
