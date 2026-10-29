import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dayjs from "dayjs";

import {
  type MatchingComponentsRef,
  type ReceiptRow,
  type SelectOption,
} from "../../../../components/Transaction/Match/types";
import MatchingComponents from "../../../../components/Transaction/Match/MatchingComponents";
import useMatching from "../../../../hooks/useMatching";
import { apiFetch, getSession } from "../../../../utils/session";
import { toast } from "react-toastify";

interface CustomerAccount {
  fcsaccountid: string;
  fcsaccountname: string;
}
interface DocType {
  fdocname: string;
  fdoctype: string;
}

const MIN_ROWS = 11;
const CO_ID = import.meta.env.VITE_CO_ID ?? "";
const DEFAULT_YEAR = import.meta.env.VITE_YEAR ?? "";
// TODO: set to whatever strMode your old caller passed to SP_frmMatchAccounts
const SAVE_MODE = "S";

/* ---------- helpers ---------- */

const getField = (row: Record<string, any> | undefined, name: string): any => {
  if (!row) return undefined;
  if (name in row) return row[name];
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key ? row[key] : undefined;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtDate = (v: unknown): string => {
  if (!v) return "";
  const d = dayjs(v as string);
  return d.isValid() ? d.format("DD-MM-YYYY") : String(v);
};

const blankRow = (id: number): ReceiptRow => ({
  id,
  brId: "",
  date: "",
  type: "",
  docNo: "",
  description: "",
  docAmount: 0,
  debit: 0,
  credit: 0,
  match: false,
  matchAmount: 0,
  raw: undefined,
});

const createRows = (): ReceiptRow[] =>
  Array.from({ length: MIN_ROWS }, (_, i) => blankRow(i + 1));

const mapDocsToRows = (docs: Record<string, any>[]): ReceiptRow[] => {
  const rows: ReceiptRow[] = docs.map((d, i) => ({
    id: i + 1,
    brId: String(getField(d, "fBrID") ?? ""),
    date: fmtDate(getField(d, "fDate")),
    type: String(getField(d, "fDocType") ?? ""),
    // show fdoctypeno (e.g. "CR RH-26000002"); fall back to fdocno when null
    docNo:
      String(getField(d, "fDocTypeNo") ?? "").trim() ||
      String(getField(d, "fDocNo") ?? ""),
    description: String(getField(d, "fDescription") ?? ""),
    docAmount: num(getField(d, "fDocAmt")),
    debit: num(getField(d, "fDebit")),
    credit: num(getField(d, "fCredit")),
    match: false,
    matchAmount: 0,
    raw: d,
  }));
  while (rows.length < MIN_ROWS) rows.push(blankRow(rows.length + 1));
  return rows;
};

/* ========================================================= */

const MatchPage: React.FC = () => {
  const [branch, setBranch] = useState("");
  const [doctype, setDocType] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [divisionId, setDivisionId] = useState("");

  const [rows, setRows] = useState<ReceiptRow[]>(createRows());
  const [searchResults, setSearchResults] = useState<Record<string, any>[]>([]);

  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [customerOptions, setCustomerOptions] = useState<SelectOption[]>([]);
  const [customerNameOptions, setCustomerNameOptions] = useState<
    SelectOption[]
  >([]);
  const [divisionOptions] = useState<SelectOption[]>([]);
  const [documentOptions, setDocumentOptions] = useState<SelectOption[]>([]);

  const matchingRef = useRef<MatchingComponentsRef | null>(null);

  const { getDocumentsToMatch, getMatchDate, saveMatch, saving } =
    useMatching();

  /* ---------- the document currently selected in "Document No." ---------- */

  const selectedDoc = useMemo(
    () =>
      receiptNo
        ? searchResults.find(
            (r) => String(getField(r, "fDocNo") ?? "") === receiptNo,
          )
        : undefined,
    [receiptNo, searchResults],
  );

  const selectedDebit = num(getField(selectedDoc, "fDebit"));
  const selectedCredit = num(getField(selectedDoc, "fCredit"));

  /* ---------- row change (with VB chkMatch behaviour) ---------- */

  const handleRowChange = useCallback(
    (
      rowIndex: number,
      field: keyof ReceiptRow,
      value: string | number | boolean,
    ) => {
      setRows((prev) =>
        prev.map((row, index) => {
          if (index !== rowIndex) return row;

          // blank filler rows can't be matched
          if (field === "match" && !row.raw) return row;

          const updated = { ...row, [field]: value } as ReceiptRow;

          // VB chkMatch_EditValueChanged: checked -> debit - credit, else 0
          if (field === "match") {
            updated.matchAmount = value ? row.debit - row.credit : 0;
          }
          return updated;
        }),
      );
    },
    [],
  );

  /* ---------- load dropdown data (one request) ---------- */

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch(
          `${import.meta.env.VITE_API_URL}/Match/getCSAccounts`,
        );
        if (!response.ok) throw new Error("Failed to load matching data");
        const data = await response.json();

        if (Array.isArray(data?.branchOptions))
          setBranchOptions(data.branchOptions);
        if (data?.branch) setBranch(data.branch);

        if (Array.isArray(data?.AccountID)) {
          setCustomerOptions(
            (data.AccountID as CustomerAccount[])
              .map((a) => ({ value: a.fcsaccountid, label: a.fcsaccountname }))
              .sort((a, b) =>
                a.value.localeCompare(b.value, undefined, {
                  numeric: true,
                  sensitivity: "base",
                }),
              ),
          );
        }

        if (Array.isArray(data?.AccountName)) {
          setCustomerNameOptions(
            (data.AccountName as CustomerAccount[])
              .map((a) => ({ value: a.fcsaccountname, label: a.fcsaccountid }))
              .sort((a, b) =>
                a.value.localeCompare(b.value, undefined, {
                  sensitivity: "base",
                }),
              ),
          );
        }

        if (Array.isArray(data?.DocType)) {
          setDocumentOptions(
            (data.DocType as DocType[]).map((d) => ({
              value: d.fdoctype,
              label: d.fdocname,
            })),
          );
        }
      } catch (error) {
        console.error("Matching data load error:", error);
      }
    };
    load();
  }, []);

  /* ---------- when a document is picked: load match grid + default date ---------- */

  useEffect(() => {
    if (!selectedDoc) {
      setRows(createRows());
      return;
    }

    let cancelled = false;

    const brId = String(getField(selectedDoc, "fBrID") ?? "");
    const docType = String(getField(selectedDoc, "fDocType") ?? doctype);
    const year = getField(selectedDoc, "fYear") ?? getSession().pstrYear;

    (async () => {
      try {
        const docs = await getDocumentsToMatch({
          customerAccountId: customerId,
          docNo: receiptNo,
          brId,
          docType,
          divId: divisionId,
          year,
          matchAccountSlNo: num(getField(selectedDoc, "fSlNo")),
          matchAccountSlNoSub: num(getField(selectedDoc, "fSlNoSub")),
          debit: selectedDebit,
          credit: selectedCredit,
          matchDocAmt: selectedDebit || selectedCredit,
          coId: CO_ID,
        });
        if (!cancelled) setRows(mapDocsToRows(docs));
      } catch (error) {
        console.error("Get documents to match error:", error);
        if (!cancelled) {
          setRows(createRows());
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load documents to match",
          );
        }
      }

      // default the match (effective) date if the user hasn't picked one
      const date = await getMatchDate({
        year,
        brId,
        docType,
        docNo: receiptNo,
      });
      if (!cancelled && date) {
        setReceiptDate((current) => current || fmtDate(date));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoc]);

  /* ---------- totals ---------- */

  const documentAmount = selectedDebit > 0 ? selectedDebit : selectedCredit;

  const totalMatchAmount = Math.abs(
    rows.reduce((t, r) => (r.match ? t + Number(r.matchAmount || 0) : t), 0),
  );

  const balance = documentAmount - totalMatchAmount;

  /* ---------- search callback (from MatchingComponents) ---------- */

  const handleSearch = useCallback((data?: any[]) => {
    setSearchResults(Array.isArray(data) ? data : []);
    setReceiptNo("");
    setRows(createRows());
  }, []);

  /* ---------- clear ---------- */

  const clearForm = useCallback(() => {
    setBranch("");
    setDocType("");
    setReceiptNo("");
    setReceiptDate("");
    setCustomerId("");
    setCustomerName("");
    setDivisionId("");
    setSearchResults([]);
    setRows(createRows());
    requestAnimationFrame(() => matchingRef.current?.focusCustomerId());
  }, []);

  /* ---------- save ---------- */

  const handleSave = useCallback(async () => {
    if (!selectedDoc) {
      toast.error("Please select a 'Document No.'");
      return;
    }

    const matchedRows = rows.filter((r) => r.match && r.raw);
    if (matchedRows.length === 0) {
      toast.error("No matched records to save");
      return;
    }

    const efDate = dayjs(receiptDate, "DD-MM-YYYY", true);
    if (!efDate.isValid()) {
      toast.error("Please select Match Date");
      return;
    }

    const slNo = num(getField(selectedDoc, "fSlNo"));
    const slNoSub = num(getField(selectedDoc, "fSlNoSub"));
    const accountId = String(getField(selectedDoc, "fAccountID") ?? customerId);

    // parent row (VB dtData)
    const data = [
      {
        fAccountID: accountId,
        fSlNo: slNo,
        fSlNoSub: slNoSub,
        fMatch: true,
        fDescription: getField(selectedDoc, "fDescription") ?? " ",
      },
    ];

    // child rows (VB dtMatch) – link each to the parent
    const match = matchedRows.map((r) => ({
      ...r.raw,
      fAccountID: accountId,
      fMAccountSlNo: slNo,
      fMAccountSlNoSub: slNoSub,
      fMatch: true,
      fDebit: r.debit,
      fCredit: r.credit,
      fMatchAmt: r.matchAmount,
    }));

    try {
      const result = await saveMatch({
        strMode: SAVE_MODE,
        year: getField(selectedDoc, "fYear") ?? getSession().pstrYear,
        brId: String(getField(selectedDoc, "fBrID") ?? ""),
        docType: String(getField(selectedDoc, "fDocType") ?? doctype),
        docNo: receiptNo,
        intDocNo: num(getField(selectedDoc, "fIntDocNo")),
        docDate: String(getField(selectedDoc, "fDate") ?? ""),
        efDate: efDate.format("YYYY-MM-DD"),
        divId: divisionId,
        totalAmount: documentAmount,
        data,
        match,
      });

      toast.success(result.message || "Match saved successfully");
      clearForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save match",
      );
    }
  }, [
    selectedDoc,
    rows,
    receiptDate,
    customerId,
    doctype,
    receiptNo,
    divisionId,
    documentAmount,
    saveMatch,
    clearForm,
  ]);

  useEffect(() => {
    requestAnimationFrame(() => matchingRef.current?.focusCustomerId());
  }, []);

  return (
    <div className="min-h-full w-full bg-slate-100 px-2 py-2 flex items-center justify-center">
      <div className="w-full max-w-287.5 min-w-0 border border-gray-400 bg-white">
        <MatchingComponents
          ref={matchingRef}
          branch={branch}
          setBranch={setBranch}
          type={doctype}
          setDocType={setDocType}
          receiptNo={receiptNo}
          setReceiptNo={setReceiptNo}
          receiptDate={receiptDate}
          setReceiptDate={setReceiptDate}
          customerId={customerId}
          setCustomerId={setCustomerId}
          customerName={customerName}
          setCustomerName={setCustomerName}
          divisionId={divisionId}
          setDivisionId={setDivisionId}
          rows={rows}
          handleRowChange={handleRowChange}
          onSave={saving ? () => {} : handleSave}
          clearForm={clearForm}
          onSearch={handleSearch}
          branchOptions={branchOptions}
          customerOptions={customerOptions}
          customerNameOptions={customerNameOptions}
          divisionOptions={divisionOptions}
          documentOptions={documentOptions}
          documentAmount={documentAmount}
          totalMatchAmount={totalMatchAmount}
          balance={balance}
        />
      </div>
    </div>
  );
};

export default MatchPage;
