import { X } from "lucide-react";

type CloseButtonProps = {
    onClose: () => void;
    title?: string;
    className?: string;
};

export default function CloseButton({
    onClose,
    title = "Close",
    className = "",
}: CloseButtonProps) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClose}
            className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-700 hover:bg-red-100 hover:text-red-600 focus:outline-none ${className}`}
        >
            <X width={16} height={16} />
        </button>
    );
}