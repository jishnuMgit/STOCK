type DbValue = unknown;
type DbRow = Record<string, any>;

export interface ReceiptProcedureParams {
  strMode: string;
  pstrCoID?: string;
  pstrYear: string;
  lkpBranch?: DbValue;
  lkpType?: DbValue;
  strDocType?: DbValue;
  txtDocNo?: DbValue;
  dtpDate?: DbValue;
  lkpCBAccountName?: DbValue;
  txtReceivedFrom?: DbValue;
  txtReference?: DbValue;
  txtSlNo?: DbValue;
  lkpAccountID?: DbValue;
  strGCS?: DbValue;
  lkpDivID?: DbValue;
  lkpCCID?: DbValue;
  numDebit?: DbValue;
  numCredit?: DbValue;
  txtDescription?: DbValue;
  txtNote?: DbValue;
  chkMatch?: DbValue;
  PstrUserID?: any;
  strUserDate?: DbValue;
  details?: DbValue;
}

export interface ReceiptRow {
  txtslNo?: number | string;
  lkpAccountID?: string;
  lkpAccountName?: string;
  strGCS?: string;
  lkpCCID?: string;
  lkpDivID?: string;
  txtDebitCredit?: string | number;
  numDebit?: string | number;
  numCredit?: string | number;
  txtDescription?: string;
  txtNote?: string;
  ckhMatch?: boolean | string | number;
}

export interface ReceiptData {
  lkpBranch?: DbValue;
  lkpType?: DbValue;
  txtDocNo?: DbValue;
  dtpDate?: DbValue;
  lkpCBAccountName?: DbValue;
  txtReceivedFrom?: DbValue;
  txtReference?: DbValue;
  strNote?: DbValue;
  // txtDocNo?:DbValue;
  cbCcId?: DbValue;
  rows?: ReceiptRow[];
}

export interface DeleteReceiptData {
  lkpBranch?: DbValue;
  type?: DbValue;
  txtDocNo?: DbValue;
}

export interface ReceiptHeaderParams {
  pstrCoID?: any;
  pstrYear?: any;
  lkpBranch?: DbValue;
  lkpType?: DbValue;
  strDocType?: DbValue;
  txtDocNo?: DbValue;
}

export interface ReceiptDocumentParams {
  lkpBranch?: DbValue;
  lkpType?: DbValue;
  txtDocNo?: DbValue;
}

export interface SaveReceiptLineParams {
  pstrCoID?: any;
  pstrYear?: any;
  lkpBranch?: DbValue;
  lkpType?: DbValue;
  strDocType?: DbValue;
  txtDocNo?: DbValue;
  dtpDate?: DbValue;
  lkpCBAccountName?: DbValue;
  txtReceivedFrom?: DbValue;
  txtReference?: DbValue;
  txtSlNo?: DbValue;
  lkpAccountID?: DbValue;
  strGCS?: DbValue;
  lkpDivID?: DbValue;
  lkpCCID?: DbValue;
  numDebit?: DbValue;
  numCredit?: DbValue;
  txtDescription?: DbValue;
  txtNote?: DbValue;
  chkMatch?: DbValue;
  strUserDate?: DbValue;
}

export interface SaveGeneratedEntryParams {
  pstrCoID?: string;
  pstrYear?: string;
  lkpBranch?: DbValue;
  lkpType?: DbValue;
  strDocType?: DbValue;
  txtDocNo?: DbValue;
  dtpDate?: DbValue;
  txtReceivedFrom?: DbValue;
  txtReference?: DbValue;
  lkpCBAccountName?: DbValue;
  strGCS?: DbValue;
  lkpCCID?: DbValue;
  numCredit?: DbValue;
  txtDescription?: DbValue;
  strNote?: DbValue;
  lkpDivID?: DbValue;
  chkMatch?: DbValue;
  strUserDate?: DbValue;
}

export interface GetDataParams {
  pstrCoID: unknown;
  pstrYear: unknown;
  lkpBranch: unknown;
  lkpType: unknown;
  strDocType: unknown;
  txtDocNo: unknown;
}
