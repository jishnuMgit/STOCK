import { Request, Response } from "express";
import pool from "../../../../DB/db.js";
import { AuthenticatedRequest } from "../../../../middleware/authMiddleware.js";
import {
    validateSupplierCreate,
    validateSupplierUpdate,
} from "../../../../validators/SupplierValidation.js";

// GET /api/suppliers
// ASSUMED function name: dbo.getsupplierlist() — change if different
export const getSupplierList = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT * FROM dbo.getsupplierlist()");

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
        console.error("getSupplierList error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch supplier list" });
    }
};

// GET /api/suppliers/next-id?accountTypeId=60&accountLevel=3
export const getNextCSAccountId = async (
    req: AuthenticatedRequest,
    res: Response,
) => {
    try {
        const accountTypeId = String(req.query.accountTypeId ?? "").trim();
        const level = Number(req.query.accountLevel) + 1;
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

        if ((Number(maxId.substring(2, 5)) || 0) >= 999) {
            return res
                .status(409)
                .json({ success: false, message: "Unable to Generate New Account ID" });
        }

        let nextAccountId: string;

        if (maxId === "0") {
            nextAccountId = `${accountTypeId}001`;
        } else {
            if (!/^\d+$/.test(maxId)) {
                return res.status(500).json({
                    success: false,
                    message: `Existing account ID "${maxId}" is not numeric`,
                });
            }
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

// GET /api/suppliers/parent-accounts
// ASSUMED function name: dbo.fillParentAccountPayables() — change if different
export const getParentAccountPayables = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = await pool.query(
            "SELECT * FROM dbo.fillParentAccountPayables()",
        );

        const data = result.rows.map((r) => ({
            accountId: r.faccountid,
            accountName: r.faccountname,
        }));

        return res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error("getParentAccountPayables error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch parent accounts" });
    }
};

// ============================================================
// dbo.sp_pagesupplier  (modes: S = save, M = modify, D = delete)
// ============================================================

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
    staffId: "p_strstaffid",
    shortName: "p_strshortname",
    csAccountCategoryId: "p_strcsaccountcategoryid",
    status: "p_blnstatus",
    doNotRound: "p_blndonotround",
    menuName: "p_strmenuname",
};

const callPageSupplier = async (
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

    // the only difference from customer: account type is always 'S'
    const finalFields: Record<string, unknown> = { ...fields, csAccountType: "S" };

    for (const [key, param] of Object.entries(SP_PARAM_MAP)) {
        const value = finalFields[key];
        if (value !== undefined && value !== null) add(param, value);
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SET LOCAL search_path TO dbo, public");
        await client.query(`CALL dbo.sp_pagesupplier(${args.join(", ")})`, values);
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const getSession = (req: AuthenticatedRequest) => ({
    CoID: req.user?.CoID as string | undefined,
    userId: (req.user as any)?.userId as string | undefined,
});

// GET /api/suppliers/:csAccountId
export const getSupplier = async (req: AuthenticatedRequest, res: Response) => {
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
          AND fcsaccountid = $2
          AND fcs = 'S'`,
            [CoID, csAccountId],
        );

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Supplier not found" });
        }

        const r = result.rows[0];

        const data = {
            csAccountType: r.fcs,
            csAccountTypeDet: r.fcsdet,
            gAccountId: r.fgaccountid,
            csAccountId: r.fcsaccountid,

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
            staffId: r.fstaffid,
            creditLimit: r.fcreditlimit,
            creditDays: r.fcreditdays,
            ctaCardType: r.fctacardtype,
            ctaCardNo: r.fctacardno,
            ctaExpiry: r.fctaexpiry,
            exclFromAgeing: r.fexcludefromageing,

            buildingNo: r.fbuildingno,
            streetName: r.fstreetname,
            district: r.fdistrict,
            city: r.fcity,
            countryId: r.fcountryid,
            postalCode: r.fpostalcode,
            additionalNo: r.fadditionalno,
            crNo: r.fcrno,

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
        console.error("getSupplier error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch supplier" });
    }
};

// POST /api/suppliers   (mode 'S')
export const createSupplier = async (
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

        const v = await validateSupplierCreate(CoID, req.body);
        if (!v.ok) {
            return res
                .status(v.status)
                .json({ success: false, message: v.message, code: v.code });
        }

        await callPageSupplier("S", CoID, userId, req.body);

        return res
            .status(201)
            .json({ success: true, message: "Supplier saved successfully" });
    } catch (error: any) {
        console.error("createSupplier error:", error);
        if (error?.code === "23505") {
            return res
                .status(409)
                .json({ success: false, message: "Supplier account already exists" });
        }
        return res
            .status(500)
            .json({ success: false, message: "Failed to save supplier" });
    }
};

// PUT /api/suppliers/:csAccountId   (mode 'M')
export const updateSupplier = async (
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

        const v = await validateSupplierUpdate(CoID, oldCsAccountId, req.body);
        if (!v.ok) {
            return res
                .status(v.status)
                .json({ success: false, message: v.message, code: v.code });
        }

        await callPageSupplier("M", CoID, userId, {
            ...req.body,
            oldCsAccountId,
            csAccountId: req.body?.csAccountId ?? oldCsAccountId,
        });

        return res
            .status(200)
            .json({ success: true, message: "Supplier updated successfully" });
    } catch (error: any) {
        console.error("updateSupplier error:", error);
        if (error?.code === "23505") {
            return res
                .status(409)
                .json({ success: false, message: "Supplier account already exists" });
        }
        return res
            .status(500)
            .json({ success: false, message: "Failed to update supplier" });
    }
};

// DELETE /api/suppliers/:csAccountId   (mode 'D')
export const deleteSupplier = async (
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

        await callPageSupplier("D", CoID, userId, { csAccountId });

        return res
            .status(200)
            .json({ success: true, message: "Supplier deleted successfully" });
    } catch (error: any) {
        console.error("deleteSupplier error:", error);
        if (error?.code === "23503") {
            return res.status(409).json({
                success: false,
                message: "Supplier is in use and cannot be deleted",
            });
        }
        return res
            .status(500)
            .json({ success: false, message: "Failed to delete supplier" });
    }
};

// GET /api/suppliers/countries
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
            .sort((a, b) => (a.positionNo ?? 0) - (b.positionNo ?? 0));

        return res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error("getCustSupCountries error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch countries" });
    }
};

// GET /api/suppliers/staffs
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