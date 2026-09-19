import {
  useCallback,
  useEffect,
} from "react";

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
  | "reload"
  | "save"
  | "search"
  | "modify"
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
     0. DEFAULT FOCUS
     
     Receipt screen opens with focus on
     Receipt No.
  ======================================================= */

  useEffect(() => {

    requestAnimationFrame(() => {

      documentNoRef.current?.focus();

    });

  }, [
    documentNoRef,
  ]);


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
        */

        if (
          selectText &&
          element instanceof HTMLInputElement &&
          element.type !== "checkbox"
        ) {

          try {

            element.select();

          } catch {

            // Ignore selection errors

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

      const select =
        selectRef.current;


      if (!select) {
        return;
      }


      try {

        select.focus();

      } catch {

        // Ignore temporary focus errors

      }

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

      requestAnimationFrame(() => {

        switch (field) {

          /* -------------------------------------------------
             RELOAD
          ------------------------------------------------- */

          case "reload":

            actionsRef.current?.focusReload?.();

            break;


          /* -------------------------------------------------
             SAVE
          ------------------------------------------------- */

          case "save":

            actionsRef.current?.focusSave?.();

            break;


          /* -------------------------------------------------
             SEARCH
          ------------------------------------------------- */

          case "search":

            actionsRef.current?.focusSearch?.();

            break;


          /* -------------------------------------------------
             MODIFY
          ------------------------------------------------- */

          case "modify":

            actionsRef.current?.focusModify?.();

            break;


          /* -------------------------------------------------
             DELETE
          ------------------------------------------------- */

          case "delete":

            actionsRef.current?.focusDelete?.();

            break;


          /* -------------------------------------------------
             PRINT
          ------------------------------------------------- */

          case "print":

            actionsRef.current?.focusPrint?.();

            break;


          /* -------------------------------------------------
             POST
          ------------------------------------------------- */

          case "post":

            actionsRef.current?.focusPost?.();

            break;


          /* -------------------------------------------------
             ATTACH
          ------------------------------------------------- */

          case "attach":

            actionsRef.current?.focusAttach?.();

            break;


          /* -------------------------------------------------
             CLEAR
          ------------------------------------------------- */

          case "clear":

            actionsRef.current?.focusClear?.();

            break;

        }

      });

    },
    [
      actionsRef,
    ]
  );


  /* =======================================================
     7. DEFAULT FOCUS FUNCTION
     
     Can also be called manually after Reload/Clear
     if you want Receipt No. to become the starting field.
  ======================================================= */

  const focusDefault = useCallback(() => {

    focusElement(
      documentNoRef.current,
      true
    );

  }, [
    documentNoRef,
    focusElement,
  ]);


  /* =======================================================
     RETURN
  ======================================================= */

  return {

    /* Header */

    focusHeaderField,


    /* Table */

    focusTableField,


    /* Bottom */

    focusBottomField,


    /* Actions */

    focusActionButton,


    /* Individual focus helpers */

    focusElement,

    focusSelect,

    focusDefault,

  };

};


export default useReceiptKeyboard;