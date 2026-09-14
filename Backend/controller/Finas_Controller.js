import pool from "../DB/db.js";
import {
  saveReceiptService,
  updateReceiptService,
} from "../services/receiptService.js";
import {GetData} from "../services/GetData.js"

export const ReceiptsControllers = async (req, res) => {
  try {
    const PstrCoID = process.env.PstrCoID;
    const PstrUserID = process.env.PstrUserID;
    const PstrYear = Number(process.env.PstrYear);

    console.log("=================================");
    console.log("REQUEST BODY:", req.body);
    console.log("=================================");

    /* =====================================================
       ENVIRONMENT VALIDATION
    ===================================================== */

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is not configured",
      });
    }

    if (!PstrYear) {
      return res.status(400).json({
        success: false,
        message: "Financial year is not configured",
      });
    }

    /* =====================================================
       RECEIPT TYPE

       UI:
       B = Bank
       C = Cash

       DB:
       B = BR
       C = CR
    ===================================================== */

    const receiptType =
      req.body?.type === "B"
        ? "BR"
        : req.body?.type === "C"
        ? "CR"
        : req.body?.type || "BR";

    console.log("UI TYPE:", req.body?.type);
    console.log("DB RECEIPT TYPE:", receiptType);

    /* =====================================================
       BRANCHES
    ===================================================== */

    const branchResult = await pool.query(
      `
      SELECT *
      FROM dbo.filluserbranch($1, $2)
      `,
      [
        PstrCoID,
        PstrUserID,
      ]
    );

    /* =====================================================
       DEFAULT BRANCH
    ===================================================== */

    const defaultBranchResult = await pool.query(
      `
      SELECT *
      FROM dbo.filldefaultbranch($1, $2)
      `,
      [
        PstrCoID,
        PstrUserID,
      ]
    );

    console.log(
      "defaultBranchResult:",
      defaultBranchResult
    );

    const defaultBranch =
      defaultBranchResult.rows[0]?.fbrid ||
      defaultBranchResult.rows[0]?.filldefaultbranch ||
      null;

    console.log(
      "DEFAULT BRANCH:",
      defaultBranch
    );

    /* =====================================================
       FINANCIAL PARAMETERS
    ===================================================== */

    const finparamResult = await pool.query(
      `
      SELECT *
      FROM dbo.fillfinparam()
      `
    );

    /* =====================================================
       ACCOUNTS
    ===================================================== */

    const accountsResult = await pool.query(
      `
      SELECT *
      FROM dbo.fillaccountheads($1)
      `,
      [
        PstrCoID,
      ]
    );

    /* =====================================================
       COST CENTERS
    ===================================================== */

    let costCenters = [];

    try {
      const costCenterResult = await pool.query(
        `
        SELECT *
        FROM dbo.fillcostcenters($1)
        `,
        [
          PstrCoID,
        ]
      );

      costCenters = costCenterResult.rows;

    } catch (error) {

      console.warn(
        "Cost center loading failed:",
        error.message
      );

      costCenters = [];
    }

    /* =====================================================
       INITIAL RECEIPT NUMBER

       IMPORTANT

       getnextdocno expects the document type:

       BR = Bank Receipt
       CR = Cash Receipt
    ===================================================== */

    let receiptNo = null;

    if (defaultBranch) {

      console.log(
        "Calling getnextdocno with:",
        {
          PstrCoID,
          PstrYear,
          defaultBranch,
          receiptType,
          module: "FIN",
        }
      );

      const receiptNoResult =
        await pool.query(
          `
          SELECT *
          FROM dbo.getnextdocno(
            $1,
            $2,
            $3,
            $4,
            $5
          )
          `,
          [
            PstrCoID,
            PstrYear,
            defaultBranch,
            receiptType,
            "dbo.tblfintrans",
          ]
        );

      console.log(
        "receiptNoResult:",
        receiptNoResult
      );

      receiptNo =
        receiptNoResult.rows[0]
          ?.getnextdocno ||
        receiptNoResult.rows[0]
          ?.fdocno ||
        receiptNoResult.rows[0]
          ?.docno ||
        null;

    } else {

      console.warn(
        "Default branch not found. Receipt number was not generated."
      );
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({

      success: true,

      message:
        "Receipt data loaded successfully",

      data:
        branchResult.rows || [],

      finparam:
        finparamResult.rows || [],

      accounts:
        accountsResult.rows || [],

      costCenters,

      defaultBranch,

      receiptNo,

      receiptType,
    });

  } catch (error) {

    console.error(
      "ReceiptsControllers error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Failed to load receipt data",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

export const GetReceiptCashORBank = async (req, res) => {
  try {
    const PstrCoID = process.env.PstrCoID;
    const { cashorbank } = req.body;
    const {fptype} = req.body;

    if (!cashorbank) {
      return res.status(400).json({
        success: false,
        message: "cashorbank parameter is required",
      });
    }

    if (cashorbank !== "C" && cashorbank !== "B") {
      return res.status(400).json({
        success: false,
        message: "cashorbank parameter must be either 'C' or 'B'",
      });
    }

    const functionName =
      cashorbank === "C"
        ? "dbo.fillcashaccounts"
        : "dbo.fillbankaccounts";

    const result = await pool.query(
      `SELECT * FROM ${functionName}($1)`,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      cashorbank,
      data: result.rows,
    });
  } catch (error) {
    console.error("GetReceiptCashORBank error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load cash/bank accounts",
      error: error.message,
    });
  }
};

