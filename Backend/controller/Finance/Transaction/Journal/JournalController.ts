import type { Request, Response } from "express";

import pool from "../../../../DB/db.js";

import type { ReceiptContext } from "../../../../middleware/receiptContext.js";

import {
    JournalError,
    JOURNAL_DOC_TYPE,
    getJournalService,
    getJournalTypesService,
    saveJournalService,
    updateJournalService,
    deleteJournalService,
    postJournalService,
} from "../../../../services/Finance/Transaction/Journal/JournalService.js";

/* TODO: use the same way the receipt controller reads the context
   (company / year / user from the frontend localStorage values). */
function getCtx(res: Response): ReceiptContext {
    return res.locals.ctx as ReceiptContext;
}

function handleError(res: Response, error: unknown, fallback: string) {
    if (error instanceof JournalError) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : fallback,
    });
}

/* GET /api/journal/lookups  (same functions the receipt screen uses) */
export async function getJournalLookups(_req: Request, res: Response) {
    try {
        const { pstrCoID } = getCtx(res);

        const accountsResult = await pool.query(
            `SELECT * FROM dbo.filllookupaccountname($1)`,
            [pstrCoID],
        );

        let costCenters: any[] = [];

        try {
            const costCenterResult = await pool.query(
                `SELECT * FROM dbo.fillcostcenters($1)`,
                [pstrCoID],
            );

            costCenters = costCenterResult.rows;
        } catch (error: unknown) {
            console.warn(
                "Cost center loading failed:",
                error instanceof Error ? error.message : String(error),
            );
        }

        return res.status(200).json({
            success: true,
            data: { accounts: accountsResult.rows || [], costCenters },
        });
    } catch (error: unknown) {
        return handleError(res, error, "Failed to load journal lookups");
    }
}

/* GET /api/journal/next-doc-no?brId=JD */
export async function getJournalDocNo(req: Request, res: Response) {
    try {
        const { pstrCoID, pstrYear } = getCtx(res);

        const brId = String(req.query.brId ?? "").trim();

        if (!brId) {
            return res
                .status(400)
                .json({ success: false, message: "Branch is required" });
        }

        const result = await pool.query(
            `SELECT * FROM dbo.getnextdocno($1, $2, $3, $4)`,
            [pstrCoID, pstrYear, brId, JOURNAL_DOC_TYPE],
        );

        const docNo = result.rows[0]?.fdocno;

        if (!docNo) {
            return res
                .status(500)
                .json({ success: false, message: "Failed to generate Journal No." });
        }

        return res.status(200).json({ success: true, data: { docNo } });
    } catch (error: unknown) {
        return handleError(res, error, "Failed to generate Journal No.");
    }
}

/* GET /api/journal/types */
export async function getJournalTypes(_req: Request, res: Response) {
    try {
        const data = await getJournalTypesService(getCtx(res));

        return res.status(200).json({ success: true, data });
    } catch (error: unknown) {
        return handleError(res, error, "Failed to load journal types");
    }
}

/* GET /api/journal?lkpBranch=001&txtDocNo=JV0001 */
export async function getJournal(req: Request, res: Response) {
    try {
        const { lkpBranch, txtDocNo } = req.query as Record<string, string>;

        const result = await getJournalService(
            { lkpBranch, txtDocNo },
            getCtx(res),
        );

        return res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
        return handleError(res, error, "Failed to load journal");
    }
}

/* POST /api/journal */
export async function saveJournal(req: Request, res: Response) {
    try {
        const result = await saveJournalService(req.body, getCtx(res));

        return res.status(201).json({ success: true, ...result });
    } catch (error: unknown) {
        return handleError(res, error, "Failed to save journal");
    }
}

/* PUT /api/journal */
export async function updateJournal(req: Request, res: Response) {
    try {
        const result = await updateJournalService(req.body, getCtx(res));

        return res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
        return handleError(res, error, "Failed to modify journal");
    }
}

/* POST /api/journal/post */
export async function postJournal(req: Request, res: Response) {
    try {
        const { lkpBranch, txtDocNo } = req.body;

        const result = await postJournalService(
            { lkpBranch, txtDocNo },
            getCtx(res),
        );

        return res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
        return handleError(res, error, "Failed to post journal");
    }
}

/* DELETE /api/journal?lkpBranch=001&txtDocNo=JV0001 */
export async function deleteJournal(req: Request, res: Response) {
    try {
        const { lkpBranch, txtDocNo } = req.query as Record<string, string>;

        const result = await deleteJournalService(
            { lkpBranch, txtDocNo },
            getCtx(res),
        );

        return res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
        return handleError(res, error, "Failed to delete journal");
    }
}