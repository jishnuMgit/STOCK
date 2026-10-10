
import type React from "react";

/* =========================================================
   RECEIPT ROW
========================================================= */

export interface ReceiptRow {
  id: number;
  parentChild: string;
  brId: string;
  date: string;
  type: string;
  docNo: string;
  description: string;
  docAmount: number;
  debit: number;
  credit: number;
  matchApplyDate: string;
  match: boolean;
  matchAmount: number;
}
/* =========================================================
   TABLE FIELD
========================================================= */

export type TableField =
  | "parentChild"
  | "brId"
  | "date"
  | "type"
  | "docNo"
  | "description"
  | "docAmount"
  | "debit"
  | "credit"
  | "matchApplyDate"
  | "match"
  | "matchAmount";
/* =========================================================
   SELECT OPTION
========================================================= */

export interface SelectOption {
  value: string;
  label: string;
}

/* =========================================================
   DOCUMENT OPTION
========================================================= */

export interface DocumentOption extends SelectOption {
  brId: string;
  date: string;
  docType: string;
  docNo: string;
  debit: string;
  credit: string;
  description: string;
}

/* =========================================================
   MATCHING COMPONENT REF
========================================================= */

export interface MatchingComponentsRef {
  focusCustomerId: () => void;

  focusTableField: (
    rowIndex: number,
    field: TableField
  ) => void;

  focusNote: () => void;

  focusSave: () => void;
}

/* =========================================================
   SHARED TABLE REFS
========================================================= */

export type MatchingTableRefs = React.MutableRefObject<
  Record<string, HTMLElement | null>
>;
