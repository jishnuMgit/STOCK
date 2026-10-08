import React, { useEffect, useRef, useState } from "react";

// ============================================================
// TYPES
// ============================================================

type StaffRow = {
  id: string;
  staff: string;
  purchase: boolean;
  sales: boolean;
};

// ============================================================
// INITIAL DATA
// ============================================================

const initialRows: StaffRow[] = [
  {
    id: "01",
    staff: "MATHEW",
    purchase: true,
    sales: false,
  },
  {
    id: "02",
    staff: "MOHAN",
    purchase: false,
    sales: true,
  },
  {
    id: "03",
    staff: "JOSEPH",
    purchase: false,
    sales: true,
  },

  // Empty editable rows
  {
    id: "",
    staff: "",
    purchase: false,
    sales: false,
  },
  {
    id: "",
    staff: "",
    purchase: false,
    sales: false,
  },
  {
    id: "",
    staff: "",
    purchase: false,
    sales: false,
  },
  {
    id: "",
    staff: "",
    purchase: false,
    sales: false,
  },
  {
    id: "",
    staff: "",
    purchase: false,
    sales: false,
  },
  {
    id: "",
    staff: "",
    purchase: false,
    sales: false,
  },
];

const ROW_COUNT = initialRows.length;

// ============================================================
// COMPONENT
// ============================================================

const StaffPage: React.FC = () => {
  const [rows, setRows] = useState<StaffRow[]>(
    initialRows.map((row) => ({ ...row }))
  );

  const [selectedRow, setSelectedRow] = useState<number>(0);

  const firstIdRef = useRef<HTMLInputElement | null>(null);

  // ============================================================
  // UPDATE ID
  // ============================================================

  const updateId = (index: number, value: string) => {
    setRows((previousRows) => {
      const updatedRows = [...previousRows];

      updatedRows[index] = {
        ...updatedRows[index],
        id: value,
      };

      return updatedRows;
    });
  };

  // ============================================================
  // UPDATE STAFF
  // ============================================================

  const updateStaff = (index: number, value: string) => {
    setRows((previousRows) => {
      const updatedRows = [...previousRows];

      updatedRows[index] = {
        ...updatedRows[index],
        staff: value,
      };

      return updatedRows;
    });
  };

  // ============================================================
  // UPDATE PURCHASE
  // ============================================================

  const updatePurchase = (
    index: number,
    value: boolean
  ) => {
    setRows((previousRows) => {
      const updatedRows = [...previousRows];

      updatedRows[index] = {
        ...updatedRows[index],
        purchase: value,
      };

      return updatedRows;
    });
  };

  // ============================================================
  // UPDATE SALES
  // ============================================================

  const updateSales = (
    index: number,
    value: boolean
  ) => {
    setRows((previousRows) => {
      const updatedRows = [...previousRows];

      updatedRows[index] = {
        ...updatedRows[index],
        sales: value,
      };

      return updatedRows;
    });
  };

  // ============================================================
  // FOCUS ELEMENT
  // ============================================================

  const focusElement = (
    id: string
  ) => {
    requestAnimationFrame(() => {
      const element = document.getElementById(
        id
      ) as HTMLElement | null;

      if (element) {
        element.focus();
      }
    });
  };

  // ============================================================
  // MOVE TO NEXT ROW
  // ============================================================

  const moveToNextRow = (index: number) => {
    const nextIndex = index + 1;

    if (nextIndex < ROW_COUNT) {
      setSelectedRow(nextIndex);

      focusElement(`txtId-${nextIndex}`);
    }
  };

  // ============================================================
  // MOVE TO PREVIOUS ROW
  // ============================================================

  const moveToPreviousRow = (index: number) => {
    const previousIndex = index - 1;

    if (previousIndex >= 0) {
      setSelectedRow(previousIndex);

      focusElement(`txtId-${previousIndex}`);
    }
  };

  // ============================================================
  // KEYBOARD NAVIGATION
  // ============================================================

  const handleInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      moveToNextRow(index);

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      moveToNextRow(index);

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      moveToPreviousRow(index);

      return;
    }
  };

  // ============================================================
  // CHECKBOX KEYBOARD NAVIGATION
  // ============================================================

  const handleCheckboxKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();

      moveToNextRow(index);

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      moveToPreviousRow(index);

      return;
    }
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = () => {
    const filledRows = rows.filter(
      (row) =>
        row.id.trim() !== "" ||
        row.staff.trim() !== ""
    );

    console.log("Saved Staff:", filledRows);
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setRows(
      initialRows.map((row) => ({
        ...row,
      }))
    );

    setSelectedRow(0);

    requestAnimationFrame(() => {
      firstIdRef.current?.focus();
    });
  };

  // ============================================================
  // INITIAL FOCUS
  // ============================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      firstIdRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-white pt-[26px]">
      {/* ======================================================
          MAIN CONTAINER
      ====================================================== */}

      <div className="w-[830px] min-w-[830px] bg-white border border-gray-400">
        {/* ====================================================
            GREEN TITLE BAR
        ==================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
            <h1 className="ml-[15px] text-[17px] font-semibold text-[#374151]">
              Staff
            </h1>
          </div>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <div className="px-[14px]">
          <div className="w-full overflow-hidden">
            <table
              className="
                w-full
                table-fixed
                border-collapse
                text-[14px]
              "
            >
              {/* ==================================================
                  COLUMN WIDTHS
              ================================================== */}

              <colgroup>
                <col className="w-[37px]" />
                <col className="w-[76px]" />
                <col className="w-[346px]" />
                <col className="w-[101px]" />
                <col className="w-[100px]" />
              </colgroup>

              {/* ==================================================
                  HEADER
              ================================================== */}

              <thead>
                <tr className="h-[30px]">
                  {/* Selector */}

                  <th
                    className="
                      border
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      p-0
                    "
                  />

                  {/* ID */}

                  <th
                    className="
                      border
                      border-l-0
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      px-[11px]
                      py-0
                      text-left
                      font-semibold
                      text-[#374151]
                    "
                  >
                    ID
                  </th>

                  {/* Staff */}

                  <th
                    className="
                      border
                      border-l-0
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      px-[11px]
                      py-0
                      text-left
                      font-semibold
                      text-[#374151]
                    "
                  >
                    Staff
                  </th>

                  {/* Purchase */}

                  <th
                    className="
                      border
                      border-l-0
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      px-0
                      py-0
                      text-center
                      font-semibold
                      text-[#374151]
                    "
                  >
                    Purchase
                  </th>

                  {/* Sales */}

                  <th
                    className="
                      border
                      border-l-0
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      px-0
                      py-0
                      text-center
                      font-semibold
                      text-[#374151]
                    "
                  >
                    Sales
                  </th>
                </tr>
              </thead>

              {/* ==================================================
                  BODY
              ================================================== */}

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className={`
                      h-[30px] bg-white
                    `}
                    onClick={() =>
                      setSelectedRow(index)
                    }
                  >
                    {/* ==========================================
                        SELECTOR
                    ========================================== */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-t-0
                        border-[#bfe8d0]
                        p-0
                        text-center
                        align-middle
                      "
                    >
                      {selectedRow === index && (
                        <span className="text-[9px] text-[#222]">
                          ▶
                        </span>
                      )}
                    </td>

                    {/* ==========================================
                        ID
                    ========================================== */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-l-0
                        border-t-0
                        border-[#bfe8d0]
                        p-0
                        align-middle
                      "
                    >
                      <input
                        ref={
                          index === 0
                            ? firstIdRef
                            : undefined
                        }
                        id={`txtId-${index}`}
                        type="text"
                        value={row.id}
                        autoComplete="off"
                        onFocus={() =>
                          setSelectedRow(index)
                        }
                        onChange={(event) =>
                          updateId(
                            index,
                            event.target.value
                          )
                        }
                        onKeyDown={(event) =>
                          handleInputKeyDown(
                            event,
                            index
                          )
                        }
                        className="
                          h-[29px]
                          w-full
                          border-0
                          bg-transparent
                          px-[12px]
                          py-0
                          text-[14px]
                          text-[#374151]
                          outline-none
                          focus:bg-[#f1f8ff]
                        "
                      />
                    </td>

                    {/* ==========================================
                        STAFF
                    ========================================== */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-l-0
                        border-t-0
                        border-[#bfe8d0]
                        p-0
                        align-middle
                      "
                    >
                      <input
                        id={`txtStaff-${index}`}
                        type="text"
                        value={row.staff}
                        autoComplete="off"
                        onFocus={() =>
                          setSelectedRow(index)
                        }
                        onChange={(event) =>
                          updateStaff(
                            index,
                            event.target.value
                          )
                        }
                        onKeyDown={(event) =>
                          handleInputKeyDown(
                            event,
                            index
                          )
                        }
                        className="
                          h-[29px]
                          w-full
                          border-0
                          bg-transparent
                          px-[12px]
                          py-0
                          text-[14px]
                          text-[#374151]
                          outline-none
                          focus:bg-[#f1f8ff]
                        "
                      />
                    </td>

                    {/* ==========================================
                        PURCHASE
                    ========================================== */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-l-0
                        border-t-0
                        border-[#bfe8d0]
                        p-0
                        text-center
                        align-middle
                      "
                    >
                      <input
                        id={`chkPurchase-${index}`}
                        type="checkbox"
                        checked={row.purchase}
                        onChange={(event) =>
                          updatePurchase(
                            index,
                            event.target.checked
                          )
                        }
                        onFocus={() =>
                          setSelectedRow(index)
                        }
                        onKeyDown={(event) =>
                          handleCheckboxKeyDown(
                            event,
                            index
                          )
                        }
                        className="
                          h-[16px]
                          w-[16px]
                          cursor-pointer
                          appearance-none
                          rounded-[4px]
                          border
                          border-[#8fd6ad]
                          bg-white
                          align-middle
                          checked:bg-white
                          checked:after:content-['✓']
                          checked:after:block
                          checked:after:text-center
                          checked:after:text-[13px]
                          checked:after:font-bold
                          checked:after:leading-[14px]
                          checked:after:text-green-600
                        "
                      />
                    </td>

                    {/* ==========================================
                        SALES
                    ========================================== */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-l-0
                        border-t-0
                        border-[#bfe8d0]
                        p-0
                        text-center
                        align-middle
                      "
                    >
                      <input
                        id={`chkSales-${index}`}
                        type="checkbox"
                        checked={row.sales}
                        onChange={(event) =>
                          updateSales(
                            index,
                            event.target.checked
                          )
                        }
                        onFocus={() =>
                          setSelectedRow(index)
                        }
                        onKeyDown={(event) =>
                          handleCheckboxKeyDown(
                            event,
                            index
                          )
                        }
                        className="
                          h-[16px]
                          w-[16px]
                          cursor-pointer
                          appearance-none
                          rounded-[4px]
                          border
                          border-[#8fd6ad]
                          bg-white
                          align-middle
                          checked:bg-white
                          checked:after:content-['✓']
                          checked:after:block
                          checked:after:text-center
                          checked:after:text-[13px]
                          checked:after:font-bold
                          checked:after:leading-[14px]
                          checked:after:text-green-600
                        "
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ====================================================
            BUTTONS
        ==================================================== */}

        <div className="flex justify-center gap-[14px] py-[13px]">
          {/* SAVE */}

          <button
            type="button"
            onClick={handleSave}
            className="
             btn-style
            "
          >
           <u>S</u>ave
          </button>

          {/* CLEAR */}

          <button
            type="button"
            onClick={handleClear}
            className="
              btn-style
            "
          >
           <u>C</u>lear
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffPage;