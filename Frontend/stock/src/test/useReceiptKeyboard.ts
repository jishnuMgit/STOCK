import { useCallback } from "react";
import type { SelectInstance } from "react-select";

import type { TableField } from "../components/Transaction/Receipt/save/ReceiptTable";

/* =========================================================
   HEADER FIELDS
========================================================= */

export type HeaderField =
  | "branch"
  | "type"
  | "documentNo"
  | "cbAccount"
  | "date"
  | "receivedFrom"
  | "reference";

/* =========================================================
   BOTTOM FIELDS
========================================================= */

export type BottomField =
  | "description"
  | "note";

/* =========================================================
   ACTION FIELDS
========================================================= */

export type ActionField =
  | "save"
  | "search"
  | "delete"
  | "print"
  | "post"
  | "attach"
  | "clear";

/* =========================================================
   REF TYPES
========================================================= */

interface UseReceiptKeyboardProps {
  branchRef: React.RefObject<
    SelectInstance<any, false> | null
  >;

  typeRef: React.RefObject<
    SelectInstance<any, false> | null
  >;

  documentNoRef: React.RefObject<
    HTMLInputElement | null
  >;

  cbAccountRef: React.RefObject<
    SelectInstance<any, false> | null
  >;

  dateRef: React.RefObject<
    HTMLInputElement | null
  >;

  receivedFromRef: React.RefObject<
    HTMLInputElement | null
  >;

  referenceRef: React.RefObject<
    HTMLInputElement | null
  >;

  descriptionRef: React.RefObject<
    HTMLInputElement | null
  >;

  noteRef: React.RefObject<
    HTMLTextAreaElement | null
  >;

  receiptTableRef: React.RefObject<any>;

  actionsRef: React.RefObject<any>;
}

/* =========================================================
   HOOK
========================================================= */

const useReceiptKeyboard = ({
  branchRef,
  typeRef,
  documentNoRef,
  cbAccountRef,
  dateRef,
  receivedFromRef,
  referenceRef,
  descriptionRef,
  noteRef,
  receiptTableRef,
  actionsRef,
}: UseReceiptKeyboardProps) => {

  /* =======================================================
     1. FOCUS ELEMENT
  ======================================================= */

  const focusElement = useCallback(
    (
      element: HTMLElement | null,
      selectText = false
    ) => {
      if (!element) {
        return;
      }

      requestAnimationFrame(() => {
        element.focus();

        if (
          selectText &&
          element instanceof HTMLInputElement &&
          element.type !== "checkbox"
        ) {
          element.select();
        }
      });
    },
    []
  );

  /* =======================================================
     2. FOCUS HEADER FIELD
  ======================================================= */

  const focusHeaderField = useCallback(
    (field: HeaderField) => {
      switch (field) {
        case "branch":
          focusElement(branchRef.current);
          break;

        case "type":
          focusElement(typeRef.current);
          break;

        case "documentNo":
          focusElement(
            documentNoRef.current,
            true
          );
          break;

        case "cbAccount":
          focusElement(
            cbAccountRef.current
          );
          break;

        case "date":
          focusElement(dateRef.current);
          break;

        case "receivedFrom":
          focusElement(
            receivedFromRef.current,
            true
          );
          break;

        case "reference":
          focusElement(
            referenceRef.current,
            true
          );
          break;
      }
    },
    [
      branchRef,
      typeRef,
      documentNoRef,
      cbAccountRef,
      dateRef,
      receivedFromRef,
      referenceRef,
      focusElement,
    ]
  );

  /* =======================================================
     3. FOCUS TABLE FIELD
  ======================================================= */

  const focusTableField = useCallback(
    (
      rowIndex: number,
      field: TableField
    ) => {
      receiptTableRef.current?.focusField(
        rowIndex,
        field
      );
    },
    [receiptTableRef]
  );

  /* =======================================================
     4. FOCUS BOTTOM FIELD
  ======================================================= */

  const focusBottomField = useCallback(
    (field: BottomField) => {
      switch (field) {
        case "description":
          focusElement(
            descriptionRef.current,
            true
          );
          break;

        case "note":
          focusElement(
            noteRef.current
          );
          break;
      }
    },
    [
      descriptionRef,
      noteRef,
      focusElement,
    ]
  );

  /* =======================================================
     5. FOCUS ACTION BUTTON
  ======================================================= */

  const focusActionButton = useCallback(
    (field: ActionField) => {
      switch (field) {
        case "save":
          actionsRef.current?.focusSave();
          break;

        case "search":
          actionsRef.current?.focusSearch?.();
          break;

        case "delete":
          actionsRef.current?.focusDelete?.();
          break;

        case "print":
          actionsRef.current?.focusPrint?.();
          break;

        case "post":
          actionsRef.current?.focusPost?.();
          break;

        case "attach":
          actionsRef.current?.focusAttach?.();
          break;

        case "clear":
          actionsRef.current?.focusClear?.();
          break;
      }
    },
    [actionsRef]
  );

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    focusElement,
    focusHeaderField,
    focusTableField,
    focusBottomField,
    focusActionButton,
  };
};

export default useReceiptKeyboard;