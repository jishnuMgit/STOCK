import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
} from "react";

import { Link } from "react-router-dom";

import "../Receipt/save/commanReceipt.css";

/* =========================================================
   TYPES
========================================================= */

export interface JournalActionsRef {
    focusSave: () => void;
}

export interface JournalActionsProps {
    clearForm: () => void;
    onSave?: () => void;
    onSearch?: () => void;
    onDelete?: () => void;
    onPrint?: () => void;
    onPost?: () => void;
    onAttach?: () => void;
    saveLabel?: "Save" | "Modify";
    isPosted?: boolean;
    preventSearchNavigation?: boolean;
}

/* =========================================================
   JOURNAL ACTIONS
========================================================= */

const JournalActions = forwardRef<JournalActionsRef, JournalActionsProps>(
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
            isPosted = false,
            preventSearchNavigation = false,
        },
        ref,
    ) => {
        const saveRef = useRef<HTMLButtonElement | null>(null);
        const searchRef = useRef<HTMLButtonElement | null>(null);
        const deleteRef = useRef<HTMLButtonElement | null>(null);
        const printRef = useRef<HTMLButtonElement | null>(null);
        const postRef = useRef<HTMLButtonElement | null>(null);
        const attachRef = useRef<HTMLButtonElement | null>(null);
        const clearRef = useRef<HTMLButtonElement | null>(null);

        const [activeIndex, setActiveIndex] = useState(0);

        const buttonRefs = [
            saveRef,
            searchRef,
            deleteRef,
            printRef,
            postRef,
            attachRef,
            clearRef,
        ];

        const focusButton = useCallback((index: number) => {
            const button = buttonRefs[index]?.current;

            if (!button) {
                return;
            }

            setActiveIndex(index);

            requestAnimationFrame(() => {
                button.focus();
            });
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        useImperativeHandle(
            ref,
            () => ({
                focusSave: () => {
                    focusButton(0);
                },
            }),
            [focusButton],
        );

        const handleKeyDown = useCallback(
            (event: React.KeyboardEvent<HTMLButtonElement>) => {
                switch (event.key) {
                    case "ArrowRight":
                    case "ArrowDown": {
                        event.preventDefault();
                        event.stopPropagation();

                        const nextIndex =
                            activeIndex < buttonRefs.length - 1 ? activeIndex + 1 : 0;

                        focusButton(nextIndex);

                        break;
                    }

                    case "ArrowLeft":
                    case "ArrowUp": {
                        event.preventDefault();
                        event.stopPropagation();

                        const previousIndex =
                            activeIndex > 0 ? activeIndex - 1 : buttonRefs.length - 1;

                        focusButton(previousIndex);

                        break;
                    }

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
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [activeIndex, focusButton],
        );

        const handleFocus = (index: number) => {
            setActiveIndex(index);
        };

        const buttonClass = `
     btn-style
    `;

        const disabledPostedActionClass =
            "disabled:cursor-not-allowed disabled:opacity-50";

        const textClass = `
      bg-gradient-to-b
      from-[#145c34]
      via-[#20884e]
      to-[#8fd9ad]
      bg-clip-text
      text-transparent
      font-medium
    `;

        return (
            <div
                className="
          my-5
          flex
          w-full
          pb-2
          flex-wrap
          items-center
          justify-center
          gap-2.75
        "
            >
                <button
                    ref={saveRef}
                    type="button"
                    className={`${buttonClass} ${isPosted && saveLabel === "Modify" ? disabledPostedActionClass : ""
                        }`}
                    disabled={isPosted && saveLabel === "Modify"}
                    onFocus={() => handleFocus(0)}
                    onKeyDown={handleKeyDown}
                    onClick={onSave}
                    id={saveLabel === "Modify" ? "btnModify" : "btnSave"}
                >
                    <span className={textClass}>
                        <span className="underline decoration-2 underline-offset-1">
                            {saveLabel === "Save" ? "S" : "M"}
                        </span>

                        {saveLabel.slice(1)}
                    </span>
                </button>

                <Link to="/Transaction/journal/modify">
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
                        id="btnSearch"
                    >
                        <span className={textClass}>Search</span>
                    </button>
                </Link>

                <button
                    ref={deleteRef}
                    type="button"
                    className={`${buttonClass} ${isPosted ? disabledPostedActionClass : ""
                        }`}
                    disabled={isPosted}
                    onFocus={() => handleFocus(2)}
                    onKeyDown={handleKeyDown}
                    onClick={onDelete}
                    id="btnDelete"
                >
                    <span className={textClass}>
                        <span className="underline decoration-2 underline-offset-1">D</span>
                        elete
                    </span>
                </button>

                <button
                    ref={printRef}
                    type="button"
                    className={buttonClass}
                    onFocus={() => handleFocus(3)}
                    onKeyDown={handleKeyDown}
                    onClick={onPrint}
                    id="btnPrint"
                >
                    <span className={textClass}>Print</span>
                </button>

                <button
                    ref={postRef}
                    type="button"
                    className={`${buttonClass} ${isPosted ? disabledPostedActionClass : ""
                        }`}
                    disabled={isPosted}
                    onFocus={() => handleFocus(4)}
                    onKeyDown={handleKeyDown}
                    onClick={onPost}
                    id="btnPost"
                >
                    <span className={textClass}>Post</span>
                </button>

                <button
                    ref={attachRef}
                    type="button"
                    className={buttonClass}
                    onFocus={() => handleFocus(5)}
                    onKeyDown={handleKeyDown}
                    onClick={onAttach}
                    id="btnAttach"
                >
                    <span className={textClass}>Attach</span>
                </button>

                <button
                    ref={clearRef}
                    type="button"
                    className={buttonClass}
                    onFocus={() => handleFocus(6)}
                    onKeyDown={handleKeyDown}
                    onClick={clearForm}
                    id="btnClear"
                >
                    <span className={textClass}>
                        <span className="underline decoration-2 underline-offset-1">C</span>
                        lear
                    </span>
                </button>
            </div>
        );
    },
);

JournalActions.displayName = "JournalActions";

export default JournalActions;