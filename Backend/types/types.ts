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