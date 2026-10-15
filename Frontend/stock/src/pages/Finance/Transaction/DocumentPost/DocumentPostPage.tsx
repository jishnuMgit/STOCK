import React, { useMemo, useState } from "react";
import DocumentPostHeader from "../../../../components/Transaction/DocumentPost/DocumentPostHeader";
import DocumentPostTable from "../../../../components/Transaction/DocumentPost/DocumentPostTable";
import DocumentPostFooter from "../../../../components/Transaction/DocumentPost/DocumentPostFooter";
import { type DocRow,type Option } from "../../../../components/Transaction/DocumentPost/DocumentPostShared";

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];
const documentOptions: Option[] = [
  { value: "SALES INVOICE", label: "Sales Invoice" },
  { value: "PURCHASE INVOICE", label: "Purchase Invoice" },
  { value: "RECEIPT VOUCHER", label: "Receipt Voucher" },
  { value: "PAYMENT VOUCHER", label: "Payment Voucher" },
  { value: "JOURNAL VOUCHER", label: "Journal Voucher" },
];

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

const currentYear = new Date().getFullYear();
const yearOptions: Option[] = Array.from({ length: 6 }, (_, index) => {
  const value = String(currentYear - index);
  return { value, label: value };
});

/* Sample unposted documents. Replace with an API call that uses branch, document, year and month. */
const sampleDocuments: DocRow[] = [
  { id: "1", docNo: "SI-0001", date: "02-10-2026", accountId: "11001", amount: 1250.5 },
  { id: "2", docNo: "SI-0002", date: "05-10-2026", accountId: "11002", amount: 830 },
  { id: "3", docNo: "SI-0003", date: "09-10-2026", accountId: "11001", amount: 4120.75 },
];

type DocumentPostPageProps = {
  onClose?: () => void;
};

const DocumentPostPage: React.FC<DocumentPostPageProps> = ({ onClose }) => {
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [documentType, setDocumentType] = useState<Option | null>(null); // lkpDocument
  const [year, setYear] = useState<Option | null>(
    yearOptions.find((o) => o.value === String(currentYear)) ?? yearOptions[0],
  ); // lkpYear
  const [month, setMonth] = useState<Option | null>(
    monthOptions[new Date().getMonth()],
  ); // lkpMonth

  const [rows, setRows] = useState<DocRow[]>(sampleDocuments);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(
    sampleDocuments[0]?.id ?? null,
  );

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0;

  const selectedTotal = useMemo(
    () =>
      rows
        .filter((row) => selectedIds.has(row.id))
        .reduce((sum, row) => sum + row.amount, 0),
    [rows, selectedIds],
  );

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const handlePost = () => {
    const toPost = rows.filter((row) => selectedIds.has(row.id));
    console.log({
      branch,
      documentType,
      year,
      month,
      documents: toPost,
    });
    // after a successful API call, remove the posted documents from the list
    setRows((prev) => prev.filter((row) => !selectedIds.has(row.id)));
    setSelectedIds(new Set());
  };

  const handleClose = () => {
    setBranch(branchOptions[0]);
    setDocumentType(null);
    setSelectedIds(new Set());
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit min-w-240 w-240 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
           <header className="flex h-6.5 items-center justify-start pl-2.5 bg-[#9fdfbc] text-[18px] font-semi-bold text-slate-700">
      Document Post
    </header>
          </header>

          <section className="flex flex-col gap-3 px-3.5 pb-6 pt-3">
            <DocumentPostHeader
              branchOptions={branchOptions}
              branch={branch}
              onBranchChange={setBranch}
              documentOptions={documentOptions}
              documentType={documentType}
              onDocumentChange={setDocumentType}
              yearOptions={yearOptions}
              year={year}
              onYearChange={setYear}
              monthOptions={monthOptions}
              month={month}
              onMonthChange={setMonth}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={toggleAll}
              selectAllDisabled={rows.length === 0}
            />

            <div>
              <DocumentPostTable
                rows={rows}
                selectedIds={selectedIds}
                activeId={activeId}
                onToggleRow={toggleRow}
                onActivateRow={setActiveId}
              />
              <DocumentPostFooter
                selectedCount={selectedIds.size}
                selectedTotal={selectedTotal}
                onPost={handlePost}
                onClose={handleClose}
                postDisabled={selectedIds.size === 0}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DocumentPostPage;