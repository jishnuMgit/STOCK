import { useMemo, type ReactNode } from "react";
import { enqueueMessage } from "./messageModalStore";

export const useMessageModal = (title?: string) => {
  const notify = useMemo(
    () => ({
      success: (message: ReactNode) => enqueueMessage("success", message, title),
      error: (message: ReactNode) => enqueueMessage("error", message, title),
      warning: (message: ReactNode) => enqueueMessage("warning", message, title),
      info: (message: ReactNode) => enqueueMessage("info", message, title),
    }),
    [title],
  );

  return { notify, dialog: null };
};
