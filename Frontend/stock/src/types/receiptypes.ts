import type { OptionProps } from "react-select";

export interface SelectOption {
  value: string;
  label: string;
  id?: string;
  name?: string;
}


export interface Branch {
  fbrid: string;
  fbrname: string;
}

export interface FinancialParameter {
  fptype: string;
  fpid: string;
  fpname: string;
  fpositionno: number;
}

export interface CostCenter {
  fccid: string;
  fccname: string;
  fpositionno: number;
}

export interface AccountData {
  fcoid: string;
  faccountid: string;
  faccountgroupid?: string;
  fgph: string;
  fgcs: string;
  faccountname: string;
  fhavecc: boolean;
}

export interface ReceiptRow {
  id: number;

  accountId: string;
  accountName: string;

  fgcs: string;

  haveCc: boolean;

  hasDivision: boolean;

  division: string;

  ccId: string;

  creditAmount: string;

  match: boolean;

  description?: string;
}

export interface CustomerDivision {
  fdivid: string;
  fdivname: string;
}

export interface CbAccount {
  fcoid: string;
  faccountid: string;
  faccountgroupid?: string;
  fgph: string;
  fgcs: string;
  faccountname: string;
}

export interface AccountResponse {
  message?: string;
  success: boolean;
  cashorbank: string;
  data: CbAccount[];
}



export interface ReceiptDocNumberResponse {
  success: boolean;

  data: {
    fdocno: string;
    fdocnolen: number
  }[];

  message?: string;
}



export interface AccountOption {
  value: string;
  label: string;

  accountId: string;
  accountName: string;

  fgcs: string;

  haveCc: boolean;
}



export interface AccountOptionProps
  extends OptionProps<AccountOption, false> {
  displayMode: "id" | "name";
}