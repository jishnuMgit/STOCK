import { Request, Response } from "express";
import pool from "../../DB/db.js";
import type { ReceiptContext } from "../../middleware/receiptContext.js"; 

const getCtx = (res: Response): ReceiptContext =>
    res.locals.ctx as ReceiptContext;

const asText = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";

const mimeOf = (ext: string | null): string =>
    (
        ({
            pdf: "application/pdf",
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            bmp: "image/bmp",
            txt: "text/plain",
            csv: "text/csv",
            xlsx:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }) as Record<string, string>
    )[(ext ?? "").toLowerCase()] ?? "application/octet-stream";

/* lkpType = FINAL doc type (BP, CP, JV ...). The frontend resolves it. */

/* LIST (no file bytes) */
export const getAttachments = async (
    req: Request,
    res: Response,
): Promise<Response> => {
    try {
        const { pstrCoID, pstrYear } = getCtx(res);

        const lkpBranch = asText(req.query.lkpBranch);
        const lkpType = asText(req.query.lkpType);
        const txtDocNo = asText(req.query.txtDocNo);

        if (!lkpBranch || !lkpType || !txtDocNo) {
            return res.status(400).json({
                success: false,
                message: "Branch, document type and document number are required",
            });
        }

        const { rows } = await pool.query(
            `SELECT "fSlNo", "fNote", "fDoxName", "fDoxType"
         FROM dbo.tblfindocumentattach
        WHERE "fCoID" = $1 AND "fYear" = $2 AND "fBrID" = $3
          AND "fDocType" = $4 AND "fDocNo" = $5
        ORDER BY "fSlNo"`,
            [pstrCoID, Number(pstrYear), lkpBranch, lkpType, txtDocNo],
        );

        return res.status(200).json({
            success: true,
            data: rows.map((r) => ({
                slNo: r.fSlNo,
                note: r.fNote,
                fileName: r.fDoxName,
                fileType: r.fDoxType,
                mimeType: mimeOf(r.fDoxType),
                dox: null,
            })),
        });
    } catch (error: unknown) {
        console.error("getAttachments error:", error);
        return res.status(500).json({
            success: false,
            message:
                error instanceof Error ? error.message : "Failed to load attachments",
        });
    }
};

/* FILE (for preview) */
export const getAttachmentFile = async (
    req: Request,
    res: Response,
): Promise<Response> => {
    try {
        const { pstrCoID, pstrYear } = getCtx(res);

        const lkpBranch = asText(req.query.lkpBranch);
        const lkpType = asText(req.query.lkpType);
        const txtDocNo = asText(req.query.txtDocNo);
        const slNo = Number(req.query.slNo);

        const { rows } = await pool.query(
            `SELECT "fDox", "fDoxType"
         FROM dbo.tblfindocumentattach
        WHERE "fCoID" = $1 AND "fYear" = $2 AND "fBrID" = $3
          AND "fDocType" = $4 AND "fDocNo" = $5 AND "fSlNo" = $6`,
            [pstrCoID, Number(pstrYear), lkpBranch, lkpType, txtDocNo, slNo],
        );

        if (!rows[0]?.fDox) {
            return res
                .status(404)
                .json({ success: false, message: "File not found" });
        }

        res.setHeader("Content-Type", mimeOf(rows[0].fDoxType));
        return res.status(200).send(rows[0].fDox);
    } catch (error: unknown) {
        console.error("getAttachmentFile error:", error);
        return res.status(500).json({
            success: false,
            message:
                error instanceof Error ? error.message : "Failed to load the file",
        });
    }
};

/* SAVE (added / modified rows only) */
export const saveAttachments = async (
    req: Request,
    res: Response,
): Promise<Response> => {
    const client = await pool.connect();

    try {
        const { pstrCoID, pstrYear, pstrUserID } = getCtx(res);

        const lkpBranch = asText(req.body.lkpBranch);
        const lkpType = asText(req.body.lkpType);
        const txtDocNo = asText(req.body.txtDocNo);
        const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

        if (!lkpBranch || !lkpType || !txtDocNo) {
            return res.status(400).json({
                success: false,
                message: "Branch, document type and document number are required",
            });
        }

        const key = [pstrCoID, Number(pstrYear), lkpBranch, lkpType, txtDocNo];

        await client.query("BEGIN");

        for (const r of rows) {
            const note = r.note ? String(r.note).trim() : null;
            const fileName = r.fileName ? String(r.fileName).trim() : null;
            const fileType = r.fileType ? String(r.fileType).trim() : null;

            if (note && note.length > 100)
                throw new Error("Note cannot exceed 100 characters.");
            if (fileName && fileName.length > 100)
                throw new Error(`File name is too long (max 100): ${fileName}`);
            if (fileType && fileType.length > 5)
                throw new Error(`File type is too long (max 5): ${fileType}`);

            // no file and no note -> delete the line
            if (!fileName && !note) {
                if (r.originalSlNo) {
                    await client.query(
                        `DELETE FROM dbo.tblfindocumentattach
              WHERE "fCoID"=$1 AND "fYear"=$2 AND "fBrID"=$3
                AND "fDocType"=$4 AND "fDocNo"=$5 AND "fSlNo"=$6`,
                        [...key, r.originalSlNo],
                    );
                }
                continue;
            }

            const bytes = r.dox ? Buffer.from(r.dox, "base64") : null;

            if (r.originalSlNo) {
                // existing line: keep old bytes unless a new file was sent
                await client.query(
                    `UPDATE dbo.tblfindocumentattach
              SET "fNote"      = $7::varchar,
                  "fDoxName"   = $8::varchar,
                  "fDoxType"   = $9::varchar,
                  "fDox"       = CASE WHEN $8::varchar IS NULL THEN NULL
                                      ELSE COALESCE($10::bytea, "fDox") END,
                  "fMUserID"   = $11,
                  "fMUserDate" = now()
            WHERE "fCoID"=$1 AND "fYear"=$2 AND "fBrID"=$3
              AND "fDocType"=$4 AND "fDocNo"=$5 AND "fSlNo"=$6`,
                    [...key, r.originalSlNo, note, fileName, fileType, bytes, pstrUserID],
                );
            } else {
                // new line
                await client.query(
                    `INSERT INTO dbo.tblfindocumentattach
             ("fCoID","fYear","fBrID","fDocType","fDocNo","fSlNo",
              "fNote","fDoxName","fDox","fDoxType","fcUserID","fcUserDate")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())`,
                    [...key, r.slNo, note, fileName, bytes, fileType, pstrUserID],
                );
            }
        }

        await client.query("COMMIT");

        return res
            .status(200)
            .json({ success: true, message: "Attachments saved successfully" });
    } catch (error: unknown) {
        await client.query("ROLLBACK");
        console.error("saveAttachments error:", error);
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Attachments could not be saved",
        });
    } finally {
        client.release();
    }
};