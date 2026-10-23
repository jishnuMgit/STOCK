import { useCallback } from "react";
import { toast } from "react-toastify";

/* =========================================================
   THE MESSAGES OF A DELETE - the same on every screen

     const { deleted, notDeleted } = useDeleteToast("Stock Transfer");

     deleted();                       // "Stock Transfer deleted successfully"
     notDeleted(result.message);      // the server's reason, else "Not deleted, try again"

   The name is the form's own (the same text as the title of its question window), so
   the message says WHAT was deleted. Without a name it reads "Deleted successfully".
   Call deleted() once the delete has really worked (after the server answered), for
   the whole document and for one row alike. The wording is written here only, so a
   change is made once for every page.
========================================================= */

// "Stock Transfer deleted successfully" - or "Deleted successfully" with no form name
export const deleteSuccessMessage = (formName?: string) =>
  formName ? `${formName} deleted successfully` : "Deleted successfully";

export const DELETE_FAILED_MESSAGE = "Not deleted, try again";

export function useDeleteToast(formName?: string) {
  const deleted = useCallback(() => {
    toast.success(deleteSuccessMessage(formName));
  }, [formName]);

  const notDeleted = useCallback((reason?: string) => {
    toast.error(reason || DELETE_FAILED_MESSAGE);
  }, []);

  return { deleted, notDeleted };
}
