
import { useCallback } from "react";
import type { RefObject } from "react";
import type { SelectInstance } from "react-select";

import type { TableField } from "../test/ReceiptTable";


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

  branchRef: RefObject<
    SelectInstance<any, false> | null
  >;

  typeRef: RefObject<
    SelectInstance<any, false> | null
  >;

  documentNoRef: RefObject<
    HTMLInputElement | null
  >;

  cbAccountRef: RefObject<
    SelectInstance<any, false> | null
  >;

  dateRef: RefObject<
    HTMLInputElement | null
  >;

  receivedFromRef: RefObject<
    HTMLInputElement | null
  >;

  referenceRef: RefObject<
    HTMLInputElement | null
  >;

  descriptionRef: RefObject<
    HTMLInputElement | null
  >;

  noteRef: RefObject<
    HTMLTextAreaElement | null
  >;

  receiptTableRef: RefObject<any>;

  actionsRef: RefObject<any>;
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


      /*
         First focus after the current render.
      */

      requestAnimationFrame(() => {

        if (!element) {
          return;
        }


        try {

          element.focus();

        } catch {
          return;
        }


        /*
           Select text only for native inputs.

           IMPORTANT:
           react-select is not an HTMLInputElement
           from the ref perspective, so never call
           .select() on it here.
        */

        if (
          selectText &&
          element instanceof HTMLInputElement &&
          element.type !== "checkbox"
        ) {

          try {

            element.select();

          } catch {
            /*
               Ignore selection errors.
            */

          }

        }

      });

    },
    []
  );


  /* =======================================================
     2. FOCUS REACT-SELECT
  ======================================================= */

  const focusSelect = useCallback(
    (
      selectRef: RefObject<
        SelectInstance<any, false> | null
      >
    ) => {

      /*
         react-select exposes focus()
         through SelectInstance.
      */

      const select =
        selectRef.current;


      if (!select) {
        return;
      }


      /*
         Focus immediately if possible.
      */

      try {

        select.focus();

      } catch {
        /*
           Select may currently be
           re-rendering.
        */

      }


      /*
         Retry after React has completed
         the next render.

         This helps when Account ID /
         Account Name selection causes
         the table row to update.
      */

      requestAnimationFrame(() => {

        const currentSelect =
          selectRef.current;


        if (!currentSelect) {
          return;
        }


        try {

          currentSelect.focus();

        } catch {
          /*
             Ignore temporary focus errors.
          */

        }

      });

    },
    []
  );


  /* =======================================================
     3. FOCUS HEADER FIELD
  ======================================================= */

  const focusHeaderField = useCallback(
    (field: HeaderField) => {

      switch (field) {

        /* -------------------------------------------------
           BRANCH
        ------------------------------------------------- */

        case "branch":

          focusSelect(
            branchRef
          );

          break;


        /* -------------------------------------------------
           TYPE
        ------------------------------------------------- */

        case "type":

          focusSelect(
            typeRef
          );

          break;


        /* -------------------------------------------------
           DOCUMENT NUMBER
        ------------------------------------------------- */

        case "documentNo":

          focusElement(
            documentNoRef.current,
            true
          );

          break;


        /* -------------------------------------------------
           CASH / BANK ACCOUNT
        ------------------------------------------------- */

        case "cbAccount":

          focusSelect(
            cbAccountRef
          );

          break;


        /* -------------------------------------------------
           DATE
        ------------------------------------------------- */

        case "date":

          focusElement(
            dateRef.current
          );

          break;


        /* -------------------------------------------------
           RECEIVED FROM
        ------------------------------------------------- */

        case "receivedFrom":

          focusElement(
            receivedFromRef.current,
            true
          );

          break;


        /* -------------------------------------------------
           REFERENCE
        ------------------------------------------------- */

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
      focusSelect,
    ]
  );


  /* =======================================================
     4. FOCUS TABLE FIELD
  ======================================================= */

  const focusTableField = useCallback(
    (
      rowIndex: number,
      field: TableField
    ) => {

      /*
         IMPORTANT:

         Keep the existing ReceiptTable
         keyboard flow unchanged.

         ReceiptTable itself owns the
         Account ID / Account Name refs.
      */

      requestAnimationFrame(() => {

        receiptTableRef.current?.focusField(
          rowIndex,
          field
        );

      });

    },
    [
      receiptTableRef,
    ]
  );


  /* =======================================================
     5. FOCUS BOTTOM FIELD
  ======================================================= */

  const focusBottomField = useCallback(
    (field: BottomField) => {

      switch (field) {

        /* -------------------------------------------------
           DESCRIPTION
        ------------------------------------------------- */

        case "description":

          focusElement(
            descriptionRef.current,
            true
          );

          break;


        /* -------------------------------------------------
           NOTE
        ------------------------------------------------- */

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
     6. FOCUS ACTION BUTTON
  ======================================================= */

  const focusActionButton = useCallback(
    (field: ActionField) => {

      switch (field) {

        /* -------------------------------------------------
           SAVE
        ------------------------------------------------- */

        case "save":

          requestAnimationFrame(() => {

            actionsRef.current?.focusSave?.();

          });

          break;


        /* -------------------------------------------------
           SEARCH
        ------------------------------------------------- */

        case "search":

          requestAnimationFrame(() => {

            actionsRef.current?.focusSearch?.();

          });

          break;


        /* -------------------------------------------------
           DELETE
        ------------------------------------------------- */

        case "delete":

          requestAnimationFrame(() => {

            actionsRef.current?.focusDelete?.();

          });

          break;


        /* -------------------------------------------------
           PRINT
        ------------------------------------------------- */

        case "print":

          requestAnimationFrame(() => {

            actionsRef.current?.focusPrint?.();

          });

          break;


        /* -------------------------------------------------
           POST
        ------------------------------------------------- */

        case "post":

          requestAnimationFrame(() => {

            actionsRef.current?.focusPost?.();

          });

          break;


        /* -------------------------------------------------
           ATTACH
        ------------------------------------------------- */

        case "attach":

          requestAnimationFrame(() => {

            actionsRef.current?.focusAttach?.();

          });

          break;


        /* -------------------------------------------------
           CLEAR
        ------------------------------------------------- */

        case "clear":

          requestAnimationFrame(() => {

            actionsRef.current?.focusClear?.();

          });

          break;

      }

    },
    [
      actionsRef,
    ]
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
