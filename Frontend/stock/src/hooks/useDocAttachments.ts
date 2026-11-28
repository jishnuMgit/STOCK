import { useCallback, useState } from "react";
import { apiFetch } from "../utils/session";
import type {
    AttachmentRecord,
    AttachmentSaveRow,
} from "../components/common/AttachPopup";

const MIME: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain",
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/* tolerant of camelCase / lowercase / fSlNo style keys */
const pick = (row: any, ...keys: string[]) => {
    for (const key of keys) {
        if (row?.[key] !== undefined && row[key] !== null) return row[key];
    }
    return null;
};

export const useDocAttachments = (basePath: string) => {
    const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);

    const params = (branch: string, docType: string, docNo: string) =>
        new URLSearchParams({ lkpBranch: branch, lkpType: docType, txtDocNo: docNo });

    const load = useCallback(
        async (branch: string, docType: string, docNo: string) => {
            const res = await apiFetch(
                `${import.meta.env.VITE_API_URL}${basePath}/attachments?${params(branch, docType, docNo)}`,
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Unable to load attachments.");

            const list: AttachmentRecord[] = (json.data ?? []).map((r: any) => {
                const fileName = pick(r, "fileName", "fDoxName", "fdoxname");
                const fileType = pick(r, "fileType", "fDoxType", "fdoxtype");
                return {
                    slNo: Number(pick(r, "slNo", "fSlNo", "fslno")),
                    note: pick(r, "note", "fNote", "fnote"),
                    fileName,
                    fileType,
                    mimeType: MIME[String(fileType ?? "").toLowerCase()] ?? "application/octet-stream",
                    dox: null, // fetched on demand via loadFile
                };
            });

            setAttachments(list);
            return list;
        },
        [basePath],
    );

    const loadFile = useCallback(
        (branch: string, docType: string, docNo: string) => async (slNo: number) => {
            const res = await apiFetch(
                `${import.meta.env.VITE_API_URL}${basePath}/attachments/file?${params(branch, docType, docNo)}&slNo=${slNo}`,
            );
            if (!res.ok) throw new Error("Unable to load the attachment.");
            return res.blob();
        },
        [basePath],
    );

    const save = useCallback(
        (branch: string, docType: string, docNo: string) =>
            async (rows: AttachmentSaveRow[]) => {
                const res = await apiFetch(
                    `${import.meta.env.VITE_API_URL}${basePath}/attachments/save`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lkpBranch: branch,
                            lkpType: docType,
                            txtDocNo: docNo,
                            rows,
                        }),
                    },
                );
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.message || "Unable to save documents.");
            },
        [basePath],
    );

    return { attachments, load, loadFile, save };
};