import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

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

  onSearch?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onPost?: () => void;
  onAttach?: () => void;

  saveLabel?: string;

  preventSearchNavigation?: boolean;
}

/* =========================================================
   RECEIPT ACTIONS
========================================================= */

const ReceiptActions = forwardRef<ReceiptActionsRef, Props>(
  (
    {
      clearForm,
      onSave,
      onSearch,
      onDelete,
      onPrint,
      onPost,
      onAttach,
      saveLabel = "Save",
      preventSearchNavigation = false,
    },
    ref
  ) => {
    /* =======================================================
       BUTTON REFS
    ======================================================= */

    const saveRef = useRef<HTMLButtonElement | null>(null);
    const searchRef = useRef<HTMLButtonElement | null>(null);
    const deleteRef = useRef<HTMLButtonElement | null>(null);
    const printRef = useRef<HTMLButtonElement | null>(null);
    const postRef = useRef<HTMLButtonElement | null>(null);
    const attachRef = useRef<HTMLButtonElement | null>(null);
    const clearRef = useRef<HTMLButtonElement | null>(null);

    /* =======================================================
       ACTIVE BUTTON
    ======================================================= */

    const [activeIndex, setActiveIndex] = useState(0);

    /* =======================================================
       BUTTON LIST FOR NAVIGATION ONLY
    ======================================================= */

    const buttonRefs = [
      saveRef,
      searchRef,
      deleteRef,
      printRef,
      postRef,
      attachRef,
      clearRef,
    ];

    /* =======================================================
       FOCUS BUTTON
    ======================================================= */

    const focusButton = useCallback((index: number) => {
      const button = buttonRefs[index]?.current;

      if (!button) {
        return;
      }

      setActiveIndex(index);

      requestAnimationFrame(() => {
        button.focus();
      });
    }, []);

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
       KEYBOARD NAVIGATION
    ======================================================= */

    const handleKeyDown = useCallback(
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
              activeIndex < buttonRefs.length - 1
                ? activeIndex + 1
                : 0;

            focusButton(nextIndex);

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
                : buttonRefs.length - 1;

            focusButton(previousIndex);

            break;
          }

          /* ===============================================
             ENTER
          =============================================== */

          case "Enter": {
            event.preventDefault();
            event.stopPropagation();

            event.currentTarget.click();

            break;
          }

          default:
            break;
        }
      },
      [activeIndex, focusButton]
    );

    /* =======================================================
       BUTTON FOCUS
    ======================================================= */

    const handleFocus = (index: number) => {
      setActiveIndex(index);
    };

    /* =======================================================
       BUTTON STYLE
    ======================================================= */

    const buttonClass = `
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

    const textClass = `
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

        {/* =================================================
            SAVE
        ================================================= */}

        <button
          ref={saveRef}
          type="button"
          className={buttonClass}
          onFocus={() => handleFocus(0)}
          onKeyDown={handleKeyDown}
          onClick={onSave}
          id="Savebtn"
        >
          <span className={textClass}>
            <span className="underline decoration-2 underline-offset-1">
              {saveLabel === "Save" ? "S" : "M"}
            </span>
            {saveLabel.slice(1)}
          </span>
        </button>

        {/* =================================================
            SEARCH
        ================================================= */}
<Link to={'/Transaction/receipt/modify'}>


        <button
          ref={searchRef}
          type="button"
          className={buttonClass}
          onFocus={() => handleFocus(1)}
          onKeyDown={handleKeyDown}
          onClick={(event) => {
            if (preventSearchNavigation) {
              event.preventDefault();
            }
            onSearch?.();
          }}
          id="Searchbtn"
        >
          <span className={textClass}>
            Search
          </span>
        </button>
        </Link>

        {/* =================================================
            DELETE
        ================================================= */}

        <button
          ref={deleteRef}
          type="button"
          className={buttonClass}
          onFocus={() => handleFocus(2)}
          onKeyDown={handleKeyDown}
          onClick={onDelete}
          id="Deletebtn"
        >
          <span className={textClass}>
            <span className="underline decoration-2 underline-offset-1">
              D
            </span>
            elete
          </span>
        </button>

        {/* =================================================
            PRINT
        ================================================= */}

        <button
          ref={printRef}
          type="button"
          className={buttonClass}
          onFocus={() => handleFocus(3)}
          onKeyDown={handleKeyDown}
          onClick={onPrint}
          id="Printbtn"
        >
          <span className={textClass}>
            Print
          </span>
        </button>

        {/* =================================================
            POST
        ================================================= */}

        <button
          ref={postRef}
          type="button"
          className={buttonClass}
          onFocus={() => handleFocus(4)}
          onKeyDown={handleKeyDown}
          onClick={onPost}
          id="Printbtn"
        >
          <span className={textClass}>
            Post
          </span>
        </button>

        {/* =================================================
            ATTACH
        ================================================= */}

        <button
          ref={attachRef}
          type="button"
          className={buttonClass}
          onFocus={() => handleFocus(5)}
          onKeyDown={handleKeyDown}
          onClick={onAttach}
          id="Attachbtn"
        >
          <span className={textClass}>
            Attach
          </span>
        </button>

        {/* =================================================
            CLEAR
        ================================================= */}

        <button
          ref={clearRef}
          type="button"
          className={buttonClass}
          onFocus={() => handleFocus(6)}
          onKeyDown={handleKeyDown}
          onClick={clearForm}
          id="Clearbtn"
        >
          <span className={textClass}>
            <span className="underline decoration-2 underline-offset-1">
              C
            </span>
            lear
          </span>
        </button>

      </div>
    );
  }
);

ReceiptActions.displayName = "ReceiptActions";

export default ReceiptActions;