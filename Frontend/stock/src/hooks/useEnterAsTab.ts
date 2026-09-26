import { useCallback } from "react";

/* =========================================================
   ENTER-AS-TAB

   Legacy VB-style data entry behavior: pressing Enter moves
   focus to the next field instead of doing nothing (these
   forms are plain <div>s, not <form>s, so Enter has no
   native effect otherwise).

   IMPORTANT: this must not hijack react-select's own Enter
   key handling (selecting a highlighted option while its
   menu is open). react-select calls preventDefault() on
   that keydown itself, so by checking e.defaultPrevented in
   the bubble phase (this handler sits on the outer wrapper,
   above every field), we only act when nothing already
   consumed the key.
========================================================= */

const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useEnterAsTab() {
  return useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter") return;
    if (e.defaultPrevented) return;

    const target = e.target as HTMLElement;

    if (target.tagName === "TEXTAREA") return;

    e.preventDefault();

    const container = e.currentTarget;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null);

    const currentIndex = focusable.indexOf(target);

    if (currentIndex > -1 && currentIndex < focusable.length - 1) {
      focusable[currentIndex + 1].focus();
    }
  }, []);
}
