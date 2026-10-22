import { useCallback, useState } from "react";
import ConfirmModal, {
  type ConfirmOptions,
} from "../components/common/ConfirmModal";

/* Themed confirm modal.
   const { confirm, dialog } = useConfirmModal();
   if (!(await confirm({ message: "Do you want to delete ?" }))) return; */
export const useConfirmModal = () => {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ options, resolve })),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      state?.resolve(result);
      setState(null);
    },
    [state],
  );

  const dialog = (
    <ConfirmModal
      open={state !== null}
      title={state?.options.title}
      message={state?.options.message}
      confirmLabel={state?.options.confirmLabel}
      cancelLabel={state?.options.cancelLabel}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, dialog };
};
