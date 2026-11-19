import type { Request, Response } from "express";

import type { ReceiptContext } from "../../../../middleware/receiptContext.js";

import {
    JournalError,
    getJournalService,
    saveJournalService,
    updateJournalService,
    deleteJournalService,
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