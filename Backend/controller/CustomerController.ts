import { Request, Response } from "express";
import pool from "../DB/db.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import {
  validateCustomerCreate,
  validateCustomerUpdate,
} from "../validators/customerValidation.js";

// ============================================================
// GET /api/customers
// ============================================================

export const getCustomerList = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM dbo.getcustomerlist()");

    const data = result.rows.map((r) => ({
      csAccountId: r.fcsaccountid,
      csAccountName: r.fcsaccountname,
      cs: r.fcs,
      brId: r.fbrid,
      haveDivision: r.fhavedivision,
      gAccountId: r.fgaccountid,
      gAccountName: r.fgaccountname,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("getCustomerList error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch customer list" });
  }
};

// ============================================================
// GET /api/customers/next-id?accountTypeId=60&accountLevel=3
// Port of VB: GetNextCSAccountID(AccountTypeID, strAccountLevel)
// ============================================================

export const getNextCSAccountId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const accountTypeId = String(req.query.accountTypeId ?? "").trim();
    const level = Number(req.query.accountLevel) + 1; // VB: strAccountLevel + 1

    // gstrCoID in VB -> company from the logged-in session.
    // ADJUST this to however your authMiddleware stores it.
    const CoID = req.user?.CoID;

    if (!accountTypeId) {
      return res
        .status(400)
        .json({ success: false, message: "accountTypeId is required" });
    }

    if (!CoID) {
      return res
        .status(401)
        .json({ success: false, message: "Company not found in session" });
    }

    // VB only handles Case 4
    if (level !== 4) {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported account level" });
    }

    const result = await pool.query(
      `SELECT COALESCE(MAX(fcsaccountid), '0') AS maxid
         FROM dbo.tblaccountcs
        WHERE fcoid = $1
          AND LEFT(fcsaccountid, 2) = $2`,
      [CoID, accountTypeId],
    );

    const maxId = String(result.rows[0].maxid);

    // VB: If Val(Mid(strDummy, 3, 3)) >= 999
    if ((Number(maxId.substring(2, 5)) || 0) >= 999) {
      return res
        .status(409)
        .json({ success: false, message: "Unable to Generate New Account ID" });
    }

    let nextAccountId: string;

    if (maxId === "0") {
      // VB: strDummy = AccountTypeID + "001"
      nextAccountId = `${accountTypeId}001`;
    } else {
      if (!/^\d+$/.test(maxId)) {
        return res.status(500).json({
          success: false,
          message: `Existing account ID "${maxId}" is not numeric`,
        });
      }
      // VB: Val(strDummy) + 1  (padStart keeps any leading zeros)
      nextAccountId = String(Number(maxId) + 1).padStart(maxId.length, "0");
    }

    return res.status(200).json({ success: true, data: { nextAccountId } });
  } catch (error) {
    console.error("getNextCSAccountId error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate next account ID" });
  }
};

// GET /api/customers/parent-accounts
export const getParentAccountReceivables = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await pool.query(
      "SELECT * FROM dbo.fillParentAccountReceivables()",
    );

    const data = result.rows.map((r) => ({
      accountId: r.faccountid,
      accountName: r.faccountname,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("getParentAccountReceivables error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch parent accounts" });
  }
};

// ============================================================
// dbo.sp_pagecustomer  (modes: G = get, S = save, M = modify, D = delete)
// ============================================================

// request body key  ->  stored procedure parameter
const SP_PARAM_MAP: Record<string, string> = {
  csAccountId: "p_strcsaccountid",
  gAccountId: "p_strgaccountid",
  csAccountType: "p_strcsaccounttype",
  csAccountTypeDet: "p_strcsaccounttypedet",
  oldCsAccountId: "p_stroldcsaccountid",
  accountName: "p_straccountname",
  accountNameA: "p_straccountname_a",
  legalName: "p_strlegalname",
  legalNameA: "p_strlegalname_a",
  buildingNo: "p_strbuildingno",
  streetName: "p_strstreetname",
  district: "p_strdistrict",
  city: "p_strcity",
  countryId: "p_strcountryid",
  postalCode: "p_strpostalcode",
  additionalNo: "p_stradditionalno",
  crNo: "p_strcrno",
  buildingNoA: "p_strbuildingno_a",
  streetNameA: "p_strstreetname_a",
  districtA: "p_strdistrict_a",
  cityA: "p_strcity_a",
  countryIdA: "p_strcountryid_a",
  postalCodeA: "p_strpostalcode_a",
  additionalNoA: "p_stradditionalno_a",
  crNoA: "p_strcrno_a",
  contact: "p_strcontact",
  email: "p_stremail",
  phone: "p_strphone",
  vatNo: "p_strvatno",
  vatNoA: "p_strvatno_a",
  transType: "p_strtranstype",
  brId: "p_strbrid",
  invMethod: "p_strinvmethod",
  rcnMethod: "p_strrcnmethod",
  businessTypeId: "p_strbusinesstypeid",
  creditLimit: "p_intcreditlimit",
  creditDays: "p_intcreditdays",
  gdsCustomerId: "p_strgdscustomerid",
  ctaCardType: "p_strctacardtype",
  ctaCardNo: "p_strctacardno",
  ctaExpiry: "p_strctaexpiry",
  calcVatOnDomCanXchg: "p_blncalcvatondomcanxchg",
  exclFromAgeing: "p_blnexclfromageing",
  interCompany: "p_blnintercompany",
  serviceChargePolicy: "p_blnservicechargepolicy",
  haveDivision: "p_blnhavedivision",
  shortName: "p_strshortname",
  csAccountCategoryId: "p_strcsaccountcategoryid",
  status: "p_blnstatus",
  doNotRound: "p_blndonotround",
  menuName: "p_strmenuname",
};

