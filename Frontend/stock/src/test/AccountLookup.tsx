import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

export interface AccountLookupOption {
  value: string;
  label: string;
  accountId: string;
  accountName: string;
}

export interface AccountLookupRef {
  focus: () => void;
}

interface AccountLookupProps {
  value: AccountLookupOption | null;
  options: AccountLookupOption[];
  displayMode: "id" | "name";
  placeholder?: string;
  disabled?: boolean;

  onChange: (option: AccountLookupOption) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

const AccountLookup = forwardRef<
  AccountLookupRef,
  AccountLookupProps
>(
  (
    {
      value,
      options,
      displayMode,
      placeholder = "",
      disabled = false,
      onChange,
      onKeyDown,
      onOpen,
      onClose,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    /* =========================================================
       EXPOSE FOCUS
    ========================================================= */

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    /* =========================================================
       CURRENT DISPLAY VALUE
    ========================================================= */

    const displayValue = value
      ? displayMode === "id"
        ? value.accountId
        : value.accountName
      : "";

    /* =========================================================
       FILTER
    ========================================================= */

    const filteredOptions = useMemo(() => {
      const text = search.toLowerCase().trim();

      if (!text) {
        return options;
      }

      return options.filter(
        (option) =>
          option.accountId
            .toLowerCase()
            .includes(text) ||
          option.accountName
            .toLowerCase()
            .includes(text)
      );
    }, [options, search]);

    /* =========================================================
       OPEN
    ========================================================= */

    const openPopup = () => {
      if (disabled) return;

      setIsOpen(true);
      setHighlightedIndex(0);

      onOpen?.();
    };

    /* =========================================================
       CLOSE
    ========================================================= */

    const closePopup = () => {
      setIsOpen(false);
      setSearch("");
      setHighlightedIndex(0);

      onClose?.();
    };

    /* =========================================================
       SELECT
    ========================================================= */

    const selectOption = (
      option: AccountLookupOption
    ) => {
      onChange(option);

      setIsOpen(false);
      setSearch("");
      setHighlightedIndex(0);

      onClose?.();

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    };

    /* =========================================================
       KEYBOARD
    ========================================================= */

    const handleKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (!isOpen) {
          openPopup();
          return;
        }

        setHighlightedIndex((current) =>
          filteredOptions.length === 0
            ? 0
            : Math.min(
                current + 1,
                filteredOptions.length - 1
              )
        );

        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (!isOpen) {
          openPopup();
          return;
        }

        setHighlightedIndex((current) =>
          Math.max(current - 1, 0)
        );

        return;
      }

      if (event.key === "Enter") {
        /*
         * If popup is open:
         * select highlighted account.
         */
        if (isOpen) {
          event.preventDefault();
          event.stopPropagation();

          const option =
            filteredOptions[highlightedIndex];

          if (option) {
            selectOption(option);
          }

          return;
        }

        /*
         * Popup closed:
         * let parent move to next field.
         */
        onKeyDown?.(event);

        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        /*
         * Your desired behavior:
         * ESC from table -> Note.
         */
        closePopup();

        onKeyDown?.(event);

        return;
      }

      /*
       * Pass other keys to parent.
       */
      onKeyDown?.(event);
    };

    /* =========================================================
       INPUT CHANGE
    ========================================================= */

    const handleInputChange = (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const text = event.target.value;

      setSearch(text);

      if (!isOpen) {
        openPopup();
      }

      setHighlightedIndex(0);
    };

    /* =========================================================
       CLICK OUTSIDE
    ========================================================= */

    useEffect(() => {
      const handleOutsideClick = (
        event: MouseEvent
      ) => {
        const target =
          event.target as Node;

        if (
          popupRef.current &&
          !popupRef.current.contains(target) &&
          inputRef.current &&
          !inputRef.current.contains(target)
        ) {
          closePopup();
        }
      };

      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handleOutsideClick
        );
      };
    });

    /* =========================================================
       SCROLL HIGHLIGHTED ROW
    ========================================================= */

    useEffect(() => {
      if (!isOpen) return;

      const row =
        popupRef.current?.querySelector(
          `[data-index="${highlightedIndex}"]`
        );

      if (row instanceof HTMLElement) {
        row.scrollIntoView({
          block: "nearest",
        });
      }
    }, [
      highlightedIndex,
      isOpen,
    ]);

    /* =========================================================
       RENDER
    ========================================================= */

    return (
      <div className="account-lookup">
        <input
          ref={inputRef}
          className="account-lookup__input"
          value={
            isOpen
              ? search
              : displayValue
          }
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => {
            if (!disabled) {
              openPopup();
            }
          }}
          onClick={() => {
            if (!disabled) {
              openPopup();
            }
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        {isOpen && !disabled && (
          <div
            ref={popupRef}
            className="account-lookup__popup"
            style={
              {
                "--lookup-popup-width":
                  "530px",
                "--lookup-id-width":
                  "115px",
              } as React.CSSProperties
            }
          >
            {/* HEADER */}

            <div className="account-lookup__row account-lookup__row--head">
              {displayMode === "id" ? (
                <>
                  <div className="account-lookup__id">
                    Account ID
                  </div>

                  <div className="account-lookup__name">
                    Account Name
                  </div>
                </>
              ) : (
                <>
                  <div className="account-lookup__name">
                    Account Name
                  </div>

                  <div className="account-lookup__id">
                    Account ID
                  </div>
                </>
              )}
            </div>

            {/* LIST */}

            <div className="account-lookup__list">
              {filteredOptions.length === 0 ? (
                <div className="account-lookup__empty">
                  No Account Found
                </div>
              ) : (
                filteredOptions.map(
                  (option, index) => (
                    <div
                      key={option.accountId}
                      data-index={index}
                      className={`account-lookup__row account-lookup__row--data ${
                        index ===
                        highlightedIndex
                          ? "account-lookup__row--active"
                          : ""
                      }`}
                      onMouseDown={(event) => {
                        event.preventDefault();

                        selectOption(
                          option
                        );
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(
                          index
                        );
                      }}
                    >
                      {displayMode === "id" ? (
                        <>
                          <div className="account-lookup__id">
                            {
                              option.accountId
                            }
                          </div>

                          <div className="account-lookup__name">
                            {
                              option.accountName
                            }
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="account-lookup__name">
                            {
                              option.accountName
                            }
                          </div>

                          <div className="account-lookup__id">
                            {
                              option.accountId
                            }
                          </div>
                        </>
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

AccountLookup.displayName =
  "AccountLookup";

export default AccountLookup;