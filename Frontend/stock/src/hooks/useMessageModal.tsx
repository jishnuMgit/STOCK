import { useCallback, useMemo, useRef, useState } from "react";
import MessageModal, {
    type MessageType,
} from "../components/common/MessageModal";

interface QueuedMessage {
    id: number;
    type: MessageType;
    message: string;
}

export const useMessageModal = () => {
    const [queue, setQueue] = useState<QueuedMessage[]>([]);
    const idRef = useRef(0);

    const push = useCallback((type: MessageType, message: string) => {
        idRef.current += 1;
        const id = idRef.current;
        setQueue((current) => [...current, { id, type, message }]);
    }, []);

    const close = useCallback(() => setQueue((current) => current.slice(1)), []);

    // same method names as react-toastify, and a stable reference
    const notify = useMemo(
        () => ({
            success: (m: string) => push("success", m),
            error: (m: string) => push("error", m),
            warning: (m: string) => push("warning", m),
            info: (m: string) => push("info", m),
        }),
        [push],
    );

    const current = queue[0];

    const dialog = (
        <MessageModal
            key={current?.id}
            open={!!current}
            type={current?.type}
            message={current?.message ?? ""}
            onClose={close}
        />
    );

    return { notify, dialog };
};