import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { SelectInstance } from "react-select";

import JournalTable, {
  type TableField,
  type JournalTableRef,
  type JournalRow,
  type AccountData,
  type CostCenter,
} from "../../../../components/Transaction/Journal/JournalTable";
import JournalForm from "../../../../components/Transaction/Journal/JournalForm";
import JournalHeader from "../../../../components/Transaction/Journal/JournalHeader";
import JournalBottomForm from "../../../../components/Transaction/Journal/JournalBottomForm";
import JournalActions, {
  type JournalActionsRef,
} from "../../../../components/Transaction/Journal/JournalActions";

// TODO: adjust the path to where useJournal.ts is placed
import {
  useJournal,
  type Branch,
  type JournalType,
} from "../../../../hooks/useJournal";

/* =========================================================
   HELPERS
========================================================= */

const createRows = (): JournalRow[] =>
  Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    accountId: "",
    accountName: "",
    fgcs: "",
    division: "",
    ccId: "",
    debitAmount: "",
    creditAmount: "",
    match: false,
    description: "",
  }));

const todayDDMMYYYY = (): string => {
  const today = new Date();

  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}/${today.getFullYear()}`;
};

/* DD/MM/YYYY -> YYYY-MM-DD (what useJournal / the API expects) */
const toIsoDate = (value: string): string => {
  const [day, month, year] = value.split("/");

  return day && month && year ? `${year}-${month}-${day}` : "";
};

/* YYYY-MM-DD -> DD/MM/YYYY */
const fromIsoDate = (value: string): string => {
  const [year, month, day] = value.split("-");

  return year && month && day ? `${day}/${month}/${year}` : "";
};

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/* =========================================================
   TABLE FIELD ORDER
========================================================= */

const tableFieldOrder: TableField[] = [
  "accountId",
  "accountName",
  "division",
  "ccId",
  "debitAmount",
  "creditAmount",
  "match",
  "view",
];

/* =========================================================
   JOURNAL PAGE
========================================================= */

const JournalPage: React.FC = () => {
  const {
    fetchBranches,
    fetchDefaultBranch,
    fetchJournalTypes,
    fetchNextDocNo,
    fetchLookups,
    fetchJournal,
    saveJournal,
  } = useJournal();

  /* =======================================================
     STATE
  ======================================================= */

  const [branch, setBranch] = useState("");
  const [type, setType] = useState("");
  const [journalNo, setJournalNo] = useState("");
  const [journalDate, setJournalDate] = useState(todayDDMMYYYY);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<JournalRow[]>(createRows);

  const [activeDescriptionRow, setActiveDescriptionRow] = useState<
    number | null
  >(null);

  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);

  /* true when the typed journal no. was loaded from the database */
  const [isExisting, setIsExisting] = useState(false);

  /* journal number loading + manual refresh (after save / clear) */
  const [journalNoLoading, setJournalNoLoading] = useState(false);
  const [docNoRefresh, setDocNoRefresh] = useState(0);

  /* lookups from the API */
  const [branchList, setBranchList] = useState<Branch[]>([]);
  const [typeList, setTypeList] = useState<JournalType[]>([]);
  const [accountOptions, setAccountOptions] = useState<AccountData[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  const defaultBranchRef = useRef("");
  const defaultTypeRef = useRef("");

  /* =======================================================
     REFS
  ======================================================= */

  const branchRef = useRef<SelectInstance<
    { value: string; label: string },
    false
  > | null>(null);

  const typeRef = useRef<SelectInstance<
    { value: string; label: string },
    false
  > | null>(null);

  const journalNoRef = useRef<HTMLInputElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const journalTableRef = useRef<JournalTableRef>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const descriptionRef = useRef<HTMLInputElement | null>(null);
  const actionsRef = useRef<JournalActionsRef>(null);

  /* =======================================================
     LOAD BRANCHES / DEFAULT BRANCH / LOOKUPS
  ======================================================= */

  useEffect(() => {
    let active = true;

    const loadLookups = async () => {
      try {
        const [branches, defaultBranch, types, lookups] = await Promise.all([
          fetchBranches(),
          fetchDefaultBranch(),
          // if the types call fails, fall back to the single "Standard" type
          fetchJournalTypes().catch((): JournalType[] => []),
          fetchLookups(),
        ]);

        if (!active) {
          return;
        }

        setBranchList(branches);

        const initialBranch = branches.some((b) => b.id === defaultBranch)
          ? defaultBranch
          : (branches[0]?.id ?? "");

        defaultBranchRef.current = initialBranch;

        setBranch(initialBranch);

        const journalTypes: JournalType[] = types.length
          ? types
          : [{ value: "JV", label: "Journal" }];

        defaultTypeRef.current = journalTypes[0].value;

        setTypeList(journalTypes);

        setType((current) =>
          journalTypes.some((item) => item.value === current)
            ? current
            : journalTypes[0].value,
        );

        setAccountOptions(lookups.accounts);

        setCostCenters(lookups.costCenters);
      } catch (error: unknown) {
        // TODO: replace with the project's toast / message component
        alert(error instanceof Error ? error.message : "Failed to load data");
      }
    };

    loadLookups();

    branchRef.current?.focus();

    return () => {
      active = false;
    };
  }, [fetchBranches, fetchDefaultBranch, fetchJournalTypes, fetchLookups]);

  /* =======================================================
     NEXT JOURNAL NUMBER (branch / type change, after clear)
  ======================================================= */

  useEffect(() => {
    setIsExisting(false);

    if (!branch || !type) {
      setJournalNo("");
      return;
    }

    let active = true;

    setJournalNoLoading(true);

    fetchNextDocNo(branch)
      .then((docNo) => {
        if (active) {
          setJournalNo(docNo);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setJournalNo("");

          // TODO: replace with the project's toast / message component
          alert(
            error instanceof Error
              ? error.message
              : "Failed to get journal number",
          );
        }
      })
      .finally(() => {
        if (active) {
          setJournalNoLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [branch, type, docNoRefresh, fetchNextDocNo]);

  /* =======================================================
     BRANCH / TYPE SELECT OPTIONS
  ======================================================= */

  const branchSelectOptions = useMemo(
    () => branchList.map((item) => ({ value: item.id, label: item.name })),
    [branchList],
  );

  const typeSelectOptions = useMemo(
    () => typeList.map((item) => ({ value: item.value, label: item.label })),
    [typeList],
  );

  /* =======================================================
     FOCUS TABLE FIELD
  ======================================================= */

  const focusTableField = useCallback((rowIndex: number, field: TableField) => {
    journalTableRef.current?.focusField(rowIndex, field);
  }, []);

  const focusNote = useCallback(() => {
    requestAnimationFrame(() => {
      const noteInput = noteRef.current;

      if (!noteInput) {
        return;
      }

      noteInput.focus();

      const position = noteInput.value.length;

      noteInput.setSelectionRange(position, position);
    });
  }, []);

  /* =======================================================
     JOURNAL NO. CHANGE / ENTER (load existing journal)
  ======================================================= */

  const handleJournalNoChange = useCallback((value: string) => {
    setJournalNo(value);
    setIsExisting(false);
  }, []);

  const handleJournalNoEnter = useCallback(async () => {
    const docNo = journalNo.trim();

    if (!branch || !docNo) {
      dateRef.current?.focus();
      return;
    }

    const result = await fetchJournal(branch, docNo);

    /* not found = new journal */
    if (!result) {
      setIsExisting(false);
      dateRef.current?.focus();
      return;
    }

    const loaded: JournalRow[] = result.rows.map((line, index) => {
      const account = accountOptions.find(
        (item) => item.faccountid === line.accountId,
      );

      return {
        id: index + 1,
        accountId: line.accountId,
        accountName: account?.faccountname ?? "",
        fgcs: account?.fgcs ?? "",
        division: "",
        ccId: line.ccId,
        debitAmount: Number(line.debit) ? line.debit : "",
        creditAmount: Number(line.credit) ? line.credit : "",
        match: false,
        description: line.description,
      };
    });

    setRows([...loaded, ...createRows().slice(loaded.length)]);
    setJournalDate(fromIsoDate(result.header.date));
    setNote(result.header.note);
    setIsExisting(true);

    focusTableField(0, "accountId");
  }, [branch, journalNo, fetchJournal, accountOptions, focusTableField]);

  /* =======================================================
     ROW CHANGE
  ======================================================= */

  const handleRowChange = useCallback(
    (id: number, field: keyof JournalRow, value: string | boolean) => {
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === id ? { ...row, [field]: value } : row,
        ),
      );
    },
    [],
  );

  /* =======================================================
     TABLE ESCAPE -> NOTE
  ======================================================= */

  const handleTableEscape = useCallback(() => {
    setActiveDescriptionRow(null);

    focusNote();
  }, [focusNote]);

  /* =======================================================
     TABLE ENTER
  ======================================================= */

  const handleTableEnter = useCallback(
    (rowIndex: number, field: TableField) => {
      /* VIEW -> DESCRIPTION */

      if (field === "view") {
        setActiveDescriptionRow(rowIndex);

        const row = rows[rowIndex];

        setDescription(row?.description?.trim() ? row.description : "");

        requestAnimationFrame(() => {
          const input = descriptionRef.current;

          if (!input) {
            return;
          }

          input.focus();

          const position = input.value.length;

          input.setSelectionRange(position, position);
        });

        return;
      }

      /* NEXT FIELD */

      const nextField = tableFieldOrder[tableFieldOrder.indexOf(field) + 1];

      if (nextField) {
        focusTableField(rowIndex, nextField);
        return;
      }

      if (rowIndex + 1 < rows.length) {
        focusTableField(rowIndex + 1, "accountId");
      }
    },
    [focusTableField, rows],
  );

  /* =======================================================
     DESCRIPTION CHANGE
  ======================================================= */

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);

      if (activeDescriptionRow === null) {
        return;
      }

      const activeRow = rows[activeDescriptionRow];

      if (!activeRow) {
        return;
      }

      const activeRowId = activeRow.id;

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === activeRowId ? { ...row, description: value } : row,
        ),
      );
    },
    [activeDescriptionRow, rows],
  );

  /* =======================================================
     DESCRIPTION ENTER
  ======================================================= */

  const handleDescriptionEnter = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (activeDescriptionRow === null) {
        focusTableField(0, "accountId");
        return;
      }

      const nextRow = activeDescriptionRow + 1;

      /* LAST ROW -> NOTE */

      if (nextRow >= rows.length) {
        setActiveDescriptionRow(null);

        focusNote();

        return;
      }

      /* NEXT ROW -> ACCOUNT ID */

      focusTableField(nextRow, "accountId");
    },
    [activeDescriptionRow, focusTableField, focusNote, rows.length],
  );

  const handleRowFocus = useCallback(
    (rowIndex: number) => {
      setActiveDescriptionRow(rowIndex);
      setDescription(rows[rowIndex]?.description ?? "");
    },
    [rows],
  );

  /* =======================================================
     NOTE ENTER -> SAVE
  ======================================================= */

  const handleNoteEnter = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      requestAnimationFrame(() => {
        actionsRef.current?.focusSave();
      });
    },
    [],
  );

  /* =======================================================
     TOTALS
  ======================================================= */

  const debitTotal = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.debitAmount) || 0), 0),
    [rows],
  );

  const creditTotal = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.creditAmount) || 0), 0),
    [rows],
  );

  /* =======================================================
     VALIDATION (same rules as the VB form / backend)
  ======================================================= */

  const validateJournal = useCallback((): string => {
    if (!branch) {
      return "Please select a 'Branch'";
    }

    if (!journalNo.trim()) {
      return "Please input 'Journal No.'";
    }

    if (!journalDate) {
      return "Please select 'Date'";
    }

    const filledRows = rows.filter((row) => row.accountId.trim() !== "");

    if (filledRows.length === 0) {
      return "There is no information for saving.";
    }

    for (let index = 0; index < filledRows.length; index++) {
      const debit = Number(filledRows[index].debitAmount) || 0;
      const credit = Number(filledRows[index].creditAmount) || 0;

      if (debit < 0 || credit < 0) {
        return `Sl.# : ${index + 1} - Amount cannot be negative`;
      }

      if (debit !== 0 && credit !== 0) {
        return `Sl.# : ${index + 1} - Please input either 'Debit' or 'Credit'`;
      }
    }

    if (round2(debitTotal) !== round2(creditTotal)) {
      return "'Total Credit' must be equal to 'Total Debit'";
    }

    return "";
  }, [branch, journalNo, journalDate, rows, debitTotal, creditTotal]);

  /* =======================================================
     CLEAR FORM
  ======================================================= */

  const clearForm = useCallback(() => {
    setBranch(defaultBranchRef.current);
    setType(defaultTypeRef.current);
    setJournalNo("");
    setJournalDate(todayDDMMYYYY());
    setNote("");
    setDescription("");
    setActiveDescriptionRow(null);
    setRows(createRows());
    setIsExisting(false);
    setDocNoRefresh((count) => count + 1);

    requestAnimationFrame(() => {
      branchRef.current?.focus();
    });
  }, []);

  /* =======================================================
     SAVE JOURNAL
  ======================================================= */

  const handleSave = useCallback(async () => {
    if (saving) {
      return;
    }

    const message = validateJournal();

    if (message) {
      // TODO: replace with the project's toast / message component
      alert(message);
      return;
    }

    try {
      setSaving(true);

      await saveJournal({
        mode: isExisting ? "M" : "S",

        header: {
          brId: branch,
          docNo: journalNo,
          date: toIsoDate(journalDate),
          note,
        },

        rows: rows.map((row) => ({
          accountId: row.accountId,
          ccId: row.ccId,
          description: row.description || "",
          debit: row.debitAmount || "0",
          credit: row.creditAmount || "0",
        })),
      });

      alert(isExisting ? "Modified" : "Saved");

      clearForm();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Not Saved, try again");
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    isExisting,
    validateJournal,
    saveJournal,
    branch,
    journalNo,
    journalDate,
    note,
    rows,
    clearForm,
  ]);

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="min-h-full bg-slate-100 px-3 py-3 flex flex-col justify-center items-center gap-2.5">
      <div className=" mx-auto lg:w-275 md:w-[55%] max-w-362.5 min-w-212.5 border border-gray-400 bg-white">
        <JournalHeader />

        <JournalForm
          branch={branch}
          setBranch={setBranch}
          type={type}
          setType={setType}
          journalNo={journalNo}
          setJournalNo={handleJournalNoChange}
          onJournalNoEnter={handleJournalNoEnter}
          journalDate={journalDate}
          setJournalDate={setJournalDate}
          branchRef={branchRef}
          typeRef={typeRef}
          journalNoRef={journalNoRef}
          dateRef={dateRef}
          focusFirstAccountId={() => focusTableField(0, "accountId")}
          branchOptions={branchSelectOptions}
          typeOptions={typeSelectOptions}
          journalNoLoading={journalNoLoading}
        />

        <div className="p-3">
          <JournalTable
            ref={journalTableRef}
            rows={rows}
            handleRowChange={handleRowChange}
            onFieldEnter={handleTableEnter}
            onTableEscape={handleTableEscape}
            onRowFocus={handleRowFocus}
            accountOptions={accountOptions}
            costCenters={costCenters}
          />
        </div>

        {/* TOTALS */}

        <div className="mt-2 px-3 mr-32 ml-auto flex w-55 flex-col items-end gap-2 text-xs">
          <div className="flex items-center gap-1">
            <input
              value="Total"
              readOnly
              className="h-7 w-18 rounded border border-gray-300 px-2 text-center outline-none"
            />

            <input
              value={debitTotal.toFixed(2)}
              readOnly
              className="h-7 w-25 rounded border border-gray-300 px-2 text-right outline-none"
            />

            <input
              value={creditTotal.toFixed(2)}
              readOnly
              className="h-7 w-25 rounded border border-gray-300 px-2 text-right outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            <label className="whitespace-nowrap text-xs text-slate-600">
              Dr- Cr:
            </label>

            <input
              value={(debitTotal - creditTotal).toFixed(2)}
              readOnly
              className="h-7 w-25 rounded border border-gray-300 px-2 text-right outline-none"
            />
          </div>
        </div>

        <JournalBottomForm
          description={description}
          setDescription={handleDescriptionChange}
          descriptionRef={descriptionRef}
          onDescriptionEnter={handleDescriptionEnter}
          onDescriptionClear={() => handleDescriptionChange("")}
          note={note}
          setNote={setNote}
          noteRef={noteRef}
          onNoteEnter={handleNoteEnter}
        />

        <JournalActions
          ref={actionsRef}
          clearForm={clearForm}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default JournalPage;