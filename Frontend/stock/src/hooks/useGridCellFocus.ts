/* =========================================================
   WHERE THE CURSOR IS, IN A GRID

   What the Purchase Invoice grid does, ready for any grid: the cell the cursor is in
   gets a green outline (it follows the cursor, with no state), and a box that is
   typed in has its text selected when the cursor arrives, so typing replaces it.

     const { cellFocusClass, selectOnFocus } = useGridCellFocus();

     <td className={`border border-[#bfe8d0] p-0 ${cellFocusClass}`}>   // a cell with a box in it
       <input onFocus={selectOnFocus} ... />

   The outline is pure CSS (focus-within), so it also works for a dropdown
   (react-select) in the cell - there is nothing to switch on or off.
========================================================= */

// outlined while the cursor is anywhere inside the cell
export const GRID_CELL_FOCUS_CLASS =
  "focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-green-600";

export const selectOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
  event.currentTarget.select();
};

export function useGridCellFocus() {
  return { cellFocusClass: GRID_CELL_FOCUS_CLASS, selectOnFocus };
}
