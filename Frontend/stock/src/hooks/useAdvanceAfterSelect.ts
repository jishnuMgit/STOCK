import { useCallback } from "react";

/* =========================================================
   ON TO THE NEXT FIELD AFTER A DROPDOWN

   react-select keeps the cursor in its box after you pick an option with Enter,
   Tab or a click (and for Enter / Tab it also blocks the normal move), so a data
   entry grid needs a second key press to go on. This hook moves the cursor on, the
   way the old VB grids did, within the same grid row (or form):

     advanceAfterPick(fromInputId, skipInputIds?)
         call it from the dropdown's onChange: the cursor goes to the next box
         after `fromInputId` that can be typed in - read-only and disabled boxes are
         skipped, and so are the ids in skipInputIds (the partner dropdown that the
         pick has just filled, e.g. the Item Name box after the Item ID box).

     advanceOnEnter(event, skipInputIds?)
         put it on the onKeyDown of the cell around a dropdown: Enter on a CLOSED
         dropdown that already has a value goes on as well. While the list is open
         react-select has already used the Enter, so this does nothing then.

   Usage (a grid row):
     const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

     <td onKeyDown={(e) => advanceOnEnter(e, [`lkpItemName-${index}`])}>
       <Select inputId={`lkpItemID-${index}`}
               onChange={(option) => {
                 pick(option);
                 if (option) advanceAfterPick(`lkpItemID-${index}`, [`lkpItemName-${index}`]);
               }} ... />
========================================================= */

// what the keyboard can go to: not disabled, not read-only, not tabindex="-1"
const TYPEABLE_SELECTOR =
  'input:not([disabled]):not([readonly]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([readonly]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])';

const focusNextAfter = (from: HTMLElement, skipInputIds: string[]) => {
  // the grid row if there is one, else the whole form / page
  const scope: ParentNode =
    from.closest("tr") ?? from.closest("form") ?? document.body;

  const candidates = Array.from(
    scope.querySelectorAll<HTMLElement>(TYPEABLE_SELECTOR)
  ).filter((element) => element.offsetParent !== null);

  const position = candidates.indexOf(from);

  if (position === -1) return;

  const next = candidates
    .slice(position + 1)
    .find((element) => !skipInputIds.includes(element.id));

  next?.focus();
};

export function useAdvanceAfterSelect() {
  // after a pick: wait one tick so the page has taken the new value first
  const advanceAfterPick = useCallback(
    (fromInputId: string, skipInputIds: string[] = []) => {
      window.setTimeout(() => {
        const from = document.getElementById(fromInputId);

        if (from) focusNextAfter(from, skipInputIds);
      }, 0);
    },
    []
  );

  const advanceOnEnter = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, skipInputIds: string[] = []) => {
      if (event.key !== "Enter" || event.defaultPrevented) return;

      const target = event.target as HTMLElement;

      // only a dropdown that has a value (react-select draws it as ...-singleValue)
      const control = target.closest('div[class$="-control"]');

      if (!control || !control.querySelector('div[class$="-singleValue"]')) {
        return;
      }

      event.preventDefault();
      focusNextAfter(target, skipInputIds);
    },
    []
  );

  return { advanceAfterPick, advanceOnEnter };
}