/**
 * Calls dbo.sp_pagecustomer using named notation, so only the fields that
 * were actually sent are passed and the rest keep their SQL DEFAULTs.
 */
const callPageCustomer = async (
  mode: "S" | "M" | "D",
  CoID: string,
  userId: string | undefined,
  fields: Record<string, unknown>,
) => {
  const args: string[] = [];
  const values: unknown[] = [];

  const add = (param: string, value: unknown) => {
    values.push(value);
    args.push(`${param} => $${values.length}`);
  };

  add("p_strmode", mode);
  add("p_strcoid", CoID);
  if (userId) add("p_gstruserid", userId);

  for (const [key, param] of Object.entries(SP_PARAM_MAP)) {
    const value = fields[key];
    if (value !== undefined && value !== null) add(param, value);
  }

  await pool.query(`CALL dbo.sp_pagecustomer(${args.join(", ")})`, values);
};

// Pulls the session values. ADJUST to match your authMiddleware.
const getSession = (req: AuthenticatedRequest) => ({
  CoID: req.user?.CoID as string | undefined,
  userId: (req.user as any)?.userId as string | undefined,
});

// ------------------------------------------------------------
// GET /api/customers/:csAccountId   (mode 'G')
//
// NOTE: sp_pagecustomer's 'G' branch is a bare SELECT inside a
// PROCEDURE. PL/pgSQL rejects that ("query has no destination for
// result data") and a procedure can't return rows via CALL anyway,
// so this reads the table directly with the same column list.
// If you'd rather keep it in the DB, move it into a function
// (RETURNS TABLE) and call that instead.
// ------------------------------------------------------------
export const getCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { CoID } = getSession(req);
    const csAccountId = String(req.params.csAccountId ?? "").trim();

    if (!CoID) {
      return res
        .status(401)
        .json({ success: false, message: "Company not found in session" });
    }
    if (!csAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "csAccountId is required" });
    }

    const result = await pool.query(
      `SELECT *
         FROM dbo.tblaccountcs
        WHERE fcoid = $1
          AND fcsaccountid = $2`,
      [CoID, csAccountId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const r = result.rows[0];

    const data = {
      csAccountType: r.fcs,
      csAccountTypeDet: r.fcsdet,
      gAccountId: r.fgaccountid,
      csAccountId: r.fcsaccountid,

      // names
      accountName: r.fcsaccountname,
      accountNameA: r.faccountname_ar,
      legalName: r.fcsaccountname_leagal,
      legalNameA: r.fleagalaccountname_ar,
      shortName: r.fcsaccountname_short,

      vatNo: r.fvatno,
      vatNoA: r.fvatno_ar,
      contact: r.fcontact,
      phone: r.fphone,
      email: r.femail,
      businessTypeId: r.fbussinesstype,
      brId: r.fbrid,
      creditLimit: r.fcreditlimit,
      creditDays: r.fcreditdays,
      ctaCardType: r.fctacardtype,
      ctaCardNo: r.fctacardno,
      ctaExpiry: r.fctaexpiry,
      exclFromAgeing: r.fexcludefromageing,

      // English address
      buildingNo: r.fbuildingno,
      streetName: r.fstreetname,
      district: r.fdistrict,
      city: r.fcity,
      countryId: r.fcountryid,
      postalCode: r.fpostalcode,
      additionalNo: r.fadditionalno,
      crNo: r.fcrno,

      // Arabic address
      buildingNoA: r.fbuildingno_ar,
      streetNameA: r.fstreetname_a,
      districtA: r.fdistrict_ar,
      cityA: r.fcity_ar,
      countryIdA: r.fcountryid_ar,
      postalCodeA: r.fpostalcode_ar,
      additionalNoA: r.fadditionalno_ar,
      crNoA: r.fcrno_ar,

      haveDivision: r.fhavedivision,
      status: r.fstatus,
      interCompany: r.fintercompany,
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getCustomer error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch customer" });
  }
};

// ------------------------------------------------------------
// POST /api/customers   (mode 'S')
// ------------------------------------------------------------
export const createCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID, userId } = getSession(req);

    if (!CoID) {
      return res
        .status(401)
        .json({ success: false, message: "Company not found in session" });
    }
    if (!req.body?.csAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "csAccountId is required" });
    }

    const v = await validateCustomerCreate(CoID, req.body);
    if (!v.ok) {
      return res
        .status(v.status)
        .json({ success: false, message: v.message, code: v.code });
    }

    await callPageCustomer("S", CoID, userId, req.body);

    return res
      .status(201)
      .json({ success: true, message: "Customer saved successfully" });
  } catch (error: any) {
    console.error("createCustomer error:", error);
    // 23505 = unique_violation (duplicate account id)
    if (error?.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Customer account already exists" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to save customer" });
  }
};

