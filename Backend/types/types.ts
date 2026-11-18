type DbValue = unknown;

export interface ReceiptProcedureParams {
  strMode: string;
  pstrCoID?: string;
  pstrYear: string;
  lkpBranch?: DbValue;
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
  numDebitCredit?: DbValue;
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
  strGCS?: string;
  lkpCCID?: string;
  lkpDivID?: string;
  txtDebitCredit?: string | number;
  txtDescription?: string;
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
  cbCcId?: DbValue;
  rows?: ReceiptRow[];
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

/* kept because GetData service (not shown) likely imports it */
export interface GetDataParams {
  pstrCoID: unknown;
  pstrYear: unknown;
  lkpBranch: unknown;
  lkpType: unknown;
  strDocType: unknown;
  txtDocNo: unknown;
}