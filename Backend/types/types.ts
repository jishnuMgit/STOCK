export interface MatchRow {
  fCSAccountID?: string;
  fMAccountSlNo?: number;
  fMAccountSlNoSub?: number;
  fDebit?: number;
  fCredit?: number;
  fMatch?: boolean;
  fMatchDocAmt?: number;
  fAdjAmt?: number;

  // Other fields returned by SP_GetPendingMatchDocs
  [key: string]: any;
}
type DbValue = unknown;
type DbRow = Record<string, any>;

export interface GetDocumentsToMatchParams {
  customerAccountId: string; // fCSAccountID
  docNo: string;              // fDocNo
  brId: string;               // fBrID
  docType: string;             // fDocTypeID
  divId: string;               // fDivID
  year: string;
  matchAccountSlNo: number;    // fSlNo
  matchAccountSlNoSub: number; // fSlNoSub

   debit: number;
  credit: number;
  matchDocAmt: number;
}

export interface GetDataMatchParams {
  strMode: string;
  strDocType: string;
  strDocNo: string;
  strCSAccountID: string;
  intMAccountSlNo: number;
  intMAccountSlNoSub: number;
  strUMDKey: string;
}

export interface MatchTotalParams {
  dtMatch: MatchRow[];
  customerAccountId: string;
  matchAccountSlNo: number;
  matchAccountSlNoSub: number;

  strMode: string;

  numDebitForAllocate: number;
  numCreditForAllocate: number;

  amount: number;
}

export interface ReceiptProcedureParams {
  mode: string;
  lkpBranch?: DbValue;
  docType?: DbValue;
  docNo?: DbValue;
  slNo?: DbValue;
  receiptDate?: DbValue;
  cbAccountId?: DbValue;
  receivedFrom?: DbValue;
  reference?: DbValue;
  accountId?: DbValue;
  gcs?: DbValue;
  division?: DbValue;
  ccId?: DbValue;
  debit?: DbValue;
  credit?: DbValue;
  description?: DbValue;
  note?: DbValue;
  match?: DbValue;
  userId?: DbValue;
  userDate?: DbValue;
  details?: DbValue;
}

export interface ReceiptRow {
  id?: number;
  slNo?: number | string;
  accountId?: string;
  accountName?: string;
  gcs?: string;
  fgcs?: string;
  ccId?: string;
  division?: string;
  divId?: string;
  creditAmount?: string | number;
  debit?: string | number;
  credit?: string | number;
  description?: string;
  note?: string;
  match?: boolean | string | number;
}

export interface ReceiptData {
  lkpBranch?: DbValue;
  lkpType?: DbValue;
  cashBank?: DbValue;
  txtReceiptNo?: DbValue;
  receiptDate?: DbValue;
  receivedFrom?: DbValue;
  reference?: DbValue;
  note?: DbValue;
  docNo?:DbValue;
  cbCcId?: DbValue;
  rows?: ReceiptRow[];
}

export interface DeleteReceiptData{
   lkpBranch?: DbValue;
  type?: DbValue;
    receiptNo?: DbValue;

}

export interface ReceiptHeaderParams {
  lkpBranch?: DbValue;
  docType?: DbValue;
  docNo?: DbValue;
}

export interface ReceiptDocumentParams {
  lkpBranch?: DbValue;
  lkpType?: DbValue;
  txtReceiptNo?: DbValue;
}

export interface SaveReceiptLineParams {
  lkpBranch?: DbValue;
  docType?: DbValue;
  docNo?: DbValue;
  slNo?: DbValue;
  receiptDate?: DbValue;
  receivedFrom?: DbValue;
  reference?: DbValue;
  cbAccountId?: DbValue;
  accountId?: DbValue;
  gcs?: DbValue;
  ccId?: DbValue;
  debit?: DbValue;
  credit?: DbValue;
  description?: DbValue;
  note?: DbValue;
  division?: DbValue;
  match?: DbValue;
  createdUserDate?: DbValue;
}

export interface SaveGeneratedEntryParams {
  lkpBranch?: DbValue;
  docType?: DbValue;
  docNo?: DbValue;
  receiptDate?: DbValue;
  receivedFrom?: DbValue;
  reference?: DbValue;
  cbAccountId?: DbValue;
  gcs?: DbValue;
  ccId?: DbValue;
  credit?: DbValue;
  description?: DbValue;
  note?: DbValue;
  division?: DbValue;
  match?: DbValue;
  createdUserDate?: DbValue;
}

export interface GetDataParams {
  lkpBranch: unknown;
  lkpType: unknown;
  txtReceiptNo: unknown;
}
