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

// tabindex="-1" means "not part of the keyboard flow" (e.g. a delete X or a
// read-only box) - Enter skips those, just like Tab does.
const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

// A group of radio buttons is ONE stop, as it is for the Tab key: the chosen radio (the arrow keys
// move inside the group). A group with none chosen stops at its first radio.
const isRadioStop = (element: HTMLElement, container: HTMLElement) => {
  if (!(element instanceof HTMLInputElement) || element.type !== "radio") return true;

  if (element.checked) return true;

  const group = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  ).filter((radio) => radio.name === element.name);

  return !group.some((radio) => radio.checked) && group[0] === element;
};

export function useEnterAsTab() {
  return useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter") return;
    if (e.defaultPrevented) return;

    const target = e.target as HTMLElement;

    if (target.tagName === "TEXTAREA") return;

    // Enter on a button presses it (Print, Save ...): it must not be taken for "go on"
    if (target.tagName === "BUTTON") return;

    e.preventDefault();

    const container = e.currentTarget;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null && isRadioStop(el, container));

    const currentIndex = focusable.indexOf(target);

    if (currentIndex > -1 && currentIndex < focusable.length - 1) {
      focusable[currentIndex + 1].focus();
    }
  }, []);
}
