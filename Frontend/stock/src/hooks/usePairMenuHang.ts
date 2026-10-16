import { useState } from "react";

/* =========================================================
   WIDTH OF AN "ID | NAME" LIST THAT COVERS BOTH BOXES

   For a grid row (or a form line) with an ID box and a Name box side by
   side: the ID box's open list should reach the right edge of the Name box.
   `measure` reads the two boxes (by the inputId of their react-select) and
   returns through `hang` how far the ID list has to hang past its own box.

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
    const boxOf = (inputId: string) =>
      document.getElementById(inputId)?.closest('div[class$="-control"]');

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
