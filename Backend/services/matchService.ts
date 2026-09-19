

import {MatchTotalParams,GetDocumentsToMatchParams,MatchRow} from '../types/types.js'

import {round2,getNumber,getDataMatch} from '../utils/helper.js'
export function matchTotal(params: MatchTotalParams) {
  const {
    dtMatch,
    customerAccountId,
    matchAccountSlNo,
    matchAccountSlNoSub,
    strMode,
    numDebitForAllocate,
    numCreditForAllocate,
    amount,
  } = params;

  let numDrMatched = 0;
  let numCrMatched = 0;

  let numDrMatchedAmt = 0;
  let numCrMatchedAmt = 0;

  // =====================================================
  // Allocated Amount
  // =====================================================

  if (customerAccountId) {

    // ===================================================
    // DEBIT ALLOCATED
    // ===================================================

    const debitAllocated = dtMatch
      .filter(
        (row) =>
          String(row.fCSAccountID ?? "") === customerAccountId &&
          Number(row.fMAccountSlNo ?? 0) ===
            matchAccountSlNo &&
          Number(row.fMAccountSlNoSub ?? 0) ===
            matchAccountSlNoSub &&
          Number(row.fDebit ?? 0) > 0 &&
          row.fMatch === true &&
          Number(row.fMatchDocAmt ?? 0) !== 0
      )
      .reduce(
        (sum, row) =>
          sum + Number(row.fAdjAmt ?? 0),
        0
      );

    numDrMatched += debitAllocated;
    numDrMatchedAmt += debitAllocated;


    // ===================================================
    // CREDIT ALLOCATED
    // ===================================================

    const creditAllocated = dtMatch
      .filter(
        (row) =>
          String(row.fCSAccountID ?? "") === customerAccountId &&
          Number(row.fMAccountSlNo ?? 0) ===
            matchAccountSlNo &&
          Number(row.fMAccountSlNoSub ?? 0) ===
            matchAccountSlNoSub &&
          Number(row.fCredit ?? 0) > 0 &&
          row.fMatch === true &&
          Number(row.fMatchDocAmt ?? 0) !== 0
      )
      .reduce(
        (sum, row) =>
          sum + Number(row.fAdjAmt ?? 0),
        0
      );

    numCrMatched += creditAllocated;
    numCrMatchedAmt += creditAllocated;


    // Same as VB.NET
    numCrMatched *= -1;
    numCrMatchedAmt *= -1;
  }


  // =====================================================
  // Non Matched Records
  // =====================================================

  if (strMode === "GNM") {

    if (numDebitForAllocate > 0) {
      numDrMatched += numDebitForAllocate;
    } else {
      numCrMatched += numCreditForAllocate;
    }
  }


  // =====================================================
  // Round
  // =====================================================

  numDrMatched = round2(numDrMatched);
  numCrMatched = round2(numCrMatched);


  // =====================================================
  // Calculate Match Amount
  // =====================================================

  let matchedAmount: number;
  let matchBalance: number;
  let difference: number;


  if (numDebitForAllocate > 0) {

    matchedAmount =
      round2(numCrMatchedAmt) -
      round2(numDrMatchedAmt);

    matchBalance =
      amount - matchedAmount;

    difference = round2(
      matchedAmount -
      round2(numCrMatchedAmt) +
      round2(numDrMatchedAmt)
    );

  } else {

    matchedAmount =
      round2(numDrMatchedAmt) -
      round2(numCrMatchedAmt);

    matchBalance =
      amount - matchedAmount;

    difference = round2(
      matchedAmount -
      round2(numDrMatchedAmt) +
      round2(numCrMatchedAmt)
    );
  }


  return {
    drMatched: numDrMatched,
    crMatched: numCrMatched,

    drMatchedAmount: numDrMatchedAmt,
    crMatchedAmount: numCrMatchedAmt,

    matchedAmount: round2(matchedAmount),
    matchBalance: round2(matchBalance),
    difference: round2(difference),
  };
}




export const getDocumentsToMatch=async (
  params: GetDocumentsToMatchParams,
  db: any,
  coId: string
)=> {
  const {
    customerAccountId,
    docNo,
    brId,
    docType,
    divId,
    year,
    matchAccountSlNo,
    matchAccountSlNoSub,
  } = params;

  let dtMatch: MatchRow[] = [];

  let strMode = "";

  // Equivalent:
  // strUMDKey = strYear & strBrID & strDocType & strDocNo

  const strUMDKey =
    `${year}${brId}${docType}${docNo}`;

  /*
   * Equivalent:
   *
   * If dtMatch.Rows.Count = 0 Then
   *     strMode = "GNM"
   *     dtMatch = objMatchAccounts.GetData_Match(...)
   * End If
   */

  if (customerAccountId) {
    if (dtMatch.length === 0) {
      strMode = "GNM";

      dtMatch = await getDataMatch(
        {
          strMode,
          strDocType: docType,
          strDocNo: docNo,
          strCSAccountID: customerAccountId,
          intMAccountSlNo: matchAccountSlNo,
          intMAccountSlNoSub: matchAccountSlNoSub,
          strUMDKey,
        },
        db,
        coId
      );
    }
  }

  /*
   * Equivalent:
   *
   * If fDebit > 0 Then
   */

  const debit = getNumber(params.debit);
const credit = getNumber(params.credit);
const matchDocAmt = getNumber(params.matchDocAmt);

  let blnDrForAllocate: boolean;

  let numDebitForAllocate = 0;
  let numCreditForAllocate = 0;

  if (debit > 0) {
    blnDrForAllocate = true;

    if (matchDocAmt !== 0) {
      numDebitForAllocate = matchDocAmt;
      numCreditForAllocate = 0;
    } else {
      numDebitForAllocate = debit;
      numCreditForAllocate = 0;
    }
  } else {
    blnDrForAllocate = false;

    if (matchDocAmt !== 0) {
      numCreditForAllocate = matchDocAmt;
      numDebitForAllocate = 0;
    } else {
      numCreditForAllocate = credit;
      numDebitForAllocate = 0;
    }
  }

  /*
   * Equivalent to setting:
   *
   * txtAmount
   * txtMatchBalance
   * lblDrCr
   * lblDrCrNet
   * lblSplitAmtDrCr
   */

  let amount: number;
  let matchBalance: number;
  let drCr: "Dr." | "Cr.";

  if (blnDrForAllocate) {
    amount = numDebitForAllocate;
    matchBalance = numDebitForAllocate;
    drCr = "Dr.";
  } else {
    amount = numCreditForAllocate;
    matchBalance = numCreditForAllocate;
    drCr = "Cr.";
  }

  const numForAllocateValidate =
    numDebitForAllocate + numCreditForAllocate;

  /*
   * Equivalent to:
   *
   * Call MatchTotal()
   */

  const totals = matchTotal({
    dtMatch,
    customerAccountId,
    matchAccountSlNo,
    matchAccountSlNoSub,
    strMode,
    numDebitForAllocate,
    numCreditForAllocate,
    amount,
  });

  return {
    rows: dtMatch,

    amount,
    matchBalance,
    drCr,

    numDebitForAllocate,
    numCreditForAllocate,
    numForAllocateValidate,

    matchedAmount: totals.matchedAmount,
    matchBalanceAfterMatch: totals.matchBalance,
    difference: totals.difference,

    blnDrForAllocate,
  };
}