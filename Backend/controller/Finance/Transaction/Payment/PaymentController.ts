import { Request, Response } from "express";

import pool from "../../../../DB/db.js";

import {
    deletePaymentService,
    savePaymentService,
    updatePaymentService,
} from "../../../../services/Finance/Transaction/Payment/PaymentService.js";
import { GetPaymentData } from "../../../../services/Finance/Transaction/Payment/GetPaymentDataService.js"
import {
    cleanReceiptPayload,
    CheckISdividISccid,
    isActivePeriod,
} from "../../../../utils/helper.js";
import { UserAudit } from "../../../../utils/UserAudit.js";
import type { ReceiptContext } from "../../../../middleware/receiptContext.js";
import { GetPaymentDocType } from "../../../../utils/PaymentDocType.js"

/* Set by requireReceiptContext middleware (headers sent from localStorage). */
const getCtx = (res: Response): ReceiptContext =>
    res.locals.ctx as ReceiptContext;

/* =========================================================
   GET PAYMENT INITIAL DATA
========================================================= */

export const getPayment = async (
    req: Request,
    res: Response,
): Promise<Response> => {
    try {
        const { pstrCoID, pstrYear, pstrUserID } = getCtx(res);

        const year = Number(pstrYear);

        /* B -> BP, C -> CP */
        const paymentType = GetPaymentDocType(req.query.lkpType ?? "B");

        const branchResult = await pool.query(
            `SELECT * FROM dbo.filluserbranch($1, $2)`,
            [pstrCoID, pstrUserID],
        );

        const defaultBranchResult = await pool.query(
            `SELECT * FROM dbo.filldefaultbranch($1, $2)`,
            [pstrCoID, pstrUserID],
        );

        const defaultBranch =
            defaultBranchResult.rows[0]?.fbrid ||
            defaultBranchResult.rows[0]?.filldefaultbranch ||
            null;

        const finparamResult = await pool.query(`SELECT * FROM dbo.fillfinparam()`);

        const accountsResult = await pool.query(
            `SELECT * FROM dbo.filllookupaccountname($1)`,
            [pstrCoID],
        );

        const accountsidResult = await pool.query(
            `SELECT * FROM dbo.filllookupaccountid($1)`,
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

            costCenters = [];
        }

        let paymentNo: string | number | null = null;

        if (defaultBranch) {
            try {
                const paymentNoResult = await pool.query(
                    `SELECT * FROM dbo.getnextdocno($1, $2, $3, $4)`,
                    [pstrCoID, year, defaultBranch, paymentType],
                );

                paymentNo =
                    paymentNoResult.rows[0]?.getnextdocno ||
                    paymentNoResult.rows[0]?.fdocno ||
                    paymentNoResult.rows[0]?.docno ||
                    null;
            } catch (error: unknown) {
                console.warn(
                    "Payment number generation failed:",
                    error instanceof Error ? error.message : String(error),
                );
            }
        }

        return res.status(200).json({
            success: true,

            message: "Payment data loaded successfully",

            data: branchResult.rows || [],

            finparam: finparamResult.rows || [],

            accounts: accountsResult.rows || [],

            accountsortbyId: accountsidResult.rows || [],

            costCenters,

            defaultBranch,

            paymentNo,

            /* kept so the page can reuse the receipt reset logic */
            receiptNo: paymentNo,

            paymentType,
        });
    } catch (error: unknown) {
        console.error("PaymentController getPayment error:", error);

        return res.status(500).json({
            success: false,

            message: "Failed to load payment data",

            error: error instanceof Error ? error.message : String(error),
        });
    }
};

/* =========================================================
   GET DOCUMENT NUMBER
========================================================= */

export const getPaymentDocNo = async (
    req: Request,
    res: Response,
): Promise<Response> => {
    try {
        const { pstrCoID, pstrYear } = getCtx(res);

        const { strDocType, lkpBranch } = req.body;

        if (!strDocType) {
            return res.status(400).json({
                success: false,
                message: "Document type is required",
            });
        }

        const result = await pool.query(
            `SELECT * FROM dbo.getnextdocno($1, $2, $3, $4)`,
            [pstrCoID, Number(pstrYear), lkpBranch, GetPaymentDocType(strDocType)],
        );

        return res.status(200).json({
            success: true,
            data: result.rows,
        });
    } catch (error: unknown) {
        console.error("getPaymentDocNo error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate Payment No.",
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

/* =========================================================
   SAVE PAYMENT
========================================================= */

export const savePayment = async (
    req: Request,
    res: Response,
): Promise<Response> => {
    try {
        const ctx = getCtx(res);

        const payload = cleanReceiptPayload(req.body);

        const docType = GetPaymentDocType(req.body.lkpType);

        // CHECK CC ID AND DIVISION BEFORE SAVE
        await CheckISdividISccid(payload, pool, ctx.pstrCoID);

        const active = await isActivePeriod(
            ctx.pstrCoID,
            payload?.lkpBranch,
            payload?.dtpDate,
        );

        if (!active) {
            return res.status(400).json({
                success: false,
                message: "'Date' must be within the Active Period",
            });
        }

        const { lkpBranch, txtDocNo } = req.body;

        const existing = await GetPaymentData({
            pstrCoID: ctx.pstrCoID,
            pstrYear: ctx.pstrYear,
            lkpBranch: String(lkpBranch),
            lkpType: docType,
            txtDocNo: String(txtDocNo),
        });

        if (existing?.exists) {
            const next = await pool.query(
                `SELECT * FROM dbo.getnextdocno($1, $2, $3, $4)`,
                [ctx.pstrCoID, Number(ctx.pstrYear), lkpBranch, docType],
            );

            const newPaymentNo = next.rows[0]?.getnextdocno;

            if (!newPaymentNo || String(newPaymentNo) === String(txtDocNo)) {
                throw new Error("Unable to generate a new Payment No");
            }

            return res.status(409).json({
                success: false,
                receiptNoChanged: true,
                oldReceiptNo: txtDocNo,
                newReceiptNo: newPaymentNo,
                message: `Payment No ${txtDocNo} is already used`,
            });
        }

        const result = await savePaymentService(payload, ctx);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
        });
    } catch (error: unknown) {
        console.error("savePayment error:", error);

        return res.status(400).json({
            success: false,
            message:
                error instanceof Error ? error.message : "Payment could not be saved",
        });
    }
};

/* =========================================================
   MODIFY PAYMENT
========================================================= */

export const modifyPayment = async (
    req: Request,
    res: Response,
): Promise<Response> => {
    try {
        const ctx = getCtx(res);

        const payload = cleanReceiptPayload(req.body);

        // CHECK CC ID AND DIVISION BEFORE SAVE
        await CheckISdividISccid(payload, pool, ctx.pstrCoID);

        const active = await isActivePeriod(
            ctx.pstrCoID,
            payload?.lkpBranch,
            payload?.dtpDate,
        );

        if (!active) {
            return res.status(400).json({
                success: false,
                message: "'Date' must be within the Active Period",
            });
        }

        const result = await updatePaymentService(payload, ctx);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
        });
    } catch (error: unknown) {
        console.error("modifyPayment error:", error);

        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Payment could not be modified",
        });
    }
};

