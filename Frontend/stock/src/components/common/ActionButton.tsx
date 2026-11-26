import { forwardRef } from "react";

interface ActionButtonProps {
    label: string;
    /** index of the shortcut letter to highlight. Omit for none */
    underlineIndex?: number;
    id?: string;
    title?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onFocus?: () => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    type?: "button" | "submit";
}

const textClass = "font-medium text-slate-500";

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
    (
        {
            label,
            underlineIndex,
            id,
            title,
            onClick,
            onFocus,
            onKeyDown,
            disabled = false,
            type = "button",
        },
        ref,
    ) => {
        const hasUnderline =
            underlineIndex !== undefined &&
            underlineIndex >= 0 &&
            underlineIndex < label.length;

        return (
            <button
                ref={ref}
                id={id}
                title={title}
                type={type}
                disabled={disabled}
                onClick={onClick}
                onFocus={onFocus}
                onKeyDown={onKeyDown}
                className={`btn-style ${disabled ? "disabled:cursor-not-allowed disabled:opacity-50" : ""
                    }`}
            >
                <span className={textClass}>
                    {hasUnderline ? (
                        <>
                            {label.slice(0, underlineIndex)}
                            <span className="font-bold text-green-600">
                                {label[underlineIndex!]}
                            </span>
                            {label.slice(underlineIndex! + 1)}
                        </>
                    ) : (
                        label
                    )}
                </span>
            </button>
        );
    },
);

ActionButton.displayName = "ActionButton";

export default ActionButton;