// ------------------------------------------------------------
// PUT /api/customers/:csAccountId   (mode 'M')
// :csAccountId is the CURRENT id (p_stroldcsaccountid).
// body.csAccountId is the (possibly changed) new id.
// ------------------------------------------------------------
export const updateCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID, userId } = getSession(req);
    const oldCsAccountId = String(req.params.csAccountId ?? "").trim();

    if (!CoID) {
      return res
        .status(401)
        .json({ success: false, message: "Company not found in session" });
    }
    if (!oldCsAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "csAccountId is required" });
    }

    const v = await validateCustomerUpdate(CoID, oldCsAccountId, req.body);
    if (!v.ok) {
      return res
        .status(v.status)
        .json({ success: false, message: v.message, code: v.code });
    }

    await callPageCustomer("M", CoID, userId, {
      ...req.body,
      oldCsAccountId,
      // if the id wasn't changed, the new id is the same as the old one
      csAccountId: req.body?.csAccountId ?? oldCsAccountId,
    });

    return res
      .status(200)
      .json({ success: true, message: "Customer updated successfully" });
  } catch (error: any) {
    console.error("updateCustomer error:", error);
    if (error?.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Customer account already exists" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to update customer" });
  }
};
// ------------------------------------------------------------
// DELETE /api/customers/:csAccountId   (mode 'D')
// ------------------------------------------------------------
export const deleteCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID, userId } = getSession(req);
    const csAccountId = String(req.params.csAccountId ?? "").trim();

    if (!CoID) {
      return res
        .status(401)
        .json({ success: false, message: "Company not found in session" });
    }
    if (!csAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "csAccountId is required" });
    }

    await callPageCustomer("D", CoID, userId, { csAccountId });

    return res
      .status(200)
      .json({ success: true, message: "Customer deleted successfully" });
  } catch (error: any) {
    console.error("deleteCustomer error:", error);
    // 23503 = foreign_key_violation (customer has transactions)
    if (error?.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "Customer is in use and cannot be deleted",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete customer" });
  }
};

// ============================================================
// GET /api/customers/countries
// dbo.getcustsupcountry(p_strcoid)
// ============================================================
export const getCustSupCountries = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID } = getSession(req);

    if (!CoID) {
      return res
        .status(401)
        .json({ success: false, message: "Company not found in session" });
    }

    const result = await pool.query("SELECT * FROM dbo.getcustsupcountry($1)", [
      CoID,
    ]);

    const data = result.rows
      .map((r) => ({
        countryId: r.fcountryid,
        countryName: r.fcountryname,
        countryNameA: r.fcountryname_a,
        positionNo: r.fpositionno,
      }))
      // the function has no ORDER BY, so order by fpositionno here
      .sort((a, b) => (a.positionNo ?? 0) - (b.positionNo ?? 0));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("getCustSupCountries error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch countries" });
  }
};

// ============================================================
// GET /api/customers/staffs
// dbo.getstaffs(p_strcoid)
// ============================================================
export const getStaffs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { CoID } = getSession(req);

    if (!CoID) {
      return res
        .status(401)
        .json({ success: false, message: "Company not found in session" });
    }

    const result = await pool.query("SELECT * FROM dbo.getstaffs($1)", [CoID]);

    const data = result.rows.map((r) => ({
      staffId: r.fstaffid,
      staffName: r.fstaffname,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("getStaffs error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch staffs" });
  }
};