/* =========================================================
   GET PAYMENT FOR MODIFY
========================================================= */

export async function GetPaymentDatas(
    req: Request,
    res: Response,
): Promise<Response> {
    try {
        const { lkpBranch, lkpType, txtDocNo } = req.query;

        const { pstrCoID, pstrYear } = getCtx(res);

        const isBlank = (value: unknown): boolean =>
            value === undefined || value === null || String(value).trim() === "";

        if (isBlank(lkpBranch)) {
            return res.status(400).json({
                exists: false,
                header: null,
                rows: [],
                message: "Branch is required",
            });
        }

        if (isBlank(lkpType)) {
            return res.status(400).json({
                exists: false,
                header: null,
                rows: [],
                message: "Payment type is required",
            });
        }

        if (isBlank(txtDocNo)) {
            return res.status(400).json({
                exists: false,
                header: null,
                rows: [],
                message: "Document number is required",
            });
        }

        const result = await GetPaymentData({
            pstrCoID,
            pstrYear,
            lkpBranch: String(lkpBranch),
            lkpType: GetPaymentDocType(lkpType),
            txtDocNo: String(txtDocNo),
        });

        if (!result || result.exists === false) {
            return res.status(404).json(
                result || {
                    exists: false,
                    header: null,
                    rows: [],
                    message: "Payment not found",
                },
            );
        }

        return res.status(200).json(result);
    } catch (error: unknown) {
        console.error("GetPaymentDatas error:", error);

        return res.status(500).json({
            exists: false,
            header: null,
            rows: [],
            message:
                error instanceof Error ? error.message : "Failed to load payment",
        });
    }
}

/* =========================================================
   DELETE PAYMENT
========================================================= */

export const DeletePayment = async (
    req: Request,
    res: Response,
): Promise<Response> => {
    try {
        const ctx = getCtx(res);

        const { lkpBranch, lkpType, txtDocNo } = req.body;

        if (!lkpBranch) {
            return res.status(400).json({ message: "branch is required" });
        }

        if (!lkpType) {
            return res.status(400).json({ message: "type is required" });
        }

        if (!txtDocNo) {
            return res.status(400).json({ message: "Doc.No is required" });
        }

        const docType = GetPaymentDocType(lkpType);

        // GET EXISTING PAYMENT BEFORE DELETE (for audit)
        const paymentData = await GetPaymentData({
            pstrCoID: ctx.pstrCoID,
            pstrYear: ctx.pstrYear,
            lkpBranch,
            lkpType: docType,
            txtDocNo,
        });

        const dtpDate = paymentData?.header?.dtpDate ?? "";
        const cbAccountName = paymentData?.header?.cbAccountName ?? "";
        const paidTo = paymentData?.header?.receivedFrom ?? "";
        const totalDebit = Number(paymentData?.total ?? 0);

        const gstrUserAuditNote =
            `Date : ${dtpDate}\n` +
            `Cash/Bank Account Name: ${cbAccountName}\n` +
            `Paid To : ${paidTo}\n` +
            `Amount : ${totalDebit}`;

        const auditResult = await UserAudit(
            ctx.pstrCoID,
            ctx.pstrYear,
            lkpBranch,
            docType,
            txtDocNo,
            "Payment",
            "D",
            ctx.pstrUserID,
            gstrUserAuditNote,
        );

        const result = await deletePaymentService(
            { lkpBranch, lkpType: docType, txtDocNo },
            ctx,
        );

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data,
            audit: auditResult,
        });
    } catch (error: unknown) {
        console.error("DeletePayment error:", error);

        return res.status(400).json({
            success: false,
            message:
                error instanceof Error ? error.message : "Payment could not be deleted",
        });
    }
};