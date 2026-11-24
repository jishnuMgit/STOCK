import { useSyncExternalStore } from "react";
import MessageModal from "./MessageModal";
import {
  closeCurrentMessage,
  getQueuedMessages,
  subscribeToMessages,
} from "../../hooks/messageModalStore";

const MessageModalHost = () => {
  const messages = useSyncExternalStore(
    subscribeToMessages,
    getQueuedMessages,
    getQueuedMessages,
  );
  const current = messages[0];

  return (
    <MessageModal
      key={current?.id}
      open={!!current}
      type={current?.type}
      title={current?.title}
      message={current?.message ?? ""}
      onClose={closeCurrentMessage}
    />
  );
};

export default MessageModalHost;