export const GetReceiptDocNumber = async (req, res) => {
  try {
    const PstrCoID = process.env.PstrCoID;
    const PstrYear = Number(process.env.PstrYear);
    const { fptype,fbrid } = req.body;


    console.log("================fptype=================",fptype
);

    /* =========================================
       VALIDATION
    ========================================= */

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    if (!PstrYear) {
      return res.status(400).json({
        success: false,
        message: "Financial year is not configured",
      });
    }

    if (!fptype) {
      return res.status(400).json({
        success: false,
        message: "Document type is required",
      });
    }

    /* =========================================
       GET NEXT RECEIPT DOCUMENT NUMBER
       
       RV = Receipt Voucher
    ========================================= */


    console.log("fbrid",)

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.getnextdocno($1, $2, $3, $4,$5)
      `,
      [
        PstrCoID,
        PstrYear,
        fbrid,
        fptype,
        "dbo.tblfintrans"
      ]
    );

    /* =========================================
       RESPONSE
    ========================================= */

    return res.status(200).json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error(
      "GetReceiptDocNumber error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate receipt document number",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

export const GetCustomerDivisions = async (
  req,
  res
) => {
  try {
    const PstrCoID =
      process.env.PstrCoID;

    const { customerid } =
      req.body;

    console.log(
      "================================="
    );

    console.log(
      "GET CUSTOMER DIVISIONS"
    );

    console.log(
      "Company ID:",
      PstrCoID
    );

    console.log(
      "Customer ID:",
      customerid
    );

    console.log(
      "================================="
    );

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message:
          "Company ID is not configured",
      });
    }

    if (!customerid) {
      return res.status(400).json({
        success: false,
        message:
          "Customer ID is required",
      });
    }

    const result =
      await pool.query(
        `
        SELECT *
        FROM dbo.fillcustomerdivisions(
          $1,
          $2
        )
        `,
        [
          PstrCoID,
          customerid,
        ]
      );

    console.log(
      "Customer Division Result:",
      result.rows
    );

    return res.status(200).json({
      success: true,

      message:
        "Customer divisions loaded successfully",

      data:
        result.rows || [],
    });
  } catch (error) {
    console.error(
      "GetCustomerDivisions error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to load customer divisions",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};



export const saveReceipt = async (req, res) => {
  try {
    const result = await saveReceiptService(req.body);

  
    console.log("saveReceipt request body:", req.body);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("ReceiptsControllers error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Receipt could not be saved",
    });
  }
};

export const updateReceipt = async (req, res) => {
  try {
    const result = await updateReceiptService(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("updateReceipt error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Receipt could not be modified",
    });
  }
};

export const testget = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Test GET endpoint is working",
    });
  } catch (error) {
    console.error("testget error:", error);
  }
}




/* =========================================================
   GET RECEIPT FOR MODIFY
========================================================= */

export async function GetDatas(
  req,
  res
) {

  try {

    /* =====================================================
       QUERY PARAMETERS
    ===================================================== */

    const {
      branch,
      docType,
      docNo,
    } = req.query;


    console.log(
      "\n======================================"
    );

    console.log(
      "GET RECEIPT FOR MODIFY"
    );

    console.log(
      "Branch:",
      JSON.stringify(branch)
    );

    console.log(
      "Doc Type:",
      JSON.stringify(docType)
    );

    console.log(
      "Doc No:",
      JSON.stringify(docNo)
    );

    console.log(
      "======================================"
    );


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      branch === undefined ||
      branch === null ||
      String(branch).trim() === ""
    ) {

      return res.status(400).json({

        exists: false,

        header: null,

        rows: [],

        message:
          "Branch is required",

      });

    }


    if (
      docType === undefined ||
      docType === null ||
      String(docType).trim() === ""
    ) {

      return res.status(400).json({

        exists: false,

        header: null,

        rows: [],

        message:
          "Receipt type is required",

      });

    }


    if (
      docNo === undefined ||
      docNo === null ||
      String(docNo).trim() === ""
    ) {

      return res.status(400).json({

        exists: false,

        header: null,

        rows: [],

        message:
          "Receipt number is required",

      });

    }


    /* =====================================================
       CALL GetData

       IMPORTANT:

       Service expects:

       strbranch
       strdocType
       strdocNo
    ===================================================== */

    console.log(
      "Calling GetData..."
    );


    const result =
      await GetData({

        strbranch:
          branch,

        strdocType:
          docType,

        strdocNo:
          docNo,

      });


    /* =====================================================
       NOT FOUND
    ===================================================== */

    if (
      !result ||
      result.exists === false
    ) {

      return res.status(404).json(

        result || {

          exists: false,

          header: null,

          rows: [],

          message:
            "Receipt not found",

        }

      );

    }


    /* =====================================================
       SUCCESS
    ===================================================== */

    return res.status(200).json(
      result
    );


  } catch (error) {

    console.error(
      "GetDatas error:",
      error
    );


    return res.status(500).json({

      exists: false,

      header: null,

      rows: [],

      message:
        error.message ||
        "Failed to load receipt",

    });

  }

}