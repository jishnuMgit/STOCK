import { useState } from "react";

/* =========================================================
   WIDTH OF AN "ID | NAME" LIST THAT COVERS BOTH BOXES

   For a grid row (or a form line) with two boxes side by side: the first box's
   open list should reach the right edge of the second one - the Name box for
   an ID list, or any later cell of the row (say the Unit Cost cell) for a Name
   list. `measure` reads the two elements (by id: the inputId of a react-select,
   or the id of an input in a grid cell) and gives through `hang` how far the list
   has to hang past its own box.

   Usage:
     const { hang, measure } = usePairMenuHang();
     <Select inputId="lkpItemID-0"
             styles={{ ...tableSelectStyles, ...makePairDividedMenuStyles(hang) }}
             components={itemIdComponents}              // makePairComponents(.., false, true)
             onMenuOpen={() => measure("lkpItemID-0", "lkpItemName-0")} ... />
========================================================= */

export function usePairMenuHang(initial = 330) {
  const [hang, setHang] = useState(initial);

  const measure = (idInputId: string, nameInputId: string) => {
    // a react-select is measured by its box, any other input by its grid cell
    const boxOf = (inputId: string) => {
      const element = document.getElementById(inputId);

      return (
        element?.closest('div[class$="-control"]') ??
        element?.closest("td") ??
        element
      );
    };

    const idBox = boxOf(idInputId);
    const nameBox = boxOf(nameInputId);

    if (idBox && nameBox) {
      setHang(
        Math.round(
          nameBox.getBoundingClientRect().right -
            idBox.getBoundingClientRect().right,
        ),
      );
    }
  };

  return { hang, measure };
}
