import { Request, Response } from "express";

import pool from "../DB/db.js";

import {
  deleteReceiptService,
  saveReceiptService,
  updateReceiptService,
} from "../services/receiptService.js";
import {
  cleanReceiptPayload,
  CheckISdividISccid,
  isActivePeriod,
} from "../utils/helper.js";
import { getReceiptPrintData } from "../services/receiptPrintService.js";
import { GetData } from "../services/GetDataService.js";
import { UserAudit } from "../utils/UserAudit.js";
import type { ReceiptContext } from "../middleware/receiptContext.js";
import { GetStrDocType } from "../utils/docType.js";

/* Set by requireReceiptContext middleware (headers sent from localStorage). */
const getCtx = (res: Response): ReceiptContext =>
  res.locals.ctx as ReceiptContext;

/* =========================================================
   GET RECEIPT INITIAL DATA
========================================================= */

export const getReceipt = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { pstrCoID, pstrYear, pstrUserID } = getCtx(res);

    const year = Number(pstrYear);

    /* B -> BR, C -> CR (GET request: type comes from the query string) */

    const receiptType = GetStrDocType(req.query.lkpType ?? "B");

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

    /* INITIAL RECEIPT NUMBER (getnextdocno expects BR / CR) */

    let receiptNo: string | number | null = null;

    if (defaultBranch) {
      const receiptNoResult = await pool.query(
        `SELECT * FROM dbo.getnextdocno($1, $2, $3, $4)`,
        [pstrCoID, year, defaultBranch, receiptType],
      );

      receiptNo =
        receiptNoResult.rows[0]?.getnextdocno ||
        receiptNoResult.rows[0]?.fdocno ||
        receiptNoResult.rows[0]?.docno ||
        null;
    } else {
      console.warn(
        "Default branch not found. Receipt number was not generated.",
      );
    }

    return res.status(200).json({
      success: true,

      message: "Receipt data loaded successfully",

      data: branchResult.rows || [],

      finparam: finparamResult.rows || [],

      accounts: accountsResult.rows || [],

      accountsortbyId: accountsidResult.rows || [],

      costCenters,

      defaultBranch,

      receiptNo,

      receiptType,
    });
  } catch (error: unknown) {
    console.error("ReceiptsControllers error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to load receipt data",

      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   GET RECEIPT TYPE (cash / bank accounts)
========================================================= */

export const getReceiptType = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { pstrCoID } = getCtx(res);

    const { lkpType } = req.body;

    if (!lkpType) {
      return res.status(400).json({
        success: false,
        message: "Type parameter is required",
      });
    }

    if (lkpType !== "C" && lkpType !== "B") {
      return res.status(400).json({
        success: false,
        message: "cashorbank parameter must be either 'C' or 'B'",
      });
    }

    const result = await pool.query(
      `SELECT * FROM dbo.filllookupcbaccountname($1,$2)`,
      [pstrCoID, lkpType],
    );

    return res.status(200).json({
      success: true,
      lkpType,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("GetReceiptCashORBank error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load cash/bank accounts",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   GET DOCUMENT NUMBER
========================================================= */

export const getDocNo = async (
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
      [pstrCoID, Number(pstrYear), lkpBranch, GetStrDocType(strDocType)],
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("GetReceipt No.  error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate Receipt No.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   GET CUSTOMER DIVISION
========================================================= */

export const getDivID = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { pstrCoID } = getCtx(res);

    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Account ID is required",
      });
    }

    const result = await pool.query(
      `SELECT * FROM dbo.fillcustomerdivisions($1, $2)`,
      [pstrCoID, accountId],
    );

    return res.status(200).json({
      success: true,
      message: "Customer divisions loaded successfully",
      data: result.rows || [],
    });
  } catch (error: unknown) {
    console.error("GetCustomerDivisions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load customer divisions",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   SAVE RECEIPT
========================================================= */

export const saveReceipt = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const ctx = getCtx(res);

    const payload = cleanReceiptPayload(req.body);

    const docType = GetStrDocType(req.body.lkpType);

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

    const existing = await GetData({
      lkpBranch: String(lkpBranch),
      lkpType: docType,
      txtDocNo: String(txtDocNo),
    });

    if (existing?.exists) {
      const next = await pool.query(
        `SELECT * FROM dbo.getnextdocno($1, $2, $3, $4)`,
        [ctx.pstrCoID, Number(ctx.pstrYear), lkpBranch, docType],
      );

      const newReceiptNo = next.rows[0]?.getnextdocno;

      if (!newReceiptNo || String(newReceiptNo) === String(txtDocNo)) {
        throw new Error("Unable to generate a new Receipt No");
      }

      return res.status(409).json({
        success: false,
        receiptNoChanged: true,
        oldReceiptNo: txtDocNo,
        newReceiptNo,
        message: `Receipt No ${txtDocNo} is already used`,
      });
    }

    const result = await saveReceiptService(payload, ctx);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error: unknown) {
    console.error("ReceiptsControllers error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Receipt could not be saved",
    });
  }
};

/* =========================================================
   MODIFY RECEIPT
========================================================= */

export const modifyReceipt = async (
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

    const result = await updateReceiptService(payload, ctx);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error: unknown) {
    console.error("updateReceipt error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Receipt could not be modified",
    });
  }
};

