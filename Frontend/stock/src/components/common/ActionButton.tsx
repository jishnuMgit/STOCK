import { forwardRef } from "react";

interface ActionButtonProps {
    label: string;
    /** index of the letter to underline (shortcut letter). Omit for none */
    underlineIndex?: number;
    id?: string;
    title?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onFocus?: () => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    type?: "button" | "submit";
}

const textClass =
    "bg-gradient-to-b from-[#145c34] via-[#20884e] to-[#8fd9ad] bg-clip-text text-transparent font-medium";

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
                            <span className="underline decoration-2 underline-offset-1">
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