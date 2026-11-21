import React, { useEffect, useRef } from "react";

export type MessageType = "success" | "error" | "warning" | "info";

interface MessageModalProps {
    open: boolean;
    type?: MessageType;
    message: React.ReactNode;
    onClose: () => void;
}

const TITLES: Record<MessageType, string> = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Information",
};

const HEADER_BG: Record<MessageType, string> = {
    success: "bg-[#a5e0c3]",
    error: "bg-[#f5b5b5]",
    warning: "bg-[#f7e1a0]",
    info: "bg-[#b9d7f2]",
};

const focusStyle =
    "focus:outline-2! focus:outline-offset-1! focus:outline-green-600!";

const MessageModal: React.FC<MessageModalProps> = ({
    open,
    type = "info",
    message,
    onClose,
}) => {
    const okRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;

        const previous = document.activeElement as HTMLElement | null;
        okRef.current?.focus();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation(); // keep Enter from reaching the form behind
                if (!e.repeat) onClose();
                return;
            }

            if (e.key === "Tab") {
                e.preventDefault();
                const next =
                    document.activeElement === okRef.current
                        ? closeRef.current
                        : okRef.current;
                next?.focus();
            }
        };

        // capture phase: runs before the page's own key handlers
        window.addEventListener("keydown", onKeyDown, true);

        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
            if (previous?.isConnected) {
                requestAnimationFrame(() => previous.focus());
            }
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-3"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="message-modal-title"
                aria-describedby="message-modal-message"
                className="w-full max-w-sm overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800 shadow-lg outline-none"
            >
                <div
                    className={`flex h-7.5 items-center justify-between border-b border-slate-300 px-3 ${HEADER_BG[type]}`}
                >
                    <h2
                        id="message-modal-title"
                        className="text-[15px] font-semibold text-slate-700"
                    >
                        {TITLES[type]}
                    </h2>
                    <button
                        ref={closeRef}
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className={`flex h-5 w-5 items-center justify-center text-[16px] leading-none text-slate-700 hover:text-black ${focusStyle}`}
                    >
                        ×
                    </button>
                </div>

                <p
                    id="message-modal-message"
                    className="px-4 py-5 text-center text-[14px] text-[#263449]"
                >
                    {message}
                </p>

                <div className="mb-3 flex justify-center">
                    <button
                        ref={okRef}
                        type="button"
                        id="btnMessageOk"
                        onClick={onClose}
                        className={`btn-style ${focusStyle}`}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageModal;