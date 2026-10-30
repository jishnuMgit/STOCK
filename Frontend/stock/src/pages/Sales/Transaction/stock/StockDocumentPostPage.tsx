import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import StockDocumentPostHeader from "../../../../components/Transaction/StockDocumentPost/StockDocumentPostHeader";
import StockDocumentPostTable from "../../../../components/Transaction/StockDocumentPost/StockDocumentPostTable";
import StockDocumentPostFooter from "../../../../components/Transaction/StockDocumentPost/StockDocumentPostFooter";
import { type DocRow,type Option } from "../../../../components/Transaction/StockDocumentPost/StockDocumentPostShared";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../../hooks/useButtonPermissions";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";

// dbo.tblmenu fmenuid of the Stock Document Post page
const MENU_ID = "020105";

// the title of the screen: the heading, and the name in its messages (as the other screens)
const SCREEN_TITLE = "Stock Document Post";

const api = import.meta.env.VITE_API_URL;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const monthOptions: Option[] = MONTH_NAMES.map((name, index) => ({
  value: String(index + 1),
  label: name,
}));

// GetData's request: the documents that are not posted yet (no state here, so the page can set it from a .then)
type UnpostedResult = { rows: DocRow[] } | { message: string };

const fetchUnposted = async (query: URLSearchParams): Promise<UnpostedResult> => {
  const response = await fetch(`${api}/StockDocumentPost/list?${query.toString()}`, {
    credentials: "include",
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    return { message: result.message || "Failed to load the documents" };
  }

  return {
    rows: result.rows.map(
      (r: { txtDocNo: string; txtDate: string; txtAccountID: string; txtDocAmt: number }) => ({
        txtDocNo: r.txtDocNo,
        txtDate: dayjs(r.txtDate).format("DD-MM-YYYY"),
        txtAccountID: r.txtAccountID,
        txtDocAmt: Number(r.txtDocAmt),
      }),
    ),
  };
};

type StockDocumentPostPageProps = {
  onClose?: () => void;
};

const StockDocumentPostPage: React.FC<StockDocumentPostPageProps> = ({ onClose }) => {
  const perms = useButtonPermissions(MENU_ID);
  const enterAsTab = useEnterAsTab();

  // the boxes (names = the element ids and the server's keys)
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [documentOptions, setDocumentOptions] = useState<Option[]>([]);
  const [yearOptions, setYearOptions] = useState<Option[]>([]);
  const [lkpBranch, setLkpBranch] = useState<Option | null>(null);
  const [lkpDocument, setLkpDocument] = useState<Option | null>(null);
  const [lkpYear, setLkpYear] = useState<Option | null>(null);
  const [lkpMonth, setLkpMonth] = useState<Option | null>(
    monthOptions[new Date().getMonth()],
  );

  // the documents that are not posted yet, and the ticked ones (by Doc. No.)
  const [rows, setRows] = useState<DocRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0;

  const selectedTotal = useMemo(
    () =>
      rows
        .filter((row) => selectedIds.has(row.txtDocNo))
        .reduce((sum, row) => sum + row.txtDocAmt, 0),
    [rows, selectedIds],
  );

  // where the cursor starts: the Document box when the user's default branch is filled in, else the Branch box
  useInitialFocus(lookupsLoaded, lkpBranch ? "lkpDocument" : "lkpBranch");

  // the login year: the Year box has to be the same (the old "'Year' should be same as 'Login Year'")
  const PstrYear = localStorage.getItem("PstrYear") ?? "";

  /* ---------------------------------------------------------
     the lookups (frmStDocPost_Load / FillCombos)
  --------------------------------------------------------- */
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/StockDocumentPost/lookups`, {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the lookups");
          return;
        }

        const branches: Option[] = result.branches.map(
          (b: { lkpBranch: string; txtBranchName: string }) => ({
            value: b.lkpBranch,
            label: b.txtBranchName,
          }),
        );
        const documents: Option[] = result.documents.map(
          (d: { lkpDocument: string; txtDocumentName: string }) => ({
            value: d.lkpDocument,
            label: d.txtDocumentName,
          }),
        );
        const years: Option[] = result.years.map((y: { lkpYear: string }) => ({
          value: y.lkpYear,
          label: y.lkpYear,
        }));

        setBranchOptions(branches);
        setDocumentOptions(documents);
        setYearOptions(years);

        // the user's default branch, else the first one; the login year
        setLkpBranch(
          branches.find((b) => b.value === result.lkpDefaultBranch) ?? branches[0] ?? null,
        );
        setLkpYear(years.find((y) => y.value === PstrYear) ?? years[0] ?? null);
      } catch {
        toast.error(`Cannot connect to ${SCREEN_TITLE} API.`);
      } finally {
        setLookupsLoaded(true);
      }
    };

    void loadLookups();
  }, [PstrYear]);

  /* ---------------------------------------------------------
     GetData: the documents that are not posted yet. It runs when the Branch, the Document, the Year or
     the Month changes - and after a post (reloadKey). All the rows come back ticked.
  --------------------------------------------------------- */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // nothing to list until the four boxes are chosen (they cannot be cleared again)
    if (!lkpBranch || !lkpDocument || !lkpYear || !lkpMonth) {
      return;
    }

    let cancelled = false;

    fetchUnposted(
      new URLSearchParams({
        PstrYear,
        lkpBranch: lkpBranch.value,
        lkpDocument: lkpDocument.value,
        lkpYear: lkpYear.value,
        lkpMonth: lkpMonth.value,
      }),
    )
      .then((result) => {
        if (cancelled) return;

        if ("rows" in result) {
          setRows(result.rows);
          setSelectedIds(new Set(result.rows.map((d) => d.txtDocNo)));
          setActiveId(result.rows[0]?.txtDocNo ?? null);
        } else {
          setRows([]);
          setSelectedIds(new Set());
          setActiveId(null);
          toast.warning(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(`Cannot connect to ${SCREEN_TITLE} API.`);
      });

    return () => {
      cancelled = true;
    };
  }, [lkpBranch, lkpDocument, lkpYear, lkpMonth, PstrYear, reloadKey]);

  /* ---------------------------------------------------------
     the ticks
  --------------------------------------------------------- */
  const toggleRow = (txtDocNo: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(txtDocNo)) next.delete(txtDocNo);
      else next.add(txtDocNo);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(rows.map((r) => r.txtDocNo)));
  };

  /* ---------------------------------------------------------
     the Post button (cmdPost_Click)
  --------------------------------------------------------- */
  const handlePost = async () => {
    if (posting) return;

    if (!perms.post) {
      toast.error("You do not have permission to Post.");
      return;
    }

    if (!lkpBranch) {
      toast.warning("Please select a 'Branch'");
      return;
    }

    if (!lkpDocument) {
      toast.warning("Please select a 'Document'");
      return;
    }

    if (!lkpYear) {
      toast.warning("Please select 'Year'");
      return;
    }

    if (!lkpMonth) {
      toast.warning("Please select 'Month'");
      return;
    }

    if (lkpYear.value !== PstrYear) {
      toast.warning("'Year' should be same as 'Login Year'");
      return;
    }

    const documents = rows
      .filter((row) => selectedIds.has(row.txtDocNo))
      .map((row) => ({ txtDocNo: row.txtDocNo }));

    if (documents.length === 0) {
      toast.warning("Please select a Document to post");
      return;
    }

    setPosting(true);

    try {
      const response = await fetch(`${api}/StockDocumentPost/post`, {
        method: "POST",
        credentials: "include", // the server checks the session and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrYear,
          lkpBranch: lkpBranch.value,
          lkpDocument: lkpDocument.value,
          lkpYear: lkpYear.value,
          lkpMonth: lkpMonth.value,
          documents,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "The documents could not be posted");
        return;
      }

      // the post stopped at a document (its Purchase Invoice / Sales Invoice is not posted, or an
      // item has no unit cost): say which, and put the cursor on it
      if (result.txtStopMessage) {
        toast.warning(result.txtStopMessage);
        setActiveId(result.txtStopDocNo || null);
      }

      // the documents the database refused to post, and why
      if (result.txtErrorMessage) {
        toast.error(<div style={{ whiteSpace: "pre-line" }}>{result.txtErrorMessage}</div>);
      }

      // green when something was posted, a warning when nothing was
      const notice = <div style={{ whiteSpace: "pre-line" }}>{result.message}</div>;

      if (result.txtPostedCount > 0) toast.success(notice);
      else toast.warning(notice);

      setReloadKey((key) => key + 1);
    } catch {
      toast.error(`Cannot connect to ${SCREEN_TITLE} API.`);
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose?.();
  };

  // the underlined letters of the buttons: Alt+P Post, Alt+C Close
  useAltShortcuts({ p: () => void handlePost(), c: handleClose });

  return (
    <div
      className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4"
      onKeyDown={enterAsTab}
    >
      <div className="min-h-fit min-w-240 w-240 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
           <header className="flex h-6.5 items-center justify-start pl-2.5 bg-[#9fdfbc] text-[18px] font-semi-bold text-slate-700">
      {SCREEN_TITLE}
    </header>
          </header>

          <section className="flex flex-col gap-3 px-3.5 pb-6 pt-3">
            <StockDocumentPostHeader
              branchOptions={branchOptions}
              lkpBranch={lkpBranch}
              onBranchChange={setLkpBranch}
              documentOptions={documentOptions}
              lkpDocument={lkpDocument}
              onDocumentChange={setLkpDocument}
              yearOptions={yearOptions}
              lkpYear={lkpYear}
              onYearChange={setLkpYear}
              monthOptions={monthOptions}
              lkpMonth={lkpMonth}
              onMonthChange={setLkpMonth}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={toggleAll}
              selectAllDisabled={rows.length === 0}
            />

            <div>
              <StockDocumentPostTable
                rows={rows}
                selectedIds={selectedIds}
                activeId={activeId}
                onToggleRow={toggleRow}
                onActivateRow={setActiveId}
              />
              <StockDocumentPostFooter
                selectedCount={selectedIds.size}
                selectedTotal={selectedTotal}
                onPost={() => void handlePost()}
                onClose={handleClose}
                postDisabled={selectedIds.size === 0 || !perms.post || posting}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default StockDocumentPostPage;
