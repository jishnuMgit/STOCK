import { useEffect } from "react";

/* =========================================================
   ALT+KEY SHORTCUTS

   Global (window-level) keyboard shortcuts, e.g. Alt+S for
   Save, Alt+C for Clear - matching the underlined accelerator
   letter on each button.

   Deliberately window-level, not attached to a page's own
   root element: react-select renders its open menu into a
   portal appended to document.body, outside the page's own
   DOM subtree, so a keydown handler scoped to the page's
   container never sees the key press while a dropdown (or
   its search box) has focus. Listening on window sidesteps
   that entirely - the shortcut fires no matter where focus
   currently is, as long as this page is mounted.

   No dependency array: runs after every render, so it always
   attaches with the latest versions of the handlers passed in
   (avoids stale closures) - attach/detach cost is negligible.

   Usage:
     useAltShortcuts({ s: handleSave, c: handleClear });
========================================================= */

type ShortcutMap = Record<string, () => void>;

export function useAltShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) {
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