/* =========================================================
   TEST GET
========================================================= */

export const testget = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    return res.status(200).json({
      success: true,
      message: "Test GET endpoint is working",
    });
  } catch (error: unknown) {
    console.error("testget error:", error);
  }
};

/* =========================================================
   GET RECEIPT FOR MODIFY
========================================================= */

export async function GetDatas(req: Request, res: Response): Promise<Response> {
  try {
    const { lkpBranch, lkpType, txtDocNo } = req.query;

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
        message: "Receipt type is required",
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

    const result = await GetData({
      lkpBranch: String(lkpBranch),
      lkpType: GetStrDocType(lkpType),
      txtDocNo: String(txtDocNo),
    });

    if (!result || result.exists === false) {
      return res.status(404).json(
        result || {
          exists: false,
          header: null,
          rows: [],
          message: "Receipt not found",
        },
      );
    }

    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error("GetDatas error:", error);

    return res.status(500).json({
      exists: false,
      header: null,
      rows: [],
      message:
        error instanceof Error ? error.message : "Failed to load receipt",
    });
  }
}

/* =========================================================
   DELETE RECEIPT
========================================================= */

export const DeleteReceipt = async (
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

    const docType = GetStrDocType(lkpType);

    // GET EXISTING RECEIPT BEFORE DELETE
    const receiptData = await GetData({
      lkpBranch,
      lkpType: docType,
      txtDocNo,
    });

    // DATA REQUIRED FOR AUDIT
    const dtpDate = receiptData?.header?.dtpDate ?? "";
    const cbAccountName = receiptData?.header?.cbAccountName ?? "";
    const receivedFrom = receiptData?.header?.receivedFrom ?? "";
    const totalCredit = Number(receiptData?.total ?? 0);

    const gstrUserAuditNote =
      `Date : ${dtpDate}\n` +
      `Cash/Bank Account Name: ${cbAccountName}\n` +
      `Received From : ${receivedFrom}\n` +
      `Amount : ${totalCredit}`;

    const auditResult = await UserAudit(
      ctx.pstrCoID,
      ctx.pstrYear,
      lkpBranch,
      docType,
      txtDocNo,
      "Receipt",
      "D",
      ctx.pstrUserID,
      gstrUserAuditNote,
    );

    const result = await deleteReceiptService(
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
    console.error("DeleteReceipt error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Receipt could not be deleted",
    });
  }
};

/* =========================================================
   PRINT RECEIPT
========================================================= */

export const getReceiptPrint = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { pstrCoID, pstrYear } = getCtx(res);

    const asText = (value: unknown): string =>
      typeof value === "string" ? value.trim() : "";

    const strbranch = asText(req.query.lkpBranch);
    const lkpType = GetStrDocType(asText(req.query.lkpType));
    const strdocNo = asText(req.query.txtDocNo);

    if (!strbranch || !lkpType || !strdocNo) {
      return res.status(400).json({
        success: false,
        message: "Branch, receipt type and receipt number are required",
      });
    }

    const data = await getReceiptPrintData({
      coId: pstrCoID,
      year: pstrYear,
      branch: strbranch,
      lkpType,
      docNo: strdocNo,
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found. Save the receipt before printing.",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("getReceiptPrint error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load receipt for printing",
    });
  }
};
