/* =========================================================
   SHARED RECEIPT TYPES
========================================================= */

export type ReceiptValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;


/* =========================================================
   DATABASE ROW
========================================================= */

export type DbRow = Record<string, any>;


/* =========================================================
   COMMON PROCEDURE PARAMETERS
========================================================= */

export interface ReceiptProcedureParams {
  mode: string;

  branch?: string;
  docType?: string | null;
  docNo?: string;

  slNo?: number | string;

  receiptDate?: ReceiptValue;

  receivedFrom?: ReceiptValue;
  reference?: ReceiptValue;

  cbAccountId?: ReceiptValue;
  cbCcId?: ReceiptValue;

  accountId?: ReceiptValue;
  gcs?: ReceiptValue;
  ccId?: ReceiptValue;

  forDocNo?: ReceiptValue;

  credit?: ReceiptValue;

  description?: ReceiptValue;
  note?: ReceiptValue;

  division?: ReceiptValue;
  match?: ReceiptValue;

  userId?: ReceiptValue;
  createdUserId?: ReceiptValue;
  createdUserDate?: ReceiptValue;

  update20201206?: boolean;
}


/* =========================================================
   PROCEDURE INPUT WITHOUT MODE
========================================================= */

export type ReceiptProcedureInput =
  Omit<ReceiptProcedureParams, "mode">;


/* =========================================================
   GENERATED ENTRY PARAMETERS
========================================================= */

export interface SaveGeneratedEntryParams
  extends ReceiptProcedureInput {
  total?: ReceiptValue;
}


/* =========================================================
   RECEIPT ROW
========================================================= */

export interface ReceiptRow {
  id?: number;

  slNo?: number | string;

  accountId?: string;
  accountName?: string;

  gcs?: string;
  fgcs?: string;

  ccId?: string;
  forDocNo?: string;

  division?: string;
  divId?: string;

  creditAmount?: string | number;

  description?: string;

  match?: boolean | string | number;
}


/* =========================================================
   RECEIPT DATA
========================================================= */

export interface ReceiptData {
  branch?: string;

  type?: string;

  cashBank?: string;

  receiptNo?: string;

  receiptDate?: string | Date;

  receivedFrom?: string;

  reference?: string;

  note?: string;

  cbCcId?: string;

  cashBankCcId?: string;

  rows?: ReceiptRow[];

  total?: string | number;
}


/* =========================================================
   GET RECEIPT PARAMETERS
========================================================= */

export interface ReceiptHeaderParams {
  branch?: string;

  docType?: string;

  docNo?: string;
}


/* =========================================================
   DELETE RECEIPT PARAMETERS
========================================================= */

export interface DeleteReceiptParams {
  branch?: string;

  type?: string;

  receiptNo?: string;
}


/* =========================================================
   SAVE RESULT
========================================================= */

export interface SaveReceiptResult {
  message: string;

  data: {
    companyId: string;

    year: number;

    branch?: string;

    docType: string | null;

    receiptNo?: string;

    total: number;

    cashBank?: string;

    rowCount: number;
  };
}
