import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/* =========================================================
   REF
========================================================= */

export interface ReceiptActionsRef {
  focusSave: () => void;
}

/* =========================================================
   PROPS
========================================================= */

interface Props {
  clearForm: () => void;
  onSave: () => void;
}

/* =========================================================
   RECEIPT ACTIONS
========================================================= */

const ReceiptActions = forwardRef<
  ReceiptActionsRef,
  Props
>(({ clearForm, onSave }, ref) => {
  /* =======================================================
     BUTTON REFS
  ======================================================= */

  const buttonRefs =
    useRef<(HTMLButtonElement | null)[]>(
      []
    );

  /* =======================================================
     ACTIVE BUTTON
  ======================================================= */

  const [activeIndex, setActiveIndex] =
    useState(0);

  /* =======================================================
     BUTTON LIST
  ======================================================= */

  const buttons = [
    "Save",
    "Search",
    "Delete",
    "Print",
    "Post",
    "Attach",
    "Clear",
  ];

  /* =======================================================
     FOCUS BUTTON
  ======================================================= */

  const focusButton = useCallback(
    (index: number) => {
      const button =
        buttonRefs.current[index];

      if (!button) {
        return;
      }

      setActiveIndex(index);

      requestAnimationFrame(() => {
        button.focus();
      });
    },
    []
  );

  /* =======================================================
     EXPOSE TO PARENT
  ======================================================= */

  useImperativeHandle(
    ref,
    () => ({
      focusSave: () => {
        focusButton(0);
      },
    }),
    [focusButton]
  );

  /* =======================================================
     EXECUTE BUTTON
  ======================================================= */

  const executeButton =
    useCallback(
      (index: number) => {
        switch (index) {
          /* ===============================================
             SAVE
          =============================================== */

          case 0:
            onSave();
            break;

          /* ===============================================
             SEARCH
          =============================================== */

          case 1:
            console.log(
              "Search clicked"
            );
            break;

          /* ===============================================
             DELETE
          =============================================== */

          case 2:
            console.log(
              "Delete clicked"
            );
            break;

          /* ===============================================
             PRINT
          =============================================== */

          case 3:
            console.log(
              "Print clicked"
            );
            break;

          /* ===============================================
             POST
          =============================================== */

          case 4:
            console.log(
              "Post clicked"
            );
            break;

          /* ===============================================
             ATTACH
          =============================================== */

          case 5:
            console.log(
              "Attach clicked"
            );
            break;

          /* ===============================================
             CLEAR
          =============================================== */

          case 6:
            clearForm();
            break;

          default:
            break;
        }
      },
      [
        clearForm,
        onSave,
      ]
    );

  /* =======================================================
     KEYBOARD NAVIGATION
  ======================================================= */

  const handleKeyDown =
    useCallback(
      (
        event: React.KeyboardEvent<HTMLButtonElement>
      ) => {
        switch (event.key) {
          /* ===============================================
             NEXT
          =============================================== */

          case "ArrowRight":
          case "ArrowDown": {
            event.preventDefault();
            event.stopPropagation();

            const nextIndex =
              activeIndex <
              buttons.length - 1
                ? activeIndex + 1
                : 0;

            focusButton(
              nextIndex
            );

            break;
          }

          /* ===============================================
             PREVIOUS
          =============================================== */

          case "ArrowLeft":
          case "ArrowUp": {
            event.preventDefault();
            event.stopPropagation();

            const previousIndex =
              activeIndex > 0
                ? activeIndex - 1
                : buttons.length - 1;

            focusButton(
              previousIndex
            );

            break;
          }

          /* ===============================================
             ENTER
          =============================================== */

          case "Enter": {
            event.preventDefault();
            event.stopPropagation();

            executeButton(
              activeIndex
            );

            break;
          }

          default:
            break;
        }
      },
      [
        activeIndex,
        executeButton,
        focusButton,
      ]
    );

  /* =======================================================
     KEEP ACTIVE INDEX IN SYNC
  ======================================================= */

  const handleFocus = (
    index: number
  ) => {
    setActiveIndex(index);
  };

  /* =======================================================
     BUTTON STYLE
  ======================================================= */

 const buttonClass =
  `
    min-w-[120px]
    h-[40px]
    rounded-[4px]

    border-l
    border-r
    border-b
    border-[#9db8d4]

    border-t-0

bg-gradient-to-b
    from-[#ffffff]
    to-[#e7eef5]

    px-4

    text-[15px]

    shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]

    transition-colors
    duration-100

    hover:border-l-[#7f9fbd]
    hover:border-r-[#7f9fbd]
    hover:border-b-[#7f9fbd]

    hover:bg-gradient-to-b
    hover:from-[#ffffff]
    hover:to-[#dce8f1]

    focus:border-l-[#20884e]
    focus:border-r-[#20884e]
    focus:border-b-[#20884e]
    focus:border-t-0

    focus:bg-gradient-to-b
    focus:from-[#ffffff]
    focus:to-[#dcefe5]

    focus:outline-none
    focus:ring-0
  `;

  /* =======================================================
     TEXT STYLE
  ======================================================= */

  const textClass =
    `
      bg-gradient-to-b
      from-[#145c34]
      via-[#20884e]
      to-[#8fd9ad]

      bg-clip-text
      text-transparent

      font-medium
    `;

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div
      className="
        my-5
        flex
        w-full
        flex-wrap
        items-center
        justify-center
        gap-2.75
      "
    >
      {buttons.map(
        (
          label,
          index
        ) => (
          <button
            key={label}

            ref={(element) => {
              buttonRefs.current[
                index
              ] = element;
            }}

            type="button"

            className={
              buttonClass
            }

            onFocus={() =>
              handleFocus(
                index
              )
            }

            onKeyDown={
              handleKeyDown
            }

            onClick={() =>
              executeButton(
                index
              )
            }
          >
            <span className={textClass}>
              {["Save", "Delete", "Clear"].includes(label) ? (
                <>
                  <span className="underline decoration-2 underline-offset-1">
  {label.charAt(0)}
</span>
                  {label.slice(1)}
                </>
              ) : (
                label
              )}
            </span>
          </button>
        )
      )}
    </div>
  );
});

ReceiptActions.displayName =
  "ReceiptActions";

export default ReceiptActions;