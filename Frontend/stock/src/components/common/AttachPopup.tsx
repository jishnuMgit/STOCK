import React, { useEffect, useMemo, useRef, useState } from "react";
import { MdAttachFile, MdClose, MdVisibility } from "react-icons/md";
import ActionButton from "./ActionButton";
import CloseButton from "./CloseButton";
import { useMessageModal } from "../../hooks/useMessageModal";

// ============================================================
// TYPES (generic - map your API types to these in the caller)
// ============================================================

/** An attachment that already exists in the database. */
export interface AttachmentRecord {
    slNo: number;
    note: string | null;
    fileName: string | null;
    fileType: string | null; // extension, e.g. "pdf"
    mimeType: string;
    /** base64 content, if the API sends it with the list. Otherwise use loadAttachmentFile. */
    dox: string | null;
}

export type AttachmentRowState = "added" | "modified" | "unchanged";

/** One row sent to onSave (only added / modified rows are sent). */
export interface AttachmentSaveRow {
    slNo: number;
    note: string | null;
    fileName: string | null;
    fileType: string | null;
    dox: string | null; // base64 (no data: prefix)
    originalSlNo?: number;
    rowState: AttachmentRowState;
}

export interface ExcelPreviewResult {
    sheetName: string;
    rows: string[][];
    truncated: boolean;
}

export interface AttachPopupProps {
    headerName?: string;
    onClose?: () => void;
    /** Existing attachments to show */
    attachments?: AttachmentRecord[];
    /** Load the file for an existing attachment (for preview) */
    loadAttachmentFile?: (slNo: number) => Promise<Blob>;
    /** Called with added / modified rows. Throw to show an error and keep the popup open. */
    onSave?: (rows: AttachmentSaveRow[]) => void | Promise<void>;
    /** Optional .xlsx/.xlsm preview. If omitted, Excel files show a download option only. */
    parseExcelPreview?: (data: ArrayBuffer) => Promise<ExcelPreviewResult>;
    /** Minimum number of visible rows (default 6) */
    minRows?: number;
    /** Max size of a file / of one save, in MB (default 250) */
    maxSaveMB?: number;
    /** Max note length (default 200) */
    maxNoteLength?: number;
}

type AttachRow = {
    key: number;
    file: File | null;
    fileName: string;
    previewUrl: string | null;
    previewBlob: Blob | null;
    note: string;
    storedDox: string | null;
    original: AttachmentRecord | null;
    rowState: AttachmentRowState;
};

type PreviewContent =
    | { kind: "text"; text: string; truncated: boolean }
    | { kind: "spreadsheet"; sheetName: string; rows: string[][]; truncated: boolean }
    | { kind: "message"; message: string }
    | null;

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024;
const MAX_SPREADSHEET_PREVIEW_BYTES = 50 * 1024 * 1024;

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): AttachRow => ({
    key: nextKey(),
    file: null,
    fileName: "",
    previewUrl: null,
    previewBlob: null,
    note: "",
    storedDox: null,
    original: null,
    rowState: "added",
});

const isEmptyRow = (row: AttachRow) => !row.fileName && !row.note.trim();

const initialRows = (attachments: AttachmentRecord[], minRows: number): AttachRow[] => [
    ...attachments.map((a) => ({
        key: nextKey(),
        file: null,
        fileName: a.fileName ?? "",
        previewUrl: null,
        previewBlob: null,
        note: a.note ?? "",
        storedDox: a.dox,
        original: a,
        rowState: "unchanged" as const,
    })),
    ...Array.from({ length: Math.max(minRows - attachments.length, 1) }, emptyRow),
];

const niceScrollbar = [
    "[&::-webkit-scrollbar]:h-2.5",
    "[&::-webkit-scrollbar]:w-2.5",
    "[&::-webkit-scrollbar-track]:bg-[#f2f8f4]",
    "[&::-webkit-scrollbar-thumb]:rounded-full",
    "[&::-webkit-scrollbar-thumb]:border-2",
    "[&::-webkit-scrollbar-thumb]:border-solid",
    "[&::-webkit-scrollbar-thumb]:border-[#f2f8f4]",
    "[&::-webkit-scrollbar-thumb]:bg-[#9fdfbc]",
    "[&::-webkit-scrollbar-thumb:hover]:bg-[#64d96e]",
    "[&::-webkit-scrollbar-thumb:active]:bg-[#4cc45a]",
    "[&::-webkit-scrollbar-corner]:bg-[#f2f8f4]",
].join(" ");

const thClass =
    "h-[30px] border border-[#B7ECD0] bg-[#E7F7ED] px-2 font-normal text-[#405066]";

const fileExtension = (fileName: string) => {
    const i = fileName.lastIndexOf(".");
    return i < 0 ? "" : fileName.slice(i + 1).toLowerCase();
};

const isImage = (row: AttachRow) =>
    row.file?.type.startsWith("image/") || row.original?.mimeType.startsWith("image/");

const isPdf = (row: AttachRow) =>
    row.file?.type === "application/pdf" ||
    row.original?.mimeType === "application/pdf" ||
    row.fileName.toLowerCase().endsWith(".pdf");

const isTextFile = (row: AttachRow) =>
    row.file?.type.startsWith("text/") ||
    ["txt", "csv", "tsv", "log", "json", "xml"].includes(fileExtension(row.fileName));

const isExcelFile = (row: AttachRow) =>
    [".xlsx", ".xlsm"].some((ext) => row.fileName.toLowerCase().endsWith(ext));

const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                reject(new Error(`Unable to read ${file.name}.`));
                return;
            }
            const sep = reader.result.indexOf(",");
            if (sep < 0) {
                reject(new Error(`Unable to encode ${file.name}.`));
                return;
            }
            resolve(reader.result.slice(sep + 1));
        };
        reader.onerror = () => reject(reader.error ?? new Error(`Unable to read ${file.name}.`));
        reader.readAsDataURL(file);
    });

const base64ByteSize = (value: string | null) => {
    if (!value) return 0;
    const prefix = value.indexOf("base64,");
    const encodedLength = value.length - (prefix >= 0 ? prefix + 7 : 0);
    const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
    return Math.floor((encodedLength * 3) / 4) - padding;
};

// ============================================================
// COMPONENT
// ============================================================

const AttachPopup: React.FC<AttachPopupProps> = ({
    headerName = "Attach",
    onClose,
    attachments = [],
    loadAttachmentFile,
    onSave,
    parseExcelPreview,
    minRows = 6,
    maxSaveMB = 250,
    maxNoteLength = 200,
}) => {
    const { notify } = useMessageModal(headerName);
    const maxSaveBytes = maxSaveMB * 1024 * 1024;

    const [rows, setRows] = useState<AttachRow[]>(() => initialRows(attachments, minRows));
    const [selectedKey, setSelectedKey] = useState<number | null>(rows[0]?.key ?? null);
    const [previewRow, setPreviewRow] = useState<AttachRow | null>(null);
    const [previewContent, setPreviewContent] = useState<PreviewContent>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pickingKeyRef = useRef<number | null>(null);
    const urlsRef = useRef<Set<string>>(new Set());

    // Release every object URL when the popup unmounts.
    useEffect(() => {
        const urls = urlsRef.current;
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, []);

    const firstEmptyKey = useMemo(
        () => rows.find((row) => isEmptyRow(row))?.key ?? null,
        [rows],
    );

    const releaseUrl = (url: string | null) => {
        if (!url || !urlsRef.current.has(url)) return;
        URL.revokeObjectURL(url);
        urlsRef.current.delete(url);
    };

    const closePreview = () => {
        setPreviewRow(null);
        setPreviewContent(null);
    };

    const openFilePicker = (row: AttachRow) => {
        pickingKeyRef.current = row.key;
        setSelectedKey(row.key);
        fileInputRef.current?.click();
    };

    // ----------------------------------------------------------
    // PREVIEW
    // ----------------------------------------------------------

    const openPreview = async (row: AttachRow) => {
        setSelectedKey(row.key);
        setPreviewRow(row);
        setPreviewLoading(true);
        try {
            const blob =
                row.previewBlob ??
                row.file ??
                (row.original && loadAttachmentFile
                    ? await loadAttachmentFile(row.original.slNo)
                    : null);
            if (!blob) throw new Error("Unable to load the attachment preview.");

            let previewUrl = row.previewUrl;
            if (!previewUrl) {
                previewUrl = URL.createObjectURL(blob);
                urlsRef.current.add(previewUrl);
            }

            if (isTextFile(row)) {
                const truncated = blob.size > MAX_TEXT_PREVIEW_BYTES;
                const text = await blob.slice(0, MAX_TEXT_PREVIEW_BYTES).text();
                setPreviewContent({ kind: "text", text, truncated });
            } else if (isExcelFile(row)) {
                if (!parseExcelPreview) {
                    setPreviewContent({
                        kind: "message",
                        message: "Excel preview is not available. Download the file to view it.",
                    });
                } else if (blob.size > MAX_SPREADSHEET_PREVIEW_BYTES) {
                    setPreviewContent({
                        kind: "message",
                        message: "This workbook is too large to preview. Download it to view the contents.",
                    });
                } else {
                    try {
                        const result = await parseExcelPreview(await blob.arrayBuffer());
                        setPreviewContent({ kind: "spreadsheet", ...result });
                    } catch (err) {
                        setPreviewContent({
                            kind: "message",
                            message:
                                err instanceof Error
                                    ? err.message
                                    : "Unable to preview this workbook. Download it to view the contents.",
                        });
                    }
                }
            } else if (row.fileName.toLowerCase().endsWith(".xls")) {
                setPreviewContent({
                    kind: "message",
                    message: "Legacy .xls files cannot be previewed here. Download the file to view it.",
                });
            } else {
                setPreviewContent(null);
            }

            setRows((current) =>
                current.map((r) => (r.key === row.key ? { ...r, previewUrl, previewBlob: blob } : r)),
            );
            setPreviewRow({ ...row, previewUrl, previewBlob: blob });
        } catch (err) {
            notify.error(
                err instanceof Error ? err.message : "Unable to load the attachment preview.",
            );
        } finally {
            setPreviewLoading(false);
        }
    };

    // ----------------------------------------------------------
    // ROW ACTIONS
    // ----------------------------------------------------------

    const handleFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        const key = pickingKeyRef.current;
        event.target.value = "";
        pickingKeyRef.current = null;
        if (!file || key === null) return;
        if (file.size > maxSaveBytes) {
            notify.error(`Attachment files cannot exceed ${maxSaveMB} MB.`);
            return;
        }

        const url = URL.createObjectURL(file);
        urlsRef.current.add(url);

        setRows((previous) =>
            previous.map((row) => {
                if (row.key !== key) return row;
                releaseUrl(row.previewUrl);
                return {
                    ...row,
                    file,
                    fileName: file.name,
                    previewUrl: url,
                    previewBlob: file,
                    storedDox: null,
                    rowState: row.original ? "modified" : "added",
                };
            }),
        );
    };

    const clearFile = (key: number) => {
        setRows((previous) =>
            previous.map((row) => {
                if (row.key !== key) return row;
                releaseUrl(row.previewUrl);
                return {
                    ...row,
                    file: null,
                    fileName: "",
                    previewUrl: null,
                    previewBlob: null,
                    note: "",
                    storedDox: null,
                    rowState: row.original ? "modified" : "added",
                };
            }),
        );
        setPreviewRow((current) => (current?.key === key ? null : current));
        setPreviewContent(null);
    };

    const updateNote = (key: number, note: string) => {
        setRows((previous) =>
            previous.map((row) => {
                if (row.key !== key) return row;
                const rowState: AttachmentRowState = row.original
                    ? note === (row.original.note ?? "") &&
                        !row.file &&
                        row.fileName === (row.original.fileName ?? "")
                        ? "unchanged"
                        : "modified"
                    : "added";
                return { ...row, note, rowState };
            }),
        );
    };

    // ----------------------------------------------------------
    // SAVE / CLEAR
    // ----------------------------------------------------------

    const handleSave = async () => {
        if (saving) return;

        let nextSlNo = Math.max(0, ...rows.map((row) => row.original?.slNo ?? 0)) + 1;
        const changedRows = rows.filter(
            (row) =>
                row.rowState !== "unchanged" && (row.original || row.fileName || row.note.trim()),
        );

        if (changedRows.length === 0) {
            notify.error("Attach a file or add a note before saving.");
            return;
        }

        const totalSize = changedRows.reduce(
            (total, row) => total + (row.file?.size ?? base64ByteSize(row.storedDox)),
            0,
        );
        if (totalSize > maxSaveBytes) {
            notify.error(`Combined attachment files cannot exceed ${maxSaveMB} MB per save.`);
            return;
        }

        setSaving(true);
        let saved = false;
        try {
            const payload: AttachmentSaveRow[] = await Promise.all(
                changedRows.map(async (row) => ({
                    slNo: row.original?.slNo ?? nextSlNo++,
                    note: row.note.trim() || null,
                    fileName: row.fileName || null,
                    fileType: row.file
                        ? fileExtension(row.file.name)
                        : row.fileName
                            ? (row.original?.fileType ?? fileExtension(row.fileName))
                            : null,
                    dox: row.file ? await fileToBase64(row.file) : row.storedDox,
                    ...(row.original ? { originalSlNo: row.original.slNo } : {}),
                    rowState: row.original ? row.rowState : ("added" as const),
                })),
            );
            await onSave?.(payload);
            notify.success("Saved successfully");
            saved = true;
        } catch (err) {
            notify.error(err instanceof Error ? err.message : "Unable to save documents.");
        } finally {
            setSaving(false);
            if (saved) onClose?.();
        }
    };

    const handleClear = () => {
        rows.forEach((row) => releaseUrl(row.previewUrl));
        const fresh = initialRows(attachments, minRows);
        setRows(fresh);
        setSelectedKey(fresh[0].key);
        closePreview();
    };

    // Alt + S = Save
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                void handleSave();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    // ----------------------------------------------------------
    // RENDER
    // ----------------------------------------------------------

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-full w-262 max-w-full overflow-auto border border-gray-400 bg-white shadow-xl">
                <header className="flex h-9 items-center border-b border-slate-300 bg-[#78d4a4] pr-2">
                    <h1 className="ml-[10px] text-[17px] font-semibold">
                        {headerName}
                    </h1>

                    {onClose && (
                        <div className="ml-auto">
                            <CloseButton onClose={onClose} />
                        </div>
                    )}
                </header>

                <section className="px-3.5 pb-3 pt-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChosen}
                    />

                    <div
                        className={`max-h-[min(540px,calc(100vh-240px))] overflow-auto border border-[#B7ECD0] bg-white ${niceScrollbar}`}
                    >
                        <table className="w-full table-fixed border-collapse text-[13px] text-[#24364d]">
                            <colgroup>
                                <col className="w-4.5" />
                                <col className="w-10" />
                                <col />
                                <col className="w-16" />
                                <col className="w-16" />
                                <col className="w-80" />
                            </colgroup>
                            <thead className="sticky top-0 z-10">
                                <tr>
                                    <th className={thClass} />
                                    <th className={`${thClass} text-right`}>Line</th>
                                    <th className={`${thClass} text-left`}>File Name</th>
                                    <th className={`${thClass} text-center`} />
                                    <th className={`${thClass} text-center`}>View</th>
                                    <th className={`${thClass} text-left`}>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => {
                                    const selected = row.key === selectedKey;
                                    const isNewRow = row.key === firstEmptyKey;
                                    return (
                                        <tr
                                            key={row.key}
                                            onClick={() => setSelectedKey(row.key)}
                                            className={selected ? "bg-[#f2faf5]" : "bg-white"}
                                        >
                                            <td className="h-7.5 border border-[#B7ECD0] bg-[#fafbfc] text-center text-[10px] text-[#405066]">
                                                {selected ? "▶" : isNewRow ? "*" : ""}
                                            </td>

                                            <td className="border border-[#B7ECD0] px-2 py-1 text-right">
                                                {index + 1}
                                            </td>

                                            <td className="border border-[#B7ECD0] px-2 py-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="min-w-0 flex-1 truncate" title={row.fileName}>
                                                        {row.fileName}
                                                    </span>
                                                    {row.fileName && (
                                                        <button
                                                            type="button"
                                                            title={`Remove ${row.fileName}`}
                                                            aria-label={`Remove file from line ${index + 1}`}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                clearFile(row.key);
                                                            }}
                                                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-600 hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <MdClose size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="border border-[#B7ECD0] text-center">
                                                <button
                                                    type="button"
                                                    title={`Attach file to line ${index + 1}`}
                                                    aria-label={`Attach file to line ${index + 1}`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        openFilePicker(row);
                                                    }}
                                                    className="inline-flex h-6.5 w-7.5 items-center justify-center rounded text-[#287a4b] hover:bg-green-50"
                                                >
                                                    <MdAttachFile size={17} />
                                                </button>
                                            </td>

                                            <td className="border border-[#B7ECD0] text-center">
                                                {row.fileName &&
                                                    (row.previewUrl || (row.original && loadAttachmentFile)) && (
                                                        <button
                                                            type="button"
                                                            title={`Preview ${row.fileName}`}
                                                            aria-label={`Preview file on line ${index + 1}`}
                                                            disabled={previewLoading}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void openPreview(row);
                                                            }}
                                                            className="inline-flex h-6.5 w-7.5 items-center justify-center rounded text-blue-500 hover:bg-blue-50 disabled:opacity-50"
                                                        >
                                                            <MdVisibility size={17} />
                                                        </button>
                                                    )}
                                            </td>

                                            <td className="border border-[#B7ECD0] p-0">
                                                <input
                                                    aria-label={`Note for line ${index + 1}`}
                                                    value={row.note}
                                                    maxLength={maxNoteLength}
                                                    onFocus={() => setSelectedKey(row.key)}
                                                    onChange={(event) => updateNote(row.key, event.target.value)}
                                                    className="h-7.5 w-full bg-transparent px-2 text-[13px] outline-none focus:bg-[#E6F6F8]"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5 flex justify-center gap-3">
                        <ActionButton
                            id="btnSave"
                            label={saving ? "Saving..." : "Save"}
                            underlineIndex={saving ? undefined : 0}
                            disabled={saving}
                            onClick={() => void handleSave()}
                        />
                        <ActionButton
                            id="btnClear"
                            label="Clear"
                            underlineIndex={0}
                            disabled={saving}
                            onClick={handleClear}
                        />
                    </div>
                </section>
            </div>

            {/* ====================================================
          PREVIEW DIALOG
      ==================================================== */}

            {previewRow?.fileName && (previewLoading || previewRow.previewUrl) && (
                <div
                    className="fixed inset-0 z-10000 flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closePreview();
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="attach-preview-title"
                        className="flex max-h-full w-full max-w-200 flex-col overflow-hidden rounded-md border border-[#91a7bb] bg-white shadow-xl"
                    >
                        <div className="flex h-9.5 shrink-0 items-center justify-between bg-[#78d4a4] px-3">
                            <h2
                                id="attach-preview-title"
                                className="truncate text-[14px] font-semibold text-[#24364d] ml-[10px]"
                            >
                                Preview - {previewRow.fileName}
                            </h2>
                            <button
                                type="button"
                                aria-label="Close preview"
                                onClick={closePreview}
                                className="rounded p-1 text-[#24364d] hover:bg-white/40 cursor-pointer"
                            >
                                <MdClose size={19} />
                            </button>
                        </div>

                        <div className={`min-h-75 flex-1 overflow-auto bg-[#fafbfc] p-3 ${niceScrollbar}`}>
                            {previewLoading ? (
                                <div
                                    className="flex h-60 items-center justify-center text-sm text-slate-600"
                                    role="status"
                                >
                                    Loading preview...
                                </div>
                            ) : isImage(previewRow) ? (
                                <img
                                    src={previewRow.previewUrl ?? undefined}
                                    alt={previewRow.fileName}
                                    className="mx-auto max-h-[70vh] max-w-full object-contain"
                                />
                            ) : isPdf(previewRow) ? (
                                <iframe
                                    title={previewRow.fileName}
                                    src={previewRow.previewUrl ?? undefined}
                                    className="h-[70vh] w-full border border-[#B7ECD0] bg-white"
                                />
                            ) : previewContent?.kind === "text" ? (
                                <div>
                                    {previewContent.truncated && (
                                        <p className="mb-2 text-sm text-amber-700">
                                            Showing the first 1 MB of this text file.
                                        </p>
                                    )}
                                    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words border border-[#B7ECD0] bg-white p-3 text-left text-sm">
                                        {previewContent.text}
                                    </pre>
                                </div>
                            ) : previewContent?.kind === "spreadsheet" ? (
                                <div>
                                    <p className="mb-2 text-sm text-slate-600">
                                        First worksheet: {previewContent.sheetName}
                                    </p>
                                    {previewContent.truncated && (
                                        <p className="mb-2 text-sm text-amber-700">
                                            Preview limited to the first 1,000 rows and 50 columns.
                                        </p>
                                    )}
                                    <div
                                        className={`max-h-[70vh] overflow-auto border border-[#B7ECD0] bg-white ${niceScrollbar}`}
                                    >
                                        <table className="w-full border-collapse text-left text-sm">
                                            <tbody>
                                                {previewContent.rows.map((cells, rowIndex) => (
                                                    <tr key={rowIndex}>
                                                        {cells.map((cell, cellIndex) => (
                                                            <td
                                                                key={cellIndex}
                                                                className="border border-slate-200 px-2 py-1"
                                                            >
                                                                {cell}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-60 flex-col items-center justify-center gap-3 text-[13px] text-[#405066]">
                                    <p>
                                        {previewContent?.kind === "message"
                                            ? previewContent.message
                                            : "Preview is not available for this file type."}
                                    </p>
                                    <a
                                        href={previewRow.previewUrl ?? undefined}
                                        download={previewRow.fileName}
                                        className="btn-style inline-flex items-center"
                                    >
                                        Download
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttachPopup;