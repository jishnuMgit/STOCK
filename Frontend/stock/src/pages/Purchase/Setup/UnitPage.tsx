import React, { useEffect, useRef, useState } from "react";

// ============================================================
// TYPES
// ============================================================

type UnitRow = {
  unit: string;
};

// ============================================================
// INITIAL ROWS
// ============================================================

const initialRows: UnitRow[] = [
  { unit: "BOX." },
  { unit: "MTR." },
  { unit: "NOS." },
  { unit: "ROLL." },
  { unit: "" },
  { unit: "" },
  { unit: "" },
  { unit: "" },
  { unit: "" },
  { unit: "" },
];

const ROW_COUNT = 10;

// ============================================================
// COMPONENT
// ============================================================

const UnitPage: React.FC = () => {
  const [rows, setRows] = useState<UnitRow[]>(initialRows);
  const [selectedRow, setSelectedRow] = useState<number>(3);

  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // ============================================================
  // UPDATE UNIT
  // ============================================================

  const updateUnit = (index: number, value: string) => {
    setRows((previousRows) => {
      const updatedRows = [...previousRows];

      updatedRows[index] = {
        ...updatedRows[index],
        unit: value,
      };

      return updatedRows;
    });
  };

  // ============================================================
  // FOCUS ROW
  // ============================================================

  const focusRow = (index: number) => {
    if (index < 0 || index >= ROW_COUNT) {
      return;
    }

    requestAnimationFrame(() => {
      const input = document.getElementById(
        `txtUnit-${index}`
      ) as HTMLInputElement | null;

      if (input) {
        input.focus();

        const length = input.value.length;
        input.setSelectionRange(length, length);

        setSelectedRow(index);
      }
    });
  };

  // ============================================================
  // NEXT ROW
  // ============================================================

  const moveToNextRow = (index: number) => {
    const nextIndex = index + 1;

    if (nextIndex < ROW_COUNT) {
      focusRow(nextIndex);
    }
  };

  // ============================================================
  // PREVIOUS ROW
  // ============================================================

  const moveToPreviousRow = (index: number) => {
    const previousIndex = index - 1;

    if (previousIndex >= 0) {
      focusRow(previousIndex);
    }
  };

  // ============================================================
  // KEYBOARD NAVIGATION
  // ============================================================

  const handleUnitKeyDown = (
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
  // SAVE
  // ============================================================

  const handleSave = () => {
    const filledRows = rows.filter(
      (row) => row.unit.trim() !== ""
    );

    console.log("Saved Units:", filledRows);
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setRows(initialRows.map((row) => ({ ...row })));
    setSelectedRow(0);

    requestAnimationFrame(() => {
      firstInputRef.current?.focus();
    });
  };

  // ============================================================
  // INITIAL FOCUS
  // ============================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.getElementById(
        `txtUnit-${selectedRow}`
      ) as HTMLInputElement | null;

      input?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      {/* ======================================================
          MAIN CONTAINER
      ====================================================== */}

      <div className="w-full max-w-[530px] border border-gray-400 bg-white">
        {/* ====================================================
            GREEN HEADER
        ==================================================== */}

        <div className="flex h-[30px] items-center border-b border-slate-400 bg-[#a3dfc0]">
          <span className="px-2 text-[18px] font-semibold text-slate-800">
            Unit
          </span>
        </div>

        {/* ====================================================
            TABLE AREA
        ==================================================== */}

        <div className="mx-[13px] h-[305px] overflow-hidden border border-[#bfe8d0]">
          <div
            className="
              h-full
              overflow-y-auto
              overflow-x-hidden
              scrollbar-thin
              scrollbar-thumb-[#9ad9b7]
              scrollbar-track-[#f5faf7]
            "
          >
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
                <col className="w-[38px]" />
                <col />
              </colgroup>

              {/* ==================================================
                  TABLE HEADER
              ================================================== */}

              <thead>
                <tr>
                  <th
                    className="
                      sticky
                      top-0
                      z-20
                      h-[34px]
                      border
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      p-0
                    "
                  />

                  <th
                    className="
                      sticky
                      top-0
                      z-20
                      h-[34px]
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
                    Unit
                  </th>
                </tr>
              </thead>

              {/* ==================================================
                  TABLE BODY

                  EVERY ROW HAS AN INPUT
              ================================================== */}

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className={`
                      h-[34px]
                      ${
                        selectedRow === index
                          ? "bg-[#f8fcfa]"
                          : "bg-white"
                      }
                    `}
                    onClick={() => setSelectedRow(index)}
                  >
                    {/* ==========================================
                        SELECTOR COLUMN
                    ========================================== */}

                    <td
                      className="
                        h-[34px]
                        w-[38px]
                        border
                        border-[#bfe8d0]
                        bg-white
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
                        UNIT COLUMN
                    ========================================== */}

                    <td
                      className="
                        h-[34px]
                        border
                        border-l-0
                        border-[#bfe8d0]
                        bg-white
                        p-0
                        align-middle
                      "
                    >
                      <input
                        ref={
                          index === 0
                            ? firstInputRef
                            : undefined
                        }
                        id={`txtUnit-${index}`}
                        type="text"
                        value={row.unit}
                        autoComplete="off"
                        onFocus={() =>
                          setSelectedRow(index)
                        }
                        onChange={(event) =>
                          updateUnit(
                            index,
                            event.target.value
                          )
                        }
                        onKeyDown={(event) =>
                          handleUnitKeyDown(
                            event,
                            index
                          )
                        }
                        className="
                          h-[32px]
                          w-full
                          border-0
                          bg-transparent
                          px-[11px]
                          py-0
                          text-left
                          text-[14px]
                          text-[#374151]
                          outline-none
                          focus:bg-[#f1f8ff]
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

        <div className="flex justify-center gap-[14px] py-[16px]">
          {/* SAVE */}

          <button
            type="button"
            onClick={handleSave}
            className="
                btn-style
            "
          >
            <span className="underline">
              S
            </span>ave
          </button>

          {/* CLEAR */}

          <button
            type="button"
            onClick={handleClear}
            className="
             btn-style
            "
          >
            <span className="underline">
              C
            </span>lear
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnitPage;