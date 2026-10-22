import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import { saveFile } from "../../../pages/Finance/Report/ChartOfAccount/saveFile";
import { buildBeginningBalancePdf } from "./BeginningBalancePdf";
import {
  buildHtml,
  printBeginningBalanceReport,
  type PrintReport,
} from "./BeginningBalancePrintReport";

// ============================================================
// BEGINNING BALANCE - THE PRINT PREVIEW
// Opens after Print on the page (the same window as the Chart Of Account report):
// the report as it will be printed, with Print (the browser's print window),
// Download (Excel or PDF, the File Format chosen) and Close.
// ============================================================

type Props = {
  // the report the server sent
  report: PrintReport;
  // the name of the downloaded file, without the extension
  fileBase: string;
  // the Excel file made by the server (null after an error message)
  fetchExcel: () => Promise<Blob | null>;
  onClose: () => void;
};

type FileFormat = "Excel" | "PDF";

type RadioProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

const CustomRadio: React.FC<RadioProps> = ({ name, value, label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap select-none">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    <span
      className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-white ${
        checked ? "border-[#64d96e]" : "border-[#cbd3dc]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-[#64d96e] ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
    <span className="text-[12px] font-normal text-[#35445a]">{label}</span>
  </label>
);

const BeginningBalancePrintPreview: React.FC<Props> = ({
  report,
  fileBase,
  fetchExcel,
  onClose,
}) => {
  const [rdgReportFile, setRdgReportFile] = useState<FileFormat>("Excel");
  const [busy, setBusy] = useState(false);

  // a double click must not start two saves (state is not updated yet on the second
  // click, so a ref is used)
  const downloading = useRef(false);

  // 40px left / 20px right margin for the preview only
  const previewHtml = useMemo(
    () =>
      buildHtml(report).replace(
        "</head>",
        "<style>body{padding-left:40px;padding-right:20px}</style></head>",
      ),
    [report],
  );

  // Print: the browser's print window (the printer, or Save as PDF)
  const handlePrint = () => {
    if (busy) return;

    try {
      printBeginningBalanceReport(report);
    } catch {
      toast.error("Could not open the print view");
    }
  };

  // Download: saves the chosen file ("Save as" window, so the browser does not open
  // it afterwards)
  const handleDownload = async () => {
    if (busy || downloading.current) return;
    downloading.current = true;

    const asPdf = rdgReportFile === "PDF";

    setBusy(true);
    try {
      const blob = asPdf ? buildBeginningBalancePdf(report) : await fetchExcel();
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);

      if (saved) {
        toast.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
        onClose();
      }
      // a cancelled "Save as": the preview stays
    } catch {
      toast.error(
        asPdf ? "Could not create the PDF file" : "Could not create the Excel file",
      );
    } finally {
      downloading.current = false;
      setBusy(false);
    }
  };

  // Alt+P Print, Alt+D Download, Alt+C or Esc Close. The page's own shortcuts are off
  // while the preview is open (see the page), so Alt+D cannot delete the balance.
  // Re-attached every render so it always sees the latest state.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.code === "KeyP") {
        event.preventDefault();
        handlePrint();
      } else if (event.code === "KeyD") {
        event.preventDefault();
        handleDownload();
      } else if (event.code === "KeyC") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[90vh] w-full max-w-250 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
        <header className="flex h-7.5 shrink-0 items-center bg-[#9fdfbc] pl-3 text-[17px] font-semibold text-slate-700">
          Print Preview
        </header>

        <iframe
          id="frmPrintPreview"
          title="Print Preview"
          srcDoc={previewHtml}
          className="min-h-0 flex-1 border-0 bg-white"
        />

        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-4 border-t border-[#e0e5ea] px-3 py-4">
          <div className="flex gap-3">
            <button
              id="btnPreviewPrint"
              type="button"
              onClick={handlePrint}
              disabled={busy}
              className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <u>P</u>rint
            </button>
            <button
              id="btnPreviewDownload"
              type="button"
              autoFocus
              onClick={handleDownload}
              disabled={busy}
              className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <u>D</u>ownload
            </button>
            <button
              id="btnPreviewClose"
              type="button"
              onClick={onClose}
              disabled={busy}
              className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <u>C</u>lose
            </button>
          </div>

          {/* File Format: what Download saves */}
          <div
            id="rdgReportFile"
            className="relative flex items-center gap-5 border border-[#e0e5ea] bg-white px-10.5 py-2.5"
          >
            <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
              File Format
            </span>
            <CustomRadio
              name="rdgReportFile"
              value="Excel"
              label="Excel"
              checked={rdgReportFile === "Excel"}
              onChange={() => setRdgReportFile("Excel")}
            />
            <CustomRadio
              name="rdgReportFile"
              value="PDF"
              label="PDF"
              checked={rdgReportFile === "PDF"}
              onChange={() => setRdgReportFile("PDF")}
            />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default BeginningBalancePrintPreview;
