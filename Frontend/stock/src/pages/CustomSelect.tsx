import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

export interface AccountOption {
  value: string;
  label: string;
  accountId: string;
  accountName: string;
  gcs?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export type CustomSelectOption =
  | AccountOption
  | SelectOption;

/* =========================================================
   REF
========================================================= */

export interface CustomSelectRef {
  focus: () => void;
  open: () => void;
  close: () => void;
}

/* =========================================================
   PROPS
========================================================= */

interface CustomSelectProps {
  options: CustomSelectOption[];

  value: CustomSelectOption | null;

  onChange: (
    option: CustomSelectOption
  ) => void;

  placeholder?: string;

  disabled?: boolean;

  displayMode?: "id" | "name" | "normal";

  /*
   * Called when Enter is pressed while
   * the dropdown is CLOSED.
   *
   * ReceiptTable uses this to move
   * to the next field.
   */
  onClosedEnter?: () => void;

  /*
   * Called when Escape is pressed while
   * dropdown is CLOSED.
   */
  onClosedEscape?: () => void;

  onFocus?: () => void;

  className?: string;
}

/* =========================================================
   TYPE HELPERS
========================================================= */

const isAccountOption = (
  option: CustomSelectOption
): option is AccountOption => {
  return (
    "accountId" in option &&
    "accountName" in option
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const CustomSelect = forwardRef<
  CustomSelectRef,
  CustomSelectProps
>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "",
      disabled = false,
      displayMode = "normal",
      onClosedEnter,
      onClosedEscape,
      onFocus,
      className = "",
    },
    ref
  ) => {
    /* =====================================================
       STATE
    ===================================================== */

    const [open, setOpen] =
      useState(false);

    const [search, setSearch] =
      useState("");

    const [
      highlightedIndex,
      setHighlightedIndex,
    ] = useState(0);

    /* =====================================================
       REFS
    ===================================================== */

    const wrapperRef =
      useRef<HTMLDivElement>(null);

    const inputRef =
      useRef<HTMLInputElement>(null);

    const optionRefs =
      useRef<
        (HTMLDivElement | null)[]
      >([]);

    /* =====================================================
       FILTER
    ===================================================== */

    const filteredOptions =
      options.filter((option) => {
        const text =
          search
            .trim()
            .toLowerCase();

        if (!text) {
          return true;
        }

        if (
          isAccountOption(option)
        ) {
          return (
            option.accountId
              .toLowerCase()
              .includes(text) ||
            option.accountName
              .toLowerCase()
              .includes(text)
          );
        }

        return (
          option.value
            .toLowerCase()
            .includes(text) ||
          option.label
            .toLowerCase()
            .includes(text)
        );
      });

    /* =====================================================
       OPEN
    ===================================================== */

    const openDropdown =
      () => {
        if (disabled) {
          return;
        }

        setOpen(true);
        setSearch("");

        const currentIndex =
          options.findIndex(
            (option) => {
              if (!value) {
                return false;
              }

              return (
                option.value ===
                value.value
              );
            }
          );

        setHighlightedIndex(
          currentIndex >= 0
            ? currentIndex
            : 0
        );

        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      };

    /* =====================================================
       CLOSE
    ===================================================== */

    const closeDropdown =
      () => {
        setOpen(false);
        setSearch("");
      };

    /* =====================================================
       SELECT
    ===================================================== */

    const selectOption = (
      option: CustomSelectOption
    ) => {
      onChange(option);

      closeDropdown();
    };

    /* =====================================================
       IMPERATIVE REF
    ===================================================== */

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          inputRef.current?.focus();
        },

        open: () => {
          openDropdown();
        },

        close: () => {
          closeDropdown();
        },
      }),
      [disabled, value, options]
    );

    /* =====================================================
       KEYBOARD
    ===================================================== */

    const handleKeyDown =
      (
        event: React.KeyboardEvent
      ) => {
        /* =================================================
           CLOSED
        ================================================= */

        if (!open) {
          /* ---------------------------------------------
             ENTER

             IMPORTANT:
             Enter on closed dropdown does NOT open it.

             It moves to the next field.
          --------------------------------------------- */

          if (
            event.key === "Enter"
          ) {
            event.preventDefault();
            event.stopPropagation();

            onClosedEnter?.();

            return;
          }

          /* ---------------------------------------------
             ARROWDOWN
          --------------------------------------------- */

          if (
            event.key === "ArrowDown"
          ) {
            event.preventDefault();
            event.stopPropagation();

            openDropdown();

            return;
          }

          /* ---------------------------------------------
             F4
          --------------------------------------------- */

          if (
            event.key === "F4"
          ) {
            event.preventDefault();
            event.stopPropagation();

            openDropdown();

            return;
          }

          /* ---------------------------------------------
             ESCAPE
          --------------------------------------------- */

          if (
            event.key === "Escape"
          ) {
            event.preventDefault();
            event.stopPropagation();

            onClosedEscape?.();

            return;
          }

          return;
        }

        /* =================================================
           OPEN
        ================================================= */

        /* -----------------------------------------------
           ESCAPE
        ----------------------------------------------- */

        if (
          event.key === "Escape"
        ) {
          event.preventDefault();
          event.stopPropagation();

          closeDropdown();

          return;
        }

        /* -----------------------------------------------
           ARROWDOWN
        ----------------------------------------------- */

        if (
          event.key === "ArrowDown"
        ) {
          event.preventDefault();

          setHighlightedIndex(
            (current) =>
              Math.min(
                current + 1,
                filteredOptions.length -
                  1
              )
          );

          return;
        }

        /* -----------------------------------------------
           ARROWUP
        ----------------------------------------------- */

        if (
          event.key === "ArrowUp"
        ) {
          event.preventDefault();

          setHighlightedIndex(
            (current) =>
              Math.max(
                current - 1,
                0
              )
          );

          return;
        }

        /* -----------------------------------------------
           ENTER

           When OPEN:
           select highlighted option.
        ----------------------------------------------- */

        if (
          event.key === "Enter"
        ) {
          event.preventDefault();
          event.stopPropagation();

          const option =
            filteredOptions[
              highlightedIndex
            ];

          if (option) {
            selectOption(option);
          }

          return;
        }

        /* -----------------------------------------------
           HOME
        ----------------------------------------------- */

        if (
          event.key === "Home"
        ) {
          event.preventDefault();

          setHighlightedIndex(0);

          return;
        }

        /* -----------------------------------------------
           END
        ----------------------------------------------- */

        if (
          event.key === "End"
        ) {
          event.preventDefault();

          setHighlightedIndex(
            Math.max(
              filteredOptions.length -
                1,
              0
            )
          );

          return;
        }

        /* -----------------------------------------------
           TAB
        ----------------------------------------------- */

        if (
          event.key === "Tab"
        ) {
          closeDropdown();
        }
      };

    /* =====================================================
       SEARCH RESET
    ===================================================== */

    useEffect(() => {
      setHighlightedIndex(0);
    }, [search]);

    /* =====================================================
       AUTO SCROLL
    ===================================================== */

    useEffect(() => {
      if (!open) {
        return;
      }

      const element =
        optionRefs.current[
          highlightedIndex
        ];

      element?.scrollIntoView({
        block: "nearest",
      });
    }, [
      highlightedIndex,
      open,
    ]);

    /* =====================================================
       CLICK OUTSIDE
    ===================================================== */

    useEffect(() => {
      const handleClickOutside =
        (event: MouseEvent) => {
          if (
            wrapperRef.current &&
            !wrapperRef.current.contains(
              event.target as Node
            )
          ) {
            closeDropdown();
          }
        };

      document.addEventListener(
        "mousedown",
        handleClickOutside
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handleClickOutside
        );
      };
    }, []);

    /* =====================================================
       DISPLAY VALUE
    ===================================================== */

    let displayValue = "";

    if (value) {
      if (
        displayMode === "id" &&
        isAccountOption(value)
      ) {
        displayValue =
          value.accountId;
      } else if (
        displayMode === "name" &&
        isAccountOption(value)
      ) {
        displayValue =
          value.accountName;
      } else {
        displayValue =
          value.label;
      }
    }

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <div
        ref={wrapperRef}
        className={`custom-select ${className}`}
      >
        {/* =================================================
            CONTROL
        ================================================= */}

        <div className="custom-select-control">
          <input
            ref={inputRef}
            className="custom-select-input"
            value={
              open
                ? search
                : displayValue
            }
            placeholder={placeholder}
            disabled={disabled}
            readOnly={!open}
            onFocus={() => {
              onFocus?.();
            }}
            onClick={() => {
              if (!open) {
                openDropdown();
              }
            }}
            onChange={(event) => {
              setSearch(
                event.target.value
              );
            }}
            onKeyDown={
              handleKeyDown
            }
          />

          <button
            type="button"
            className="custom-select-arrow"
            disabled={disabled}
            tabIndex={-1}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              if (open) {
                closeDropdown();
              } else {
                openDropdown();
              }
            }}
          >
            {open ? "▲" : "▼"}
          </button>
        </div>

        {/* =================================================
            MENU
        ================================================= */}

        {open && (
          <div className="custom-select-menu">

            {/* =============================================
                HEADER
            ============================================= */}

            <div className="custom-select-header">

              {displayMode ===
              "id" ? (
                <>
                  <div className="custom-id-column">
                    Account ID
                  </div>

                  <div className="custom-name-column">
                    Account Name
                  </div>
                </>
              ) : displayMode ===
                "name" ? (
                <>
                  <div className="custom-name-column">
                    Account Name
                  </div>

                  <div className="custom-id-column">
                    Account ID
                  </div>
                </>
              ) : (
                <div className="custom-normal-column">
                  {placeholder ||
                    "Select"}
                </div>
              )}

            </div>

            {/* =============================================
                OPTIONS
            ============================================= */}

            <div className="custom-select-list">

              {filteredOptions.length ===
              0 ? (

                <div className="custom-no-result">
                  No Data Found
                </div>

              ) : (

                filteredOptions.map(
                  (
                    option,
                    index
                  ) => {
                    const highlighted =
                      index ===
                      highlightedIndex;

                    const selected =
                      option.value ===
                      value?.value;

                    return (
                      <div
                        key={`${option.value}-${index}`}
                        ref={(element) => {
                          optionRefs.current[
                            index
                          ] = element;
                        }}
                        className={`
                          custom-select-row
                          ${
                            highlighted
                              ? "highlighted"
                              : ""
                          }
                          ${
                            selected
                              ? "selected"
                              : ""
                          }
                        `}
                        onMouseEnter={() => {
                          setHighlightedIndex(
                            index
                          );
                        }}
                        onMouseDown={(
                          event
                        ) => {
                          event.preventDefault();
                        }}
                        onClick={() => {
                          selectOption(
                            option
                          );
                        }}
                      >

                        {displayMode ===
                        "id" &&
                        isAccountOption(
                          option
                        ) ? (
                          <>
                            <div className="custom-id-column">
                              {
                                option.accountId
                              }
                            </div>

                            <div className="custom-name-column">
                              {
                                option.accountName
                              }
                            </div>
                          </>
                        ) : displayMode ===
                            "name" &&
                          isAccountOption(
                            option
                          ) ? (
                          <>
                            <div className="custom-name-column">
                              {
                                option.accountName
                              }
                            </div>

                            <div className="custom-id-column">
                              {
                                option.accountId
                              }
                            </div>
                          </>
                        ) : (
                          <div className="custom-normal-column">
                            {
                              option.label
                            }
                          </div>
                        )}

                      </div>
                    );
                  }
                )
              )}

            </div>

            {/* =============================================
                FOOTER
            ============================================= */}

            <div className="custom-select-footer">
              <span>×</span>
              <span>◢</span>
            </div>

          </div>
        )}
      </div>
    );
  }
);

CustomSelect.displayName =
  "CustomSelect";

export default CustomSelect;