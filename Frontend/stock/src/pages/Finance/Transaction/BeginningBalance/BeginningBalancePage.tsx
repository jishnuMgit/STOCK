import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import BeginningBalanceHeader from "../../../../components/Transaction/BeginningBalance/BeginningBalanceHeader";
import BeginningBalanceTable from "../../../../components/Transaction/BeginningBalance/BeginningBalanceTable";
import BeginningBalanceFooter from "../../../../components/Transaction/BeginningBalance/BeginningBalanceFooter";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildBeginningBalancePdf } from "../../../../components/Transaction/BeginningBalance/BeginningBalancePdf";
import {
  buildHtml,
  printBeginningBalanceReport,
  type PrintReport,
} from "../../../../components/Transaction/BeginningBalance/BeginningBalancePrintReport";
import {
  MENU_ID,
  api,
  defaultDate,
  formatAmount,
  padRows,
  toAmount,
  useBeginningBalanceLookups,
  type BeginningBalanceRow,
  type Option,
} from "../../../../components/Transaction/BeginningBalance/BeginningBalanceShared";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../../hooks/useButtonPermissions";
import { useConfirmModal } from "../../../../hooks/useConfirmModal";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";

// ============================================================

// ============================================================

const focusField = (field?: string) => {
  if (!field) return;

  const element =
    document.getElementById(field) ??
    document.querySelector<HTMLElement>(`[name="${field}"]`);

  element?.focus();
};

const round2 = (value: number) => Math.round(value * 100) / 100;

// the title of the question windows
const SCREEN_TITLE = "Beginning Balance";

