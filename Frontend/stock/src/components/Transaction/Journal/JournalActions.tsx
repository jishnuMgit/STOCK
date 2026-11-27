import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";

import { Link } from "react-router-dom";

import "../Receipt/save/commanReceipt.css";
import ActionButton from "../../common/ActionButton";

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

        useEffect(() => {
            const handleGlobalKeyDown = (event: KeyboardEvent) => {
                if (!(event.ctrlKey || event.metaKey)) return;

                switch (event.key.toLowerCase()) {
                    case "s":
                        event.preventDefault();
                        event.stopPropagation();
                        if (isPosted && saveLabel === "Modify") return;
                        onSave?.();
                        break;

                    case "f":
                        event.preventDefault();
                        event.stopPropagation();
                        searchRef.current?.click();
                        break;

                    case "d":
                        event.preventDefault();
                        event.stopPropagation();
                        if (isPosted) return;
                        onDelete?.();
                        break;

                    case "p":
                        event.preventDefault();
                        event.stopPropagation();
                        onPrint?.();
                        break;

                    case "o":
                        event.preventDefault();
                        event.stopPropagation();
                        if (isPosted) return;
                        onPost?.();
                        break;
                }
            };

            window.addEventListener("keydown", handleGlobalKeyDown);
            return () => window.removeEventListener("keydown", handleGlobalKeyDown);
        }, [onSave, onDelete, onPrint, onPost, isPosted, saveLabel]);

        return (
            <div className="my-5 flex w-full pb-2 flex-wrap items-center justify-center gap-2.75">
                <ActionButton
                    ref={saveRef}
                    id={saveLabel === "Modify" ? "btnModify" : "btnSave"}
                    label={saveLabel}
                    underlineIndex={0}
                    disabled={isPosted && saveLabel === "Modify"}
                    onFocus={() => handleFocus(0)}
                    onKeyDown={handleKeyDown}
                    onClick={onSave}
                />

                <Link to="/Transaction/journal/modify">
                    <ActionButton
                        ref={searchRef}
                        id="btnSearch"
                        label="Find"
                        underlineIndex={0}
                        onFocus={() => handleFocus(1)}
                        onKeyDown={handleKeyDown}
                        onClick={(event) => {
                            if (preventSearchNavigation) {
                                event.preventDefault();
                            }
                            onSearch?.();
                        }}
                    />
                </Link>

                <ActionButton
                    ref={deleteRef}
                    id="btnDelete"
                    label="Delete"
                    underlineIndex={0}
                    disabled={isPosted}
                    onFocus={() => handleFocus(2)}
                    onKeyDown={handleKeyDown}
                    onClick={onDelete}
                />

                <ActionButton
                    ref={printRef}
                    id="btnPrint"
                    label="Print"
                    underlineIndex={0}
                    onFocus={() => handleFocus(3)}
                    onKeyDown={handleKeyDown}
                    onClick={onPrint}
                />

                <ActionButton
                    ref={postRef}
                    id="btnPost"
                    label="Post"
                    underlineIndex={1}
                    disabled={isPosted}
                    onFocus={() => handleFocus(4)}
                    onKeyDown={handleKeyDown}
                    onClick={onPost}
                />

                <ActionButton
                    ref={attachRef}
                    id="btnAttach"
                    label="Attach"
                    onFocus={() => handleFocus(5)}
                    onKeyDown={handleKeyDown}
                    onClick={onAttach}
                />

                <ActionButton
                    ref={clearRef}
                    id="btnClear"
                    label="Clear"
                    underlineIndex={0}
                    onFocus={() => handleFocus(6)}
                    onKeyDown={handleKeyDown}
                    onClick={clearForm}
                />
            </div>
        );
    },
);

JournalActions.displayName = "JournalActions";

export default JournalActions;