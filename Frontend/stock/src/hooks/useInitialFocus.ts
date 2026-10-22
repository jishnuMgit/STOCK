import { useEffect, useRef } from "react";

/* =========================================================
   WHERE THE CURSOR STARTS

   A page's first load (the branch list, the user's default branch ...) is
   asynchronous, so a plain autoFocus would run before the page knows what is
   already filled in. This hook waits for that load, then puts the cursor on the
   field the page names - once only, so a later reload or change never takes the
   cursor away from what the user is doing.

     useInitialFocus(ready, targetId)
         ready     true once the first load has finished (success or failure)
         targetId  the element id (or react-select inputId) to focus, chosen from
                   what has loaded

   Usage (Stock Transfer: Entry No. when a branch is already chosen, else Branch):
     useInitialFocus(branchesLoaded, lkpBranch ? "txtDocNo" : "lkpBranch");
========================================================= */

export function useInitialFocus(ready: boolean, targetId: string) {
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return;

    done.current = true;

    // after the page has been drawn with what the load filled in
    window.setTimeout(() => document.getElementById(targetId)?.focus(), 0);
  }, [ready, targetId]);
}