const BeginningBalance: React.FC = () => {
  const PstrYear = localStorage.getItem("PstrYear") ?? "";

  const perms = useButtonPermissions(MENU_ID);
  // the common themed question window (the same as the Purchase Invoice screen)
  const { confirm, dialog: confirmDialog } = useConfirmModal();

  // the head accounts and the cost centers of the grid's boxes
  const { accountsByID, accountsByName, costCenters } =
    useBeginningBalanceLookups();

  const [lkpBranch, setLkpBranch] = useState<Option | null>(null);
  // the branch list and the user's default branch have been loaded (the cursor can start)
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  // yyyy-mm-dd
  const [dtpDate, setDtpDate] = useState(() => defaultDate(PstrYear));
  const [rows, setRows] = useState<BeginningBalanceRow[]>(() => padRows([]));
  // the branch has a balance: the button says Modify, not Save
  const [chkSaved, setChkSaved] = useState(false);
  // posted: the page is locked
  const [chkPosted, setChkPosted] = useState(false);
  const [txtUserInfo, setTxtUserInfo] = useState("");
  const [saving, setSaving] = useState(false);
  // the Print Preview (after Print): the report the server sent, and the branch and
  // date it was made for (the Excel file is made for the same ones)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    lkpBranch: string;
    dtpDate: string;
    fileBase: string;
  } | null>(null);

  // bumped after a Save / Modify / Delete / Clear so the branch's balance is loaded again
  const [reloadKey, setReloadKey] = useState(0);

  // only the answer of the latest request may fill the grid
  const loadRequest = useRef(0);

  const branchID = lkpBranch?.value ?? "";

  // where the cursor starts: Date when a branch is already chosen (the user's default
  // branch), else the Branch box
  useInitialFocus(branchesLoaded, lkpBranch ? "dtpDate" : "lkpBranch");

  // ----------------------------------------------------------
  // LOAD (the old SetupDocument): the balance of the branch - the lines, the date
  // and who saved / modified it. A branch with no balance gives an empty grid.
  // ----------------------------------------------------------

  useEffect(() => {
    const requestNo = ++loadRequest.current;

    const showNew = () => {
      setRows(padRows([]));
      setChkSaved(false);
      setChkPosted(false);
      setTxtUserInfo("");
    };

    if (branchID === "") {
      showNew();
      return;
    }

    const loadBalance = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getBeginningBalance: no PstrCoID in localStorage");
          return;
        }

        const params = new URLSearchParams({
          PstrCoID,
          PstrYear,
          lkpBranch: branchID,
        });

        const response = await fetch(
          `${api}/BeginningBalance/getBeginningBalance?${params.toString()}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (requestNo !== loadRequest.current) return;

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Beginning Balance");
          showNew();
          return;
        }

        const lines: BeginningBalanceRow[] = (result.data || []).map(
          (row: {
            lkpAccountID: string;
            lkpCCID: string | null;
            txtDebit: string | number | null;
            txtCredit: string | number | null;
          }) => ({
            lkpAccountID: row.lkpAccountID,
            lkpCCID: row.lkpCCID ?? "",
            // a zero amount is left blank
            txtDebit: toAmount(String(row.txtDebit ?? "")) === 0 ? "" : String(row.txtDebit),
            txtCredit: toAmount(String(row.txtCredit ?? "")) === 0 ? "" : String(row.txtCredit),
          }),
        );

        setRows(padRows(lines));
        setChkSaved(Boolean(result.chkSaved));
        setChkPosted(Boolean(result.chkPosted));

        // the date of the saved balance
        if (result.header?.dtpDate) {
          setDtpDate(result.header.dtpDate);
        }

        // "Saved By : X date / Last Modified By : Y date", as the old form showed
        const header = result.header;
        let info = "";

        if (header?.txtSavedBy) {
          info = `Saved By : ${header.txtSavedBy} ${header.txtSavedOn ?? ""}`;
        }

        if (header?.txtModifiedBy) {
          info += `\nLast Modified By : ${header.txtModifiedBy} ${header.txtModifiedOn ?? ""}`;
        }

        setTxtUserInfo(info);

        if (result.chkPosted) {
          toast.info("This Beginning Balance is posted: it is locked.");
        }
      } catch (error: unknown) {
        if (requestNo !== loadRequest.current) return;

        console.error("getBeginningBalance error:", error);
        toast.error("Failed to load the Beginning Balance");
      }
    };

    loadBalance();
  }, [branchID, reloadKey, PstrYear]);

  // ----------------------------------------------------------
  // TOTALS (the old UpdateTotalSummary)
  // ----------------------------------------------------------

  const totalDebit = rows.reduce((sum, row) => sum + toAmount(row.txtDebit), 0);
  const totalCredit = rows.reduce((sum, row) => sum + toAmount(row.txtCredit), 0);
  const difference = round2(totalDebit - totalCredit);

  const accountByCode = useMemo(
    () => new Map(accountsByID.map((option) => [option.value, option])),
    [accountsByID],
  );

  const canSaveOrModify = chkSaved ? perms.modify : perms.save;

  // ----------------------------------------------------------
  // SAVE / MODIFY (the old cmdSave_Click): the server checks everything again,
  // and the button rights
  // ----------------------------------------------------------

  const handleSave = async () => {
    if (saving || chkPosted) return;

    if (!canSaveOrModify) {
      toast.error(
        `You do not have permission to ${chkSaved ? "Modify" : "Save"}.`,
      );
      return;
    }

    // the old ValidateMe
    if (!lkpBranch) {
      toast.info("Please select a 'Branch'");
      focusField("lkpBranch");
      return;
    }

    if (!dtpDate) {
      toast.info("Please select 'Date'");
      focusField("dtpDate");
      return;
    }

    // the old DeleteEmptyRow: a row with no account is not saved
    const filled = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.lkpAccountID !== "");

    if (filled.length === 0) {
      toast.info("There is no information for saving.");
      focusField("lkpAccountID-0");
      return;
    }

    // the old ValidateGrid / ValidateRow
    const seen = new Set<string>();

    for (const { row, index } of filled) {
      const account = accountByCode.get(row.lkpAccountID);

      if (account?.chkHaveCC && !row.lkpCCID) {
        toast.info(`Account ID : ${row.lkpAccountID} - 'Cost Center' is required`);
        focusField(`lkpCCID-${index}`);
        return;
      }

      const debit = toAmount(row.txtDebit);
      const credit = toAmount(row.txtCredit);

      if (debit !== 0 && credit !== 0) {
        toast.info(`Account ID : ${row.lkpAccountID} - Please input either 'Debit' or 'Credit'`);
        focusField(`txtDebit-${index}`);
        return;
      }

      if (debit === 0 && credit === 0) {
        toast.info(`Account ID : ${row.lkpAccountID} - Please input 'Debit' or 'Credit'`);
        focusField(`txtDebit-${index}`);
        return;
      }

      const key = `${row.lkpAccountID}|${account?.chkHaveCC ? row.lkpCCID : ""}`;

      if (seen.has(key)) {
        toast.info("Account already exists");
        focusField(`lkpAccountID-${index}`);
        return;
      }

      seen.add(key);
    }

    // the old form only warns about this and saves anyway
    if (difference !== 0) {
      toast.info("'Total Credit' must be equal to 'Total Debit'");
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/BeginningBalance/saveBeginningBalance`, {
        method: "POST",
        credentials: "include", // the server checks the session, the user and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear,
          lkpBranch: lkpBranch.value,
          dtpDate,
          rows: filled.map(({ row, index }) => ({
            txtGridRow: index,
            lkpAccountID: row.lkpAccountID,
            lkpCCID: row.lkpCCID,
            txtDebit: row.txtDebit,
            txtCredit: row.txtCredit,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            (chkSaved ? "Not modified, try again" : "Not saved, try again"),
        );
        focusField(result.field);
        return;
      }

      toast.success(result.message);

      // the old form cleared and loaded the branch again
      setReloadKey((previous) => previous + 1);
    } catch (error: unknown) {
      console.error("saveBeginningBalance error:", error);
      toast.error(chkSaved ? "Not modified, try again" : "Not saved, try again");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE (the old cmdDelete_Click): the whole balance of the branch, after
  // "Do you want to delete?"
  // ----------------------------------------------------------

  const handleDelete = async () => {
    if (saving || !chkSaved || chkPosted || !lkpBranch) return;

    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    const shouldDelete = await confirm({
      title: SCREEN_TITLE,
      message: "Do you want to delete ?",
    });

    if (!shouldDelete) return;

    setSaving(true);

    try {
      const response = await fetch(`${api}/BeginningBalance/deleteBeginningBalance`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear,
          lkpBranch: lkpBranch.value,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Not deleted, try again");
        return;
      }

      toast.success(result.message);

      setReloadKey((previous) => previous + 1);
    } catch (error: unknown) {
      console.error("deleteBeginningBalance error:", error);
      toast.error("Not deleted, try again");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // POST (the old cmdPost_Click): marks the branch's saved balance posted, and the
  // page is locked after it. As in the old form it does not ask first, and posting
  // does not need debit to equal credit.
  // ----------------------------------------------------------

  const handlePost = async () => {
    if (saving || !chkSaved || chkPosted) return;

    if (!perms.post) {
      toast.error("You do not have permission to Post.");
      return;
    }

    // the old ValidateMe("T")
    if (!lkpBranch) {
      toast.info("Please select a 'Branch'");
      focusField("lkpBranch");
      return;
    }

    if (!dtpDate) {
      toast.info("Please select 'Date'");
      focusField("dtpDate");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/BeginningBalance/postBeginningBalance`, {
        method: "POST",
        credentials: "include", // the server checks the session, the user and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear,
          lkpBranch: lkpBranch.value,
          dtpDate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Not posted, try again");
        focusField(result.field);
        return;
      }

      toast.success(result.message);

      // the old form loaded the branch again: it is posted now, so it is locked
      setReloadKey((previous) => previous + 1);
    } catch (error: unknown) {
      console.error("postBeginningBalance error:", error);
      toast.error("Not posted, try again");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------

  // ----------------------------------------------------------

  // the body of the Print and Excel requests: the branch and the date
  const printBody = (branch: string, date: string) =>
    JSON.stringify({
      PstrCoID: localStorage.getItem("PstrCoID"),
      PstrYear: localStorage.getItem("PstrYear"),
      lkpBranch: branch,
      dtpDate: date,
    });

  const handlePrint = async () => {
    if (saving || preview) return;

    if (!perms.print) {
      toast.error("You do not have permission to Print.");
      return;
    }

    // the old ValidateMe("P")
    if (!lkpBranch) {
      toast.info("Please select a 'Branch'");
      focusField("lkpBranch");
      return;
    }

    if (!dtpDate) {
      toast.info("Please select 'Date'");
      focusField("dtpDate");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/BeginningBalance/printBeginningBalance`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: printBody(lkpBranch.value, dtpDate),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "The Beginning Balance could not be printed.");
        focusField(result.field);
        return;
      }

      // a name that is never the name of a file that is still open
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      setPreview({
        report: { ...result.header, rows: result.data || [] },
        lkpBranch: lkpBranch.value,
        dtpDate,
        fileBase: `BeginningBalance_${lkpBranch.value}_${stamp}`,
      });
    } catch (error: unknown) {
      console.error("printBeginningBalance error:", error);
      toast.error("Cannot connect to Beginning Balance API.");
    } finally {
      setSaving(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/BeginningBalance/downloadBeginningBalanceExcel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: printBody(preview.lkpBranch, preview.dtpDate),
    });

    // an error comes back as JSON, the file as a blob
    if (!response.ok) {
      let message = "Could not create the Excel file";

      try {
        const result = await response.json();
        message = result.message || message;
      } catch {
        message =
          response.status === 404
            ? "Excel is not available: the downloadBeginningBalanceExcel route was not found (404)"
            : `Could not create the Excel file (error ${response.status})`;
      }

      toast.error(message);
      return null;
    }

    return response.blob();
  };

  // ----------------------------------------------------------
  // CLEAR (the old Cancel): back to what is saved - the changes are dropped and the
  // branch's balance is loaded again
  // ----------------------------------------------------------

  const handleClear = () => {
    if (saving) return;

    setReloadKey((previous) => previous + 1);
  };

  // the x of a row: asks first, then the line leaves the grid (it is gone from the
  // database when the balance is saved) and the cursor goes back to its Account ID
  const handleRemoveRow = async (index: number) => {
    if (saving) return;

    const shouldRemove = await confirm({
      title: SCREEN_TITLE,
      message: "Do you want to delete ?",
    });

    if (!shouldRemove) return;

    setRows((previous) => padRows(previous.filter((_, rowIndex) => rowIndex !== index)));

    // after the grid has been drawn again
    setTimeout(() => document.getElementById(`lkpAccountID-${index}`)?.focus(), 0);
  };

  // Alt+S Save, Alt+M Modify, Alt+D Delete, Alt+P Print, Alt+T Post, Alt+C Clear.
  // Off while the Print Preview is open: it has its own Alt+P, Alt+D and Alt+C.
  useAltShortcuts(preview ? {} : {
    s: () => {
      if (!chkSaved) handleSave();
    },
    m: () => {
      if (chkSaved) handleSave();
    },
    d: handleDelete,
    p: handlePrint,
    t: handlePost,
    c: handleClear,
  });

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-[#eeeeee] pb-5">
      <main className="h-fit w-full min-w-[950px] max-w-[1010px] mt-5 overflow-hidden bg-white border border-gray-400 pb-3 text-[#202020]">
        <div className="flex h-full w-full flex-col">
          <BeginningBalanceHeader
            lkpBranch={lkpBranch}
            onBranchChange={setLkpBranch}
            dtpDate={dtpDate}
            onDateChange={setDtpDate}
            disabled={chkPosted}
            onBranchesLoaded={() => setBranchesLoaded(true)}
          />

          <BeginningBalanceTable
            rows={rows}
            setRows={setRows}
            accountsByID={accountsByID}
            accountsByName={accountsByName}
            costCenters={costCenters}
            disabled={chkPosted}
            onRemoveRow={handleRemoveRow}
          />

          <BeginningBalanceFooter
            txtDebitTotal={formatAmount(totalDebit)}
            txtCreditTotal={formatAmount(totalCredit)}
            txtDifference={formatAmount(difference)}
            chkDifferent={difference !== 0}
            txtUserInfo={txtUserInfo}
            chkSaved={chkSaved}
            chkPosted={chkPosted}
            saving={saving}
            canSaveOrModify={canSaveOrModify}
            canDelete={perms.delete}
            canPost={perms.post}
            canPrint={perms.print}
            onSave={handleSave}
            onDelete={handleDelete}
            onPost={handlePost}
            onPrint={handlePrint}
            onClear={handleClear}
          />
        </div>
      </main>

      {/* the "Do you want to delete?" question */}
      {confirmDialog}

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printBeginningBalanceReport(preview.report)}
          buildPdf={() => buildBeginningBalancePdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

export default BeginningBalance;